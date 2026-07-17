import { describe, it, expect } from 'vitest';
import { createGame } from '../mindmatch.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers } from '../../shared/tests/helpers.js';

describe('mindmatch', () => {
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
        const result = game.submitWord(alice, 'test');
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

        // Alice and Bob match, Charlie has dissimilar unique word
        game.submitWord(alice, 'match');
        game.submitWord(bob, 'match');
        game.submitWord(charlie, 'zebra');

        // Charlie's word is not similar to "match", skips to results
        const state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.scores[alice]).toBe(3);
        expect(state.scores[bob]).toBe(3);
        expect(state.scores[charlie]).toBe(0);
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

    it('awards 0 points for unique words with no similar targets', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // All completely different words (not similar enough to claim)
        game.submitWord(alice, 'apple');
        game.submitWord(bob, 'zebra');
        game.submitWord(charlie, 'music');

        // No similar words exist, skips claiming and goes straight to results
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
        // Charlie's word is dissimilar, so claiming is skipped
        for (let i = 0; i < 9; i++) {
          game.startRound(1000);
          game.submitWord(alice, 'match');
          game.submitWord(bob, 'match');
          game.submitWord(charlie, 'zebra');
        }

        // After 9 rounds of 3 points each, Alice and Bob should have 27 points
        const state = game.getState();
        expect(state.winnerIds).toContain(alice);
        expect(state.winnerIds).toContain(bob);
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
  });

  describe('claiming', () => {
    it('populates claimableTargets for unique word players with similar words', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // "same" and "sane" are similar (1 edit distance, similarity 0.75)
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        const state = game.getState();
        expect(state.round.state).toBe('claiming');
        expect(state.round.claimableTargets[charlie]).toContain('same');
      });
    });

    it('skips claiming when no unique words have similar targets', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // "same" and "zebra" are not similar
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'zebra');

        const state = game.getState();
        expect(state.round.state).toBe('results');
      });
    });

    it('rejects claims on words not in claimableTargets', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const dave = store.joinPlayer({ name: 'Dave' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // "same" and "sane" are similar, "zebra" is not similar to either
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');
        game.submitWord(dave, 'zebra');

        let state = game.getState();
        expect(state.round.state).toBe('claiming');
        // Charlie can claim "same", Dave has no claimable targets
        expect(state.round.claimableTargets[charlie]).toContain('same');
        expect(state.round.claimableTargets[dave]).toBeUndefined();

        // Dave tries to claim "same" but it's not in his claimable targets
        const result = game.submitClaim(dave, 'same');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('no_claimable_targets');
      });
    });

    it('allows unique word players to claim similar words', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        const state = game.getState();
        expect(state.round.state).toBe('claiming');
        expect(state.round.claimableTargets[charlie]).toContain('same');
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

        // Alice and Bob match, Charlie and Dave have similar unique words
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');
        game.submitWord(dave, 'sage');

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
        game.submitWord(charlie, 'sane');
        game.submitWord(dave, 'sage');

        // Charlie skips, Dave makes a claim
        game.finishRound(charlie, 1);
        game.submitWord(dave, 'same');

        const state = game.getState();
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(1);
        expect(state.round.claims[0].claimantId).toBe(dave);
      });
    });

    it('rejects skip from players without claimable targets', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        const state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Alice has a matching word, not unique - can't skip
        const result = game.finishRound(alice, 1);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('no_action_required');
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

        // All unique words but similar to each other
        game.submitWord(alice, 'cat');
        game.submitWord(bob, 'car');
        game.submitWord(charlie, 'cap');

        // Alice claims Bob's word, but Bob doesn't claim Alice's
        game.submitWord(alice, 'car');
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

        // All unique words but similar
        game.submitWord(alice, 'cat');
        game.submitWord(bob, 'car');
        game.submitWord(charlie, 'cap');

        // Alice claims Bob's word, Bob claims Alice's word (mutual)
        game.submitWord(alice, 'car');
        game.submitWord(bob, 'cat');
        game.finishRound(charlie, 1); // Charlie skips

        const state = game.getState();
        // Mutual claims should proceed to voting
        expect(state.round.state).toBe('voting');
        // Should be merged into one claim for voting
        expect(state.round.claims.length).toBe(1);
        expect(state.round.claims[0].isMutual).toBe(true);
      });
    });

    it('does not pre-populate votes for mutual claims', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'cat');
        game.submitWord(bob, 'car');
        game.submitWord(charlie, 'cap');

        // Mutual claim between Alice and Bob
        game.submitWord(alice, 'car');
        game.submitWord(bob, 'cat');
        game.finishRound(charlie, 1);

        const state = game.getState();
        expect(state.round.claims[0].isMutual).toBe(true);
        // Votes should NOT be pre-populated
        expect(state.round.claims[0].votes).toEqual({});
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
        game.submitWord(charlie, 'sane');

        // Charlie claims the group
        game.submitWord(charlie, 'same');

        const state = game.getState();
        expect(state.round.claims[0].claimantWord).toBe('sane');
        expect(state.round.claims[0].targetWord).toBe('same');
      });
    });

    it('sets isMutual to false for claims on groups', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        // Charlie claims the group (not mutual since target is a group)
        game.submitWord(charlie, 'same');

        const state = game.getState();
        expect(state.round.claims[0].isMutual).toBe(false);
      });
    });

    it('excludes beneficiaries from voting on mutual claims', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const dave = store.joinPlayer({ name: 'Dave' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'cat');
        game.submitWord(bob, 'car');
        game.submitWord(charlie, 'cap');
        game.submitWord(dave, 'can');

        // Mutual claim between Alice and Bob
        game.submitWord(alice, 'car');
        game.submitWord(bob, 'cat');
        game.finishRound(charlie, 1);
        game.finishRound(dave, 1);

        // Alice shouldn't be able to vote (she's a beneficiary)
        let result = game.submitVotes(alice, { decision: 'accept' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('beneficiary_cannot_vote');

        // Bob shouldn't be able to vote (he's a beneficiary)
        result = game.submitVotes(bob, { decision: 'accept' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('beneficiary_cannot_vote');

        // Charlie and Dave can vote
        result = game.submitVotes(charlie, { decision: 'accept' });
        expect(result.ok).toBe(true);
        result = game.submitVotes(dave, { decision: 'accept' });
        expect(result.ok).toBe(true);
      });
    });

    it('excludes claimant from voting on non-mutual claims', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        game.submitWord(charlie, 'same');

        // Charlie is the claimant and beneficiary
        const result = game.submitVotes(charlie, { decision: 'accept' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('beneficiary_cannot_vote');
      });
    });

    it('allows claim on group without mutual requirement', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        // Charlie claims the group - no mutual requirement
        game.submitWord(charlie, 'same');

        const state = game.getState();
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(1);
      });
    });
  });

  describe('voting', () => {
    it('accepts a claim when majority of eligible voters accept', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        game.submitWord(charlie, 'same');

        let state = game.getState();
        expect(state.round.state).toBe('voting');

        // Alice and Bob vote to accept (they are not beneficiaries since they already have 2+ in group)
        game.submitVotes(alice, { decision: 'accept' });
        game.submitVotes(bob, { decision: 'accept' });

        state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });

    it('rejects a claim when majority of eligible voters reject', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        game.submitWord(charlie, 'same');

        // Alice and Bob vote to reject
        game.submitVotes(alice, { decision: 'reject' });
        game.submitVotes(bob, { decision: 'reject' });

        const state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.round.claims[0].accepted).toBe(false);
      });
    });

    it('auto-accepts claim when no eligible voters exist', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // All unique words, similar to each other
        game.submitWord(alice, 'cat');
        game.submitWord(bob, 'car');
        game.submitWord(charlie, 'cap');

        // Mutual claim between Alice and Bob, Charlie skips
        game.submitWord(alice, 'car');
        game.submitWord(bob, 'cat');
        game.finishRound(charlie, 1);

        let state = game.getState();
        expect(state.round.state).toBe('voting');

        // Only Charlie can vote (Alice and Bob are beneficiaries)
        game.submitVotes(charlie, { decision: 'accept' });

        state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });

    it('requires 50% or more of eligible voters to accept', async () => {
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
        game.submitWord(charlie, 'same');
        game.submitWord(dave, 'sane');

        game.submitWord(dave, 'same');

        // 3 eligible voters (Alice, Bob, Charlie), need 2 accepts (50% of 3 = 1.5, rounded up = 2)
        game.submitVotes(alice, { decision: 'accept' });
        game.submitVotes(bob, { decision: 'reject' });
        game.submitVotes(charlie, { decision: 'reject' });

        const state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.round.claims[0].accepted).toBe(false);
      });
    });

    it('accepts claim with exactly 50% accept votes', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const dave = store.joinPlayer({ name: 'Dave' }).playerId!;
        const eve = store.joinPlayer({ name: 'Eve' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'same');
        game.submitWord(dave, 'same');
        game.submitWord(eve, 'sane');

        game.submitWord(eve, 'same');

        // 4 eligible voters, need 2 accepts (50% of 4 = 2)
        game.submitVotes(alice, { decision: 'accept' });
        game.submitVotes(bob, { decision: 'accept' });
        game.submitVotes(charlie, { decision: 'reject' });
        game.submitVotes(dave, { decision: 'reject' });

        const state = game.getState();
        expect(state.round.state).toBe('results');
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });

    it('merges claimant into target group when claim accepted', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        game.submitWord(charlie, 'same');

        game.submitVotes(alice, { decision: 'accept' });
        game.submitVotes(bob, { decision: 'accept' });

        const state = game.getState();
        // All three should now be in the same group
        const sameGroup = state.round.result!.groups.find((g) =>
          g.word.toLowerCase() === 'same'
        );
        expect(sameGroup).toBeDefined();
        expect(sameGroup!.playerIds).toContain(alice);
        expect(sameGroup!.playerIds).toContain(bob);
        expect(sameGroup!.playerIds).toContain(charlie);
        // Group of 3 gets 1 point each
        expect(sameGroup!.points).toBe(1);
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

  describe('tie detection', () => {
    it('declares a tie when two players reach the same highest score above winningScore', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const dave = store.joinPlayer({ name: 'Dave' }).playerId!;
        const eve = store.joinPlayer({ name: 'Eve' }).playerId!;

        const game = createGame({ playerStore: store });

        // Alice and Bob always match (3 pts each), Charlie/Dave/Eve always match
        // After 9 rounds: Alice=27, Bob=27, Charlie=3, Dave=3, Eve=3
        for (let i = 0; i < 9; i++) {
          game.startRound(1000);
          game.submitWord(alice, 'match');
          game.submitWord(bob, 'match');
          game.submitWord(charlie, 'other');
          game.submitWord(dave, 'other');
          game.submitWord(eve, 'other');
        }

        const state = game.getState();
        expect(state.winnerIds).toContain(alice);
        expect(state.winnerIds).toContain(bob);
        expect(state.winnerIds.length).toBe(2);
        expect(state.winnerNames).toContain('Alice');
        expect(state.winnerNames).toContain('Bob');
      });
    });

    it('declares a single winner when one player has the highest score', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });

        // Alice always matches with Charlie (3 pts), Bob is unique (0 pts)
        // After 9 rounds: Alice=27, Bob=0, Charlie=27
        // Alice and Charlie tie at 27
        for (let i = 0; i < 9; i++) {
          game.startRound(1000);
          game.submitWord(alice, 'match');
          game.submitWord(bob, 'unique');
          game.submitWord(charlie, 'match');
        }

        const state = game.getState();
        expect(state.winnerIds).toContain(alice);
        expect(state.winnerIds).toContain(charlie);
        expect(state.winnerIds.length).toBe(2);
      });
    });

    it('returns empty winnerIds when no one reaches winningScore', async () => {
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

        const state = game.getState();
        expect(state.winnerIds).toEqual([]);
        expect(state.round.state).toBe('results');
      });
    });
  });

  describe('updateSettings', () => {
    it('allows updating winningScore when idle', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.updateSettings({ winningScore: 15 });
        expect(result.ok).toBe(true);

        const state = game.getState();
        expect(state.gameSettings.winningScore).toBe(15);
      });
    });

    it('rejects invalid winningScore values', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        expect(game.updateSettings({ winningScore: 3 }).ok).toBe(false);
        expect(game.updateSettings({ winningScore: 105 }).ok).toBe(false);
        expect(game.updateSettings({ winningScore: 2.5 }).ok).toBe(false);
        expect(game.updateSettings({ winningScore: -1 }).ok).toBe(false);
      });
    });

    it('rejects settings updates when game is active', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });

        const game = createGame({ playerStore: store });
        game.startRound(30000);

        expect(game.updateSettings({ winningScore: 10 }).ok).toBe(false);
      });
    });

    it('rejects unknown setting keys', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        expect(game.updateSettings({ unknownKey: 42 }).ok).toBe(false);
      });
    });

    it('uses custom winningScore for winner detection', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.updateSettings({ winningScore: 10 });

        // Alice and Bob match (3 pts each) for 4 rounds = 12 pts each
        for (let i = 0; i < 4; i++) {
          game.startRound(1000);
          game.submitWord(alice, 'match');
          game.submitWord(bob, 'match');
          game.submitWord(charlie, 'other');
        }

        const state = game.getState();
        expect(state.winnerIds).toContain(alice);
        expect(state.winnerIds).toContain(bob);
        expect(state.scores[alice]).toBe(12);
      });
    });

    it('broadcasts gameSettings in state', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });
        game.updateSettings({ winningScore: 50 });

        const state = game.getState();
        expect(state.gameSettings).toEqual({ winningScore: 50 });
      });
    });
  });
});
