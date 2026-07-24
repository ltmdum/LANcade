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
        game.submitClaim(charlie, 'same');
        state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Dave makes a claim - all unique players acted, awaiting reciprocal
        game.submitClaim(dave, 'same');
        state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Group members reciprocate different words for the claims to be accepted
        game.submitClaim(alice, 'sane');
        game.submitClaim(bob, 'sage');

        state = game.getState();
        // Two unique players claimed the same group word, goes to voting
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(2);

        // Claim 1: Charlie claims "same" matches "sane"
        //   Beneficiaries: {Charlie} → eligible voters: Bob, Dave (2)
	//   Alice has already effectively voted to accept by making the reciprocal claim
        //   Need ≥1 more accepts out of 2
        // Claim 2: Dave claims "same" matches "sage"
        //   Beneficiaries: {Dave} → eligible voters: Alice, Charlie (2)
	//   Bob has already effectively voted to accept by making the reciprocal claim
        //   Need ≥1 more accepts out of 2

        // Bob rejects claim 1; Dave accepts; Alice and Charlie ineligible to vote (confirm this somehow)
        game.submitVotes(bob, { decision: 'reject' });
        game.submitVotes(dave, { decision: 'accept' });
        // Claim 1: 1 accept / 2 eligible → accepted (need ≥1)

        // Alice rejects claim 2; Charlie accepts; Bob and Dave ineligible to vote (confirm this somehow)
        game.submitVotes(alice, { decision: 'reject' });
        game.submitVotes(charlie, { decision: 'accept' });
        // Claim 2: 1 accept / 2 eligible → accepted (need ≥1)

        state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims[0].accepted).toBe(true);
        expect(state.round.claims[1].accepted).toBe(true);
      });
    });

    it('group claim target not aligned in claim acceptance', async () => {
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
        game.submitClaim(charlie, 'same');
        state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Dave makes a claim - all unique players acted, awaiting reciprocal
        game.submitClaim(dave, 'same');
        state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Alice reciprocates for the sane claim to be accepted
        game.submitClaim(alice, 'sane');
        // Bob doesn't reciprocate, effectively rejecting both claims (he should not vote on either)
        game.finishRound(bob, 1);

        state = game.getState();
        // Two unique players claimed the same group word, goes to voting
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(2);

        // Claim 1: Charlie claims "same" matches "sane"
        //   Beneficiaries: {Charlie} → eligible voters: Dave (1)
	//   Alice has already effectively voted to accept by making the reciprocal claim
	//   Bob has already effectively voted to reject by not making either reciprocal claim
        //   Need Dave to accept for acceptance
        // Claim 2: Dave claims "same" matches "sage"
        //   Beneficiaries: {Dave} → eligible voters: Alice, Charlie (2)
	//   Bob has already effectively voted to reject by not making either reciprocal claim
        //   Need Alice and Charlie to accept for acceptance

        // Dave rejects; Alice, Bob, and Charlie ineligible to vote (confirm this somehow)
        game.submitVotes(dave, { decision: 'reject' });
        // Claim 1: 0 accept / 1 eligible → rejected (need ≥1, because bob said no but alice said yes)

        // Alice rejects claim 2; Charlie accepts; Bob and Dave ineligible to vote (confirm this somehow)
        game.submitVotes(alice, { decision: 'reject' });
        game.submitVotes(charlie, { decision: 'accept' });
        // Claim 2: 1 accept / 2 eligible → rejected (need ≥2, because bob already said no)

        state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims[0].accepted).toBe(false);
        expect(state.round.claims[1].accepted).toBe(false);
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
        game.submitClaim(dave, 'same');

        // Alice reciprocates for Dave, Bob skips
        game.submitClaim(alice, 'sage');
        game.finishRound(bob, 1);

        let state = game.getState();
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(1);

        // Charlie must vote (not a claimant or in the target group)
        game.submitVotes(charlie, { decision: 'accept' });

        state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims[0].resolved).toBe(true);
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });

    it('rejects skip from players without claimable targets', async () => {
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
        game.submitWord(dave, 'zebra');

        const state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Dave has 'zebra' which is not similar to 'same' or 'sane', so no claimable targets
        const result = game.finishRound(dave, 1);
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
        game.submitClaim(alice, 'car');
        game.finishRound(bob, 1); // Bob skips
        game.finishRound(charlie, 1); // Charlie skips

        let state = game.getState();
        expect(state.round.state).toBe('voting');

        // Alice's one-sided claim goes to voting; Bob already voted reject via skip
        game.submitVotes(charlie, { decision: 'reject' });

        state = game.getState();
        expect(state.round.state).toBe('voting_results');
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
        game.submitClaim(alice, 'car');
        game.submitClaim(bob, 'cat');
        game.finishRound(charlie, 1); // Charlie skips

        const state = game.getState();
        // Mutual claims merge into one claim for voting
        expect(state.round.state).toBe('voting');
        expect(state.round.claims.length).toBe(1);
        // Alice and Bob both have accept votes from their claims
        expect(state.round.claims[0].votes[alice]).toBe('accept');
        expect(state.round.claims[0].votes[bob]).toBe('accept');
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
        game.submitClaim(alice, 'car');
        game.submitClaim(bob, 'cat');
        game.finishRound(charlie, 1);

        const state = game.getState();
        // Claim = vote, so both Alice and Bob have accept votes
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
        game.submitWord(charlie, 'sane');

        // Charlie claims the group
        game.submitClaim(charlie, 'same');

        // Alice reciprocates, Bob skips
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

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
        game.submitClaim(charlie, 'same');

        // Alice reciprocates, Bob skips
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

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
        game.submitClaim(alice, 'car');
        game.submitClaim(bob, 'cat');
        game.finishRound(charlie, 1);
        game.finishRound(dave, 1);

        // Alice already voted via her claim → can't vote again
        let result = game.submitVotes(alice, { decision: 'accept' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('already_voted');

        // Bob already voted via his claim → can't vote again
        result = game.submitVotes(bob, { decision: 'accept' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('already_voted');

        // Charlie and Dave vote
        result = game.submitVotes(charlie, { decision: 'accept' });
        expect(result.ok).toBe(true);
        result = game.submitVotes(dave, { decision: 'accept' });
        expect(result.ok).toBe(true);
      });
    });

    it('auto-accepts group claim without voting', async () => {
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

        // Claim against group of 2 needs reciprocal claim to be accepted
        game.submitClaim(charlie, 'same');

        // Alice reciprocates, Bob skips
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

        const state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims[0].resolved).toBe(true);
        expect(state.round.claims[0].accepted).toBe(true);
        expect(state.round.claims[0].isMutual).toBe(false);
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

        // Charlie claims the group - needs reciprocal claim to be accepted
        game.submitClaim(charlie, 'same');

        // Alice reciprocates, Bob skips
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

        const state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims.length).toBe(1);
        expect(state.round.claims[0].resolved).toBe(true);
        expect(state.round.claims[0].accepted).toBe(true);
        expect(state.round.claims[0].isMutual).toBe(false);
      });
    });
  });

  describe('voting', () => {
    it('auto-accepts claim against group of 2+', async () => {
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

        // Claim against group of 2 needs reciprocal claim to be accepted
        game.submitClaim(charlie, 'same');

        // Alice reciprocates, Bob skips
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

        const state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims[0].resolved).toBe(true);
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });

    it('auto-accepts group claim and merges claimant into group', async () => {
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

        game.submitClaim(charlie, 'same');

        // Alice reciprocates, Bob skips
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

        const state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims[0].resolved).toBe(true);
        expect(state.round.claims[0].accepted).toBe(true);
        // Claimant should be merged into the target group for scoring
        const sameGroup = state.round.result!.groups.find((g) =>
          g.word.toLowerCase() === 'same'
        );
        expect(sameGroup).toBeDefined();
        expect(sameGroup!.playerIds).toContain(charlie);
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
        game.submitClaim(alice, 'car');
        game.submitClaim(bob, 'cat');
        game.finishRound(charlie, 1);

        let state = game.getState();
        expect(state.round.state).toBe('voting');

        // Only Charlie can vote (Alice and Bob are beneficiaries)
        game.submitVotes(charlie, { decision: 'accept' });

        state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });

    it('auto-accepts claim against group of any size', async () => {
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

        // Claim against group of 3 needs reciprocal claim to be accepted
        game.submitClaim(dave, 'same');

        // Alice reciprocates, Bob and Charlie skip
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);
        game.finishRound(charlie, 1);

        const state = game.getState();
        // 2 accept (Dave, Alice) vs 2 reject (Bob, Charlie) → no majority
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims[0].resolved).toBe(true);
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

        // All unique words, similar to each other
        game.submitWord(alice, 'cat');
        game.submitWord(bob, 'car');
        game.submitWord(charlie, 'cap');
        game.submitWord(dave, 'can');
        game.submitWord(eve, 'cog');

        // Mutual claim between Alice and Bob
        game.submitClaim(alice, 'car');
        game.submitClaim(bob, 'cat');
        game.finishRound(charlie, 1);
        game.finishRound(dave, 1);
        game.finishRound(eve, 1);

        // 3 eligible voters, need 2 accepts (50% of 3 = 1.5 → need 2)
        game.submitVotes(charlie, { decision: 'accept' });
        game.submitVotes(dave, { decision: 'accept' });
        game.submitVotes(eve, { decision: 'reject' });

        const state = game.getState();
        expect(state.round.state).toBe('voting_results');
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

        game.submitClaim(charlie, 'same');

        // Alice reciprocates, Bob skips → claim auto-accepted, claimant merged
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

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

  describe('simultaneous claiming', () => {
    it('populates claimableTargets for group members alongside unique players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // Alice and Bob are a group ("same"), Charlie is unique ("sane")
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        const state = game.getState();
        expect(state.round.state).toBe('claiming');

        // Charlie (unique) can claim the group's word
        expect(state.round.claimableTargets[charlie]).toContain('same');
        // Alice (group member) can claim Charlie's unique word
        expect(state.round.claimableTargets[alice]).toContain('sane');
        // Bob (group member) can claim Charlie's unique word
        expect(state.round.claimableTargets[bob]).toContain('sane');
      });
    });

    it('group member can submit claim against unique player directly', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // Alice and Bob in a group, Charlie unique
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');

        // Charlie claims 'same', Alice reciprocates by claiming 'sane', Bob skips
        game.submitClaim(charlie, 'same');
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

        const state = game.getState();
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims.length).toBe(1);
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });

    it('multiple unique players can claim the same group', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const dave = store.joinPlayer({ name: 'Dave' }).playerId!;
        const sam = store.joinPlayer({ name: 'Sam' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(1000);

        // Alice and Bob are a group ("same"), Charlie unique ("sane"), Dave unique ("sage")
        game.submitWord(alice, 'same');
        game.submitWord(bob, 'same');
        game.submitWord(charlie, 'sane');
        game.submitWord(dave, 'sage');
        game.submitWord(sam, 'level');

        let state = game.getState();
        // Charlie (unique) can claim the group's word
        expect(state.round.claimableTargets[charlie]).toContain('same');
        // Dave (unique) can claim the group's word
        expect(state.round.claimableTargets[dave]).toContain('same');
        // Alice (group member) can claim Charlie or Dave's unique word
        expect(state.round.claimableTargets[alice]).toContain('sane');
        expect(state.round.claimableTargets[alice]).toContain('sage');
        // Bob (group member) can claim Charlie or Dave's unique word
        expect(state.round.claimableTargets[bob]).toContain('sane');
        expect(state.round.claimableTargets[bob]).toContain('sage');
	// Sam not offered claims
        expect(state.round.claimableTargets[sam]).toBeUndefined();

        // Charlie claims 'same', Dave claims 'same'
        game.submitClaim(charlie, 'same');
        game.submitClaim(dave, 'same');
	// Alice reciprocates 'sane', Bob reciprocates 'sage'
        game.submitClaim(alice, 'sane');
        game.submitClaim(bob, 'sage');
        game.finishRound(sam, 1);

        state = game.getState();
        expect(state.round.claims.length).toBe(2);
        expect(state.round.state).toBe('voting');

        // Claim 1: Charlie claims "same" matches "sane" — all eligible vote
        game.submitVotes(alice, { decision: 'accept' });
        game.submitVotes(bob, { decision: 'accept' });
        game.submitVotes(dave, { decision: 'accept' });
        game.submitVotes(sam, { decision: 'reject' });

        // Claim 2: Dave claims "same" matches "sage" — all eligible vote
        game.submitVotes(alice, { decision: 'accept' });
        game.submitVotes(bob, { decision: 'accept' });
        game.submitVotes(charlie, { decision: 'accept' });
        game.submitVotes(sam, { decision: 'reject' });

        state = game.getState();
        expect(state.round.state).toBe('voting_results');
        // Both claims accepted via voting
        expect(state.round.claims[0].accepted).toBe(true);
        expect(state.round.claims[1].accepted).toBe(true);
      });
    });

    it('unique player can skip even when they have claimable targets', async () => {
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

        // Charlie skips — all unique players and group members must act
        game.finishRound(charlie, 1);
        game.finishRound(alice, 1);
        game.finishRound(bob, 1);

        const state = game.getState();
        // No claims were made, should skip to results
        expect(state.round.state).toBe('results');
        expect(state.round.claims.length).toBe(0);
      });
    });

    it('unique player skip but group makes claim', async () => {
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

        // Charlie skips — group members claim equivalence
        game.submitClaim(alice, 'sane');
        game.submitClaim(bob, 'sane');
        game.finishRound(charlie, 1);

        const state = game.getState();
        // Group members' claims are valid; Charlie's skip counts as reject
        // 2 accept (Alice, Bob) vs 1 reject (Charlie) → majority accept
        expect(state.round.state).toBe('voting_results');
        expect(state.round.claims.length).toBe(1);
        expect(state.round.claims[0].accepted).toBe(true);
      });
    });
  });

  describe('score timing', () => {
    it('applies score changes when advancing to results phase', async () => {
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

        game.submitClaim(charlie, 'same');
        game.submitClaim(alice, 'sane');
        game.finishRound(bob, 1);

        let state = game.getState();
        expect(state.round.state).toBe('voting_results');

        // Scores should not be applied yet
        expect(state.scores[alice]).toBe(0);
        expect(state.scores[bob]).toBe(0);
        expect(state.scores[charlie]).toBe(0);

        // Admin advances to results
        game.finishRound(charlie, state.round.id);

        state = game.getState();
        expect(state.round.state).toBe('results');

        // Scores should now be applied
        expect(state.scores[alice]).toBe(1);
        expect(state.scores[bob]).toBe(1);
        expect(state.scores[charlie]).toBe(1);
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
