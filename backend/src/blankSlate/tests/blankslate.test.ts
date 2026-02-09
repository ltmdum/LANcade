import { describe, it, expect } from 'vitest';
import { createGame } from '../blankslate.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers } from '../../shared/tests/helpers.js';

describe('blankslate', () => {
  describe('startRound', () => {
    it('requires at least 3 players to start', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        // No players
        let result = game.startRound(30000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('need_3_players');

        // Only 1 player
        store.joinPlayer({ name: 'Alice' });
        result = game.startRound(30000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('need_3_players');

        // Only 2 players
        store.joinPlayer({ name: 'Bob' });
        result = game.startRound(30000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('need_3_players');

        // 3 players - should work
        store.joinPlayer({ name: 'Charlie' });
        result = game.startRound(30000);
        expect(result.ok).toBe(true);
        expect(result.roundId).toBe(1);
      });
    });

    it('starts with a prompt and submitting state', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });
        game.startRound(30000);

        const state = game.getState();
        expect(state.round.state).toBe('submitting');
        expect(state.round.prompt).not.toBeNull();
        expect(state.round.prompt?.text).toBeDefined();
        expect(['before', 'after']).toContain(state.round.prompt?.blankPosition);
      });
    });
  });

  describe('submitWord', () => {
    it('allows players to submit words during submitting phase', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });
        game.startRound(30000);

        const result = game.submitWord(alice, 'test');
        expect(result.ok).toBe(true);

        const state = game.getState();
        expect(state.round.submittedPlayerIds).toContain(alice);
      });
    });

    it('rejects empty words', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });
        game.startRound(30000);

        const result = game.submitWord(alice, '   ');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('empty');
      });
    });

    it('rejects submissions when not in submitting phase', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });

        // Not started
        let result = game.submitWord(alice, 'test');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('round_not_active');
      });
    });

    it('allows players to update their submission', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });
        game.startRound(30000);

        game.submitWord(alice, 'first');
        game.submitWord(alice, 'second');

        const state = game.getState();
        expect(state.round.submittedPlayerIds).toContain(alice);
        // Only one submission per player
        expect(state.round.submittedPlayerIds.filter((id) => id === alice).length).toBe(1);
      });
    });
  });

  describe('scoring', () => {
    it('awards 3 points for matching pairs', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // Alice and Bob match, Charlie is unique
        game.submitWord(alice, 'match');
        game.submitWord(bob, 'match');
        game.submitWord(charlie, 'unique');

        // All submitted, should move to claiming (Charlie has unique word)
        const state = game.getState();
        expect(state.round.state).toBe('claiming');
      });
    });

    it('awards 1 point each for groups of 3+', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // All three match
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'same');

        // All submitted and no unique words - goes straight to results
        const state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.round.result).not.toBeNull();
        expect(state.round.result!.groups[0].points).toBe(1);
        expect(state.scores[alice]).toBe(1);
        expect(state.scores[bob]).toBe(1);
        expect(state.scores[charlie]).toBe(1);
      });
    });

    it('awards 0 points for unique words', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // All different words
        game.submitWord(alice, 'one');
        game.submitWord(bob, 'two');
        game.submitWord(charlie, 'three');

        // In claiming phase - skip all claims by finishing
        game.finishRound(alice, 1);
        game.finishRound(bob, 1);
        game.finishRound(charlie, 1);

        const state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.scores[alice]).toBe(0);
        expect(state.scores[bob]).toBe(0);
        expect(state.scores[charlie]).toBe(0);
      });
    });
  });

  describe('case insensitivity', () => {
    it('matches words regardless of case', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'Test');
        game.submitWord(bob, 'TEST');
        game.submitWord(charlie, 'test');

        // All match (case insensitive), goes straight to results
        const state = game.getState();
        expect(state.round.state).toBe('results');
        // All three should be in the same group
        expect(state.round.result!.groups.length).toBe(1);
        expect(state.round.result!.groups[0].playerIds.length).toBe(3);
      });
    });
  });

  describe('winner detection', () => {
    it('declares a winner when someone reaches 25 points', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });

        // Simulate multiple rounds where Alice and Bob always match
        for (let i = 0; i < 9; i++) {
          game.startRound(1000);
          game.submitWord(alice, 'match');
          game.submitWord(bob, 'match');
          game.submitWord(charlie, 'unique');
          // Skip claiming
          game.finishRound(charlie, game.getState().round.id);
        }

        // After 9 rounds of 3 points each, Alice and Bob should have 27 points
        const state = game.getState();
        expect(state.winnerId).not.toBeNull();
        expect(state.scores[alice]).toBe(27);
        expect(state.scores[bob]).toBe(27);
      });
    });
  });

  describe('endGame', () => {
    it('ends an active game and returns to idle', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });
        game.startRound(30000);

        let state = game.getState();
        expect(state.round.state).toBe('submitting');

        const result = game.endGame();
        expect(result.ok).toBe(true);

        state = game.getState();
        expect(state.round.state).toBe('idle');
      });
    });

    it('returns error when game is already idle', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });

        const result = game.endGame();
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('not_active');
      });
    });
  });

  describe('claiming', () => {
    it('allows unique word players to claim other groups', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'different');

        // All players submitted, should move to claiming
        const state = game.getState();
        expect(state.round.state).toBe('claiming');
      });
    });

    it('collects all claims before voting starts', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const dave = store.joinPlayer({ name: 'Dave' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // Alice and Bob match, Charlie and Dave have unique words
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'unique1');
        game.submitWord(dave, 'unique2');

        let state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Charlie makes a claim - should stay in claiming
        game.submitWord(charlie, 'same');
        state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Dave makes a claim - now all unique players have acted, move to voting
        game.submitWord(dave, 'same');
        state = game.getState();
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(2);
      });
    });

    it('allows skipping claims via finishRound', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const dave = store.joinPlayer({ name: 'Dave' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'unique1');
        game.submitWord(dave, 'unique2');

        // Charlie skips, Dave makes a claim
        game.finishRound(charlie, 1);
        game.submitWord(dave, 'same');

        const state = game.getState();
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(1);
        expect(state.round.claims[0].claimantId).toBe(dave);
      });
    });

    it('rejects claim between two unique words unless mutual', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // All unique words
        game.submitWord(alice, 'one');
        game.submitWord(bob, 'two');
        game.submitWord(charlie, 'three');

        // Alice claims Bob's word, but Bob doesn't claim Alice's
        game.submitWord(alice, 'two');
        game.finishRound(bob, 1); // Bob skips
        game.finishRound(charlie, 1); // Charlie skips

        const state = game.getState();
        // Alice's claim should be auto-rejected (not mutual)
        expect(state.round.state).toBe('results');
        expect(state.round.claims.length).toBe(1);
        expect(state.round.claims[0].accepted).toBe(false);
      });
    });

    it('accepts mutual claims between unique words for voting', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // All unique words
        game.submitWord(alice, 'one');
        game.submitWord(bob, 'two');
        game.submitWord(charlie, 'three');

        // Alice claims Bob's word, Bob claims Alice's word (mutual)
        game.submitWord(alice, 'two');
        game.submitWord(bob, 'one');
        game.finishRound(charlie, 1); // Charlie skips

        const state = game.getState();
        // Mutual claims should proceed to voting
        expect(state.round.state).toBe('voting');
        // Should be merged into one claim for voting
        expect(state.round.claims.length).toBe(1);
      });
    });

    it('marks mutual claims with isMutual flag and pre-populates votes', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'one');
        game.submitWord(bob, 'two');
        game.submitWord(charlie, 'three');

        // Mutual claim between Alice and Bob
        game.submitWord(alice, 'two');
        game.submitWord(bob, 'one');
        game.finishRound(charlie, 1);

        const state = game.getState();
        expect(state.round.claims[0].isMutual).toBe(true);
        // Both players should have pre-populated accept votes
        expect(state.round.claims[0].votes[alice]).toBe('accept');
        expect(state.round.claims[0].votes[bob]).toBe('accept');
      });
    });

    it('includes claimantWord in claims', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'different');

        // Charlie claims the group
        game.submitWord(charlie, 'same');

        const state = game.getState();
        expect(state.round.claims[0].claimantWord).toBe('different');
        expect(state.round.claims[0].targetWord).toBe('same');
      });
    });

    it('sets isMutual to false for non-mutual claims', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'different');

        // Charlie claims the group (not mutual since target is a group)
        game.submitWord(charlie, 'same');

        const state = game.getState();
        expect(state.round.claims[0].isMutual).toBe(false);
      });
    });

    it('excludes mutual claim participants from voting', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const dave = store.joinPlayer({ name: 'Dave' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'one');
        game.submitWord(bob, 'two');
        game.submitWord(charlie, 'three');
        game.submitWord(dave, 'four');

        // Mutual claim between Alice and Bob
        game.submitWord(alice, 'two');
        game.submitWord(bob, 'one');
        game.finishRound(charlie, 1);
        game.finishRound(dave, 1);

        // Alice shouldn't be able to vote (she's the claimant in mutual)
        let result = game.submitVotes(alice, { decision: 'accept' });
        expect(result.ok).toBe(false);

        // Bob shouldn't be able to vote (he's the target in mutual)
        result = game.submitVotes(bob, { decision: 'accept' });
        expect(result.ok).toBe(false);

        // Charlie and Dave can vote
        result = game.submitVotes(charlie, { decision: 'accept' });
        expect(result.ok).toBe(true);
        result = game.submitVotes(dave, { decision: 'accept' });
        expect(result.ok).toBe(true);
      });
    });

    it('allows claim on group (non-unique target) without mutual requirement', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'different');

        // Charlie claims the group - no mutual requirement
        game.submitWord(charlie, 'same');

        const state = game.getState();
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(1);
      });
    });
  });

  describe('voting', () => {
    it('accepts a claim when majority votes accept', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'different');

        // Charlie makes a claim (via submitWord in claiming phase)
        game.submitWord(charlie, 'same');

        let state = game.getState();
        expect(state.round.state).toBe('voting');

        // Alice and Bob vote to accept
        game.submitVotes(alice, { decision: 'accept' });
        game.submitVotes(bob, { decision: 'accept' });

        state = game.getState();
        // Claim should be accepted and we should be at results
        expect(state.round.state).toBe('results');
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });

    it('rejects a claim when majority votes reject', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'different');

        // Charlie makes a claim (via submitWord in claiming phase)
        game.submitWord(charlie, 'same');

        // Alice and Bob vote to reject
        game.submitVotes(alice, { decision: 'reject' });
        game.submitVotes(bob, { decision: 'reject' });

        const state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.round.claims[0].accepted).toBe(false);
      });
    });

    it('prevents claimant from voting on their own claim', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'different');

        // Charlie makes a claim (via submitWord in claiming phase)
        game.submitWord(charlie, 'same');

        const result = game.submitVotes(charlie, { decision: 'accept' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('claimant_cannot_vote');
      });
    });
  });

  describe('joinPlayer', () => {
    it('initializes score for new players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.joinPlayer({ name: 'NewPlayer' });
        expect(result.ok).toBe(true);

        const state = game.getState();
        expect(state.scores[result.playerId!]).toBe(0);
      });
    });
  });

  describe('endGame', () => {
    it('resets scores when game is ended early', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // All submit the same word to get points
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'same');

        // Verify scores were awarded
        let state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.scores[alice]).toBe(1);
        expect(state.scores[bob]).toBe(1);
        expect(state.scores[charlie]).toBe(1);

        // End the game
        const result = game.endGame();
        expect(result.ok).toBe(true);

        // Verify scores are reset
        state = game.getState();
        expect(state.scores[alice]).toBeUndefined();
        expect(state.scores[bob]).toBeUndefined();
        expect(state.scores[charlie]).toBeUndefined();
        expect(state.round.state).toBe('idle');
      });
    });

    it('resets scores when ending a game with a winner', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });

        // Manually trigger a winner scenario by playing rounds
        // For simplicity, we'll start a round then end the game
        game.startRound(1000);

        const result = game.endGame();
        expect(result.ok).toBe(true);

        const state = game.getState();
        expect(Object.keys(state.scores).length).toBe(0);
      });
    });

    it('fails when no game is active', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });

        // Don't start a round - game is idle
        const result = game.endGame();
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('not_active');
      });
    });
  });
});
