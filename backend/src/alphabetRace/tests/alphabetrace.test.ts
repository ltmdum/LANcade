import { describe, it, expect } from 'vitest';
import { createGame } from '../alphabetrace.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers, withStubbedRandom } from '../../shared/tests/helpers.js';

describe('alphabetrace', () => {
  describe('round start validation', () => {
    it('rejects start with no players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.startRound(10000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('no_players');
      });
    });

    it('rejects invalid duration', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store });

        expect(game.startRound(-1).ok).toBe(false);
        expect(game.startRound(-1).reason).toBe('invalid_duration');

        expect(game.startRound(0).ok).toBe(false);
        expect(game.startRound(0).reason).toBe('invalid_duration');

        expect(game.startRound(NaN).ok).toBe(false);
        expect(game.startRound(NaN).reason).toBe('invalid_duration');

        expect(game.startRound(Infinity).ok).toBe(false);
        expect(game.startRound(Infinity).reason).toBe('invalid_duration');
      });
    });

    it('rejects start when already active (racing)', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const state = game.getState();
          expect(state.match.state).toBe('racing');

          const second = game.startRound(10000);
          expect(second.ok).toBe(false);
          expect(second.reason).toBe('round_active');
        })
      );
    });

    it('rejects start when already active (voting)', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const state = game.getState();
          const letter = state.match.currentLetter!;
          game.submitWord(alice, `${letter}pple`);

          expect(game.getState().match.state).toBe('voting');

          const second = game.startRound(10000);
          expect(second.ok).toBe(false);
          expect(second.reason).toBe('round_active');
        })
      );
    });

    it('successfully starts with players', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          const result = game.startRound(10000);

          expect(result.ok).toBe(true);
          expect(result.matchId).toBe(1);
        })
      );
    });

    it('creates a 26-letter sequence', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const state = game.getState();
          expect(state.match.letterSequence).toHaveLength(26);

          const unique = new Set(state.match.letterSequence);
          expect(unique.size).toBe(26);
        })
      );
    });

    it('sets state to racing', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          expect(game.getPhase()).toBe('racing');
          expect(game.getState().match.state).toBe('racing');
        })
      );
    });

    it('records participants', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const state = game.getState();
          expect(state.match.participants).toContain(alice);
          expect(state.match.participants).toContain(bob);
          expect(state.match.participants).toHaveLength(2);
        })
      );
    });
  });

  describe('racing phase', () => {
    it('allows eligible player to submit word starting with current letter', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          const result = game.submitWord(alice, `${letter}pple`);
          expect(result.ok).toBe(true);
        })
      );
    });

    it('rejects word not starting with current letter', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          const wrongLetter = letter === 'A' ? 'B' : 'A';
          const result = game.submitWord(alice, `${wrongLetter}oop`);
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('invalid_letter');
        })
      );
    });

    it('rejects submission from ineligible (penalized) player', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;

          // Alice submits a word
          game.submitWord(alice, `${letter}pple`);

          // Bob and Charlie reject it
          game.submitVotes(bob, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          // Alice should now be penalized and ineligible
          const state = game.getState();
          expect(state.match.state).toBe('racing');
          expect(state.match.ineligiblePlayerIds).toContain(alice);

          // Alice tries to submit again
          const newLetter = state.match.currentLetter!;
          const result = game.submitWord(alice, `${newLetter}oo`);
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('ineligible');
        })
      );
    });

    it('rejects empty word', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          expect(game.submitWord(alice, '').ok).toBe(false);
          expect(game.submitWord(alice, '').reason).toBe('empty');

          expect(game.submitWord(alice, '   ').ok).toBe(false);
          expect(game.submitWord(alice, '   ').reason).toBe('empty');
        })
      );
    });

    it('moves to voting state after valid submission', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          const state = game.getState();
          expect(state.match.state).toBe('voting');
          expect(state.match.submittedWord).toBe(`${letter}word`);
          expect(state.match.submittedBy).toBe(alice);
        })
      );
    });

    it('only participants can submit (not late joiners)', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          // Late joiner
          const late = store.joinPlayer({ name: 'Late' }).playerId!;

          const letter = game.getState().match.currentLetter!;
          const result = game.submitWord(late, `${letter}test`);
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('not_participant');
        })
      );
    });

    it('rejects submission when not in racing phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

          const game = createGame({ playerStore: store });

          const result = game.submitWord(alice, 'Apple');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('not_racing');
        })
      );
    });
  });

  describe('voting phase', () => {
    it('eligible voters can accept', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          const result = game.submitVotes(bob, { decision: 'accept' });
          expect(result.ok).toBe(true);
        })
      );
    });

    it('eligible voters can reject', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          store.joinPlayer({ name: 'Charlie' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          const result = game.submitVotes(bob, { decision: 'reject' });
          expect(result.ok).toBe(true);
        })
      );
    });

    it('submitter cannot vote on own word', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          const result = game.submitVotes(alice, { decision: 'accept' });
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('not_eligible');
        })
      );
    });

    it('rejects invalid vote values', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          const result = game.submitVotes(bob, { decision: 'maybe' });
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('invalid_vote');
        })
      );
    });

    it('rejects duplicate votes', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          store.joinPlayer({ name: 'Charlie' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          game.submitVotes(bob, { decision: 'accept' });
          const duplicate = game.submitVotes(bob, { decision: 'accept' });
          expect(duplicate.ok).toBe(false);
          expect(duplicate.reason).toBe('already_voted');
        })
      );
    });

    it('auto-accepts when vote timeout expires with no votes', async () => {
      await withFakeTimers((timers) =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(5000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          expect(game.getState().match.state).toBe('voting');

          timers.advance(6000);

          const state = game.getState();
          // Word auto-accepted: scores a point, advances letter
          expect(state.match.state).toBe('racing');
          expect(state.match.scores[alice]).toBe(1);
          expect(state.match.completedCount).toBe(1);
        })
      );
    });

    it('auto-resolves when vote timeout expires with partial votes', async () => {
      await withFakeTimers((timers) =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          store.joinPlayer({ name: 'Charlie' });

          const game = createGame({ playerStore: store });
          game.startRound(5000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          // Only Bob votes to reject (1 of 2 voters)
          game.submitVotes(bob, { decision: 'reject' });

          timers.advance(6000);

          const state = game.getState();
          // 1 reject out of 2 eligible = 50%, word gets rejected
          expect(state.match.state).toBe('racing');
          expect(state.match.ineligiblePlayerIds).toContain(alice);
        })
      );
    });

    it('accepts word when majority accepts: scores point and advances', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const state = game.getState();
          const letter = state.match.currentLetter!;
          const firstIndex = state.match.currentLetterIndex;

          game.submitWord(alice, `${letter}word`);
          game.submitVotes(bob, { decision: 'accept' });
          game.submitVotes(charlie, { decision: 'accept' });

          const afterAccept = game.getState();
          expect(afterAccept.match.state).toBe('racing');
          expect(afterAccept.match.scores[alice]).toBe(1);
          expect(afterAccept.match.completedCount).toBe(1);
          expect(afterAccept.match.currentLetterIndex).toBe(firstIndex + 1);
        })
      );
    });

    it('rejects word when >=50% reject: submitter becomes ineligible', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          game.submitVotes(bob, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          const state = game.getState();
          expect(state.match.state).toBe('racing');
          expect(state.match.scores[alice]).toBe(0);
          expect(state.match.ineligiblePlayerIds).toContain(alice);
          // Same letter index (did not advance)
          expect(state.match.completedCount).toBe(0);
        })
      );
    });

    it('other players can race again after rejection', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;

          // Alice submits, gets rejected
          game.submitWord(alice, `${letter}word`);
          game.submitVotes(bob, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          const stateAfterReject = game.getState();
          expect(stateAfterReject.match.state).toBe('racing');

          // Bob can now submit for the same letter
          const sameLetter = stateAfterReject.match.currentLetter!;
          const result = game.submitWord(bob, `${sameLetter}ob`);
          expect(result.ok).toBe(true);
        })
      );
    });

    it('rejects vote from late-joining non-participant', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const late = store.joinPlayer({ name: 'Late' }).playerId!;

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          const result = game.submitVotes(late, { decision: 'accept' });
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('not_eligible');
        })
      );
    });

    it('auto-accepts word with single player when no voters exist', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          // With only 1 player, there are 0 eligible voters, so auto-accept
          const state = game.getState();
          expect(state.match.scores[alice]).toBe(1);
          expect(state.match.completedCount).toBe(1);
        })
      );
    });

    it('accepts decision as a plain string', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          const result = game.submitVotes(bob, 'accept');
          expect(result.ok).toBe(true);
        })
      );
    });
  });

  describe('penalty system', () => {
    it('rejected submitter is ineligible for current and next letter', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;

          // Alice gets rejected
          game.submitWord(alice, `${letter}word`);
          game.submitVotes(bob, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          // Still on same letter, Alice is ineligible
          let state = game.getState();
          expect(state.match.ineligiblePlayerIds).toContain(alice);

          // Bob submits and gets accepted on same letter
          // Eligible voters are Alice and Charlie (all participants minus submitter Bob)
          const sameLetter = state.match.currentLetter!;
          game.submitWord(bob, `${sameLetter}test`);
          game.submitVotes(alice, { decision: 'accept' });
          game.submitVotes(charlie, { decision: 'accept' });

          // Advanced to next letter, Alice should still be ineligible
          state = game.getState();
          expect(state.match.ineligiblePlayerIds).toContain(alice);
          expect(state.match.completedCount).toBe(1);
        })
      );
    });

    it('penalty expires after the next letter', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;

          // Alice gets rejected (penalty = 2)
          game.submitWord(alice, `${letter}word`);
          game.submitVotes(bob, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          // Bob completes letter 1 (voters: Alice + Charlie)
          let state = game.getState();
          game.submitWord(bob, `${state.match.currentLetter}ok`);
          game.submitVotes(alice, { decision: 'accept' });
          game.submitVotes(charlie, { decision: 'accept' });

          // Alice still ineligible for letter 2
          state = game.getState();
          expect(state.match.completedCount).toBe(1);
          expect(state.match.ineligiblePlayerIds).toContain(alice);

          // Bob completes letter 2 (voters: Alice + Charlie)
          game.submitWord(bob, `${state.match.currentLetter}word`);
          game.submitVotes(alice, { decision: 'accept' });
          game.submitVotes(charlie, { decision: 'accept' });

          // After advancing past second letter, Alice's penalty should be expired
          state = game.getState();
          expect(state.match.completedCount).toBe(2);
          expect(state.match.ineligiblePlayerIds).not.toContain(alice);
        })
      );
    });

    it('wipes all penalties if all but one player become ineligible', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          // Alice gets rejected
          let state = game.getState();
          game.submitWord(alice, `${state.match.currentLetter}a`);
          game.submitVotes(bob, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          // Bob gets rejected (same letter still, voters: Alice + Charlie)
          state = game.getState();
          game.submitWord(bob, `${state.match.currentLetter}b`);
          game.submitVotes(alice, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          // Now Alice and Bob are ineligible, only Charlie remains
          // Penalties should be wiped so everyone can play
          state = game.getState();
          expect(state.match.ineligiblePlayerIds).toHaveLength(0);
        })
      );
    });
  });

  describe('ineligible voter exclusion', () => {
    it('rejects votes from ineligible (penalized) players', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;

          // Alice gets rejected (penalty = 2)
          game.submitWord(alice, `${letter}word`);
          game.submitVotes(bob, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          // Bob submits next word; Alice is ineligible and should not be able to vote
          let state = game.getState();
          game.submitWord(bob, `${state.match.currentLetter}ok`);

          const aliceVote = game.submitVotes(alice, { decision: 'accept' });
          expect(aliceVote.ok).toBe(false);
          expect(aliceVote.reason).toBe('not_eligible');
        })
      );
    });

    it('excludes ineligible players from eligible voter count', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;

          // Alice gets rejected (penalty = 2)
          game.submitWord(alice, `${letter}word`);
          game.submitVotes(bob, { decision: 'reject' });
          game.submitVotes(charlie, { decision: 'reject' });

          // Bob submits; eligible voters should be only Charlie (not Alice who has penalty)
          let state = game.getState();
          game.submitWord(bob, `${state.match.currentLetter}ok`);

          state = game.getState();
          // Only Charlie can vote (Bob submitted, Alice is ineligible)
          expect(state.match.eligibleVoterCount).toBe(1);
        })
      );
    });
  });

  describe('game completion', () => {
    it('finishes after all 26 letters completed', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          // With 1 player, each submission is auto-accepted
          for (let i = 0; i < 26; i++) {
            const state = game.getState();
            if (state.match.state === 'finished') break;
            const letter = state.match.currentLetter!;
            game.submitWord(alice, `${letter}word`);
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.completedCount).toBe(26);
        })
      );
    });

    it('winner is player with most points', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          // Alice submits all 26 words, Bob always accepts
          for (let i = 0; i < 26; i++) {
            const state = game.getState();
            if (state.match.state === 'finished') break;
            const letter = state.match.currentLetter!;
            game.submitWord(alice, `${letter}word`);
            if (game.getState().match.state === 'voting') {
              game.submitVotes(bob, { decision: 'accept' });
            }
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerId).toBe(alice);
          expect(finalState.match.winnerName).toBe('Alice');
          expect(finalState.match.scores[alice]).toBe(26);
        })
      );
    });

    it('state transitions to finished', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          for (let i = 0; i < 26; i++) {
            const state = game.getState();
            if (state.match.state === 'finished') break;
            const letter = state.match.currentLetter!;
            game.submitWord(alice, `${letter}word`);
          }

          expect(game.getPhase()).toBe('finished');
        })
      );
    });
  });

  describe('end game', () => {
    it('admin can end active game early', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);
          expect(game.getPhase()).toBe('racing');

          const result = game.endGame();
          expect(result.ok).toBe(true);
        })
      );
    });

    it('returns to idle state after ending', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);
          game.endGame();

          expect(game.getPhase()).toBe('idle');
          expect(game.getState().match.state).toBe('idle');
        })
      );
    });

    it('cannot end already idle game', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });

        const game = createGame({ playerStore: store });

        const result = game.endGame();
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('not_active');
      });
    });

    it('cannot end already finished game', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          // Complete all 26 letters
          for (let i = 0; i < 26; i++) {
            const state = game.getState();
            if (state.match.state === 'finished') break;
            const letter = state.match.currentLetter!;
            game.submitWord(alice, `${letter}word`);
          }

          expect(game.getPhase()).toBe('finished');
          const result = game.endGame();
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('not_active');
        })
      );
    });

    it('clears pending vote timers when ending game', async () => {
      await withFakeTimers((timers) =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          store.joinPlayer({ name: 'Bob' });

          let changeCount = 0;
          const game = createGame({
            playerStore: store,
            onStateChange: () => { changeCount++; },
          });

          game.startRound(5000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}word`);

          const beforeEnd = changeCount;
          game.endGame();

          // Advancing time should not trigger additional state changes
          timers.advance(10000);
          expect(changeCount).toBe(beforeEnd + 1);
        })
      );
    });
  });

  describe('category selection', () => {
    it('can select category before start', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.selectCategory('Animals');
        expect(result.ok).toBe(true);
        expect(result.category).toBe('Animals');
      });
    });

    it('can select random category', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.selectRandomCategory();
        expect(result.ok).toBe(true);
        expect(result.category).toBeDefined();
      });
    });

    it('cannot change category during active game', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const selectResult = game.selectCategory('Animals');
          expect(selectResult.ok).toBe(false);
          expect(selectResult.reason).toBe('round_active');

          const randomResult = game.selectRandomCategory();
          expect(randomResult.ok).toBe(false);
          expect(randomResult.reason).toBe('round_active');
        })
      );
    });

    it('can add custom category', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.addCategory('Custom Category');
        expect(result.ok).toBe(true);
        expect(result.category).toBe('Custom Category');

        const state = game.getState();
        expect(state.settings.categories).toContain('Custom Category');
        expect(state.settings.selectedCategory).toBe('Custom Category');
      });
    });

    it('cannot add custom category during active game', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const result = game.addCategory('Custom');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('round_active');
        })
      );
    });

    it('uses selected category in match state', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });

          const game = createGame({ playerStore: store });
          game.selectCategory('Brands');
          game.startRound(10000);

          const state = game.getState();
          expect(state.match.category).toBe('Brands');
        })
      );
    });
  });

  describe('join player', () => {
    it('players can join', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.joinPlayer({ name: 'Alice' });
        expect(result.ok).toBe(true);
        expect(result.playerId).toBeDefined();
        expect(result.name).toBe('Alice');

        const state = game.getState();
        expect(state.players.some((p) => p.name === 'Alice')).toBe(true);
      });
    });

    it("late joiners don't participate in current game", async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });
          store.joinPlayer({ name: 'Bob' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const lateResult = game.joinPlayer({ name: 'Late' });
          expect(lateResult.ok).toBe(true);

          const state = game.getState();
          expect(state.match.participants).not.toContain(lateResult.playerId);
          expect(state.players.some((p) => p.id === lateResult.playerId)).toBe(true);
        })
      );
    });
  });

  describe('getState snapshot', () => {
    it('exposes vote counts and submitter name in state', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          store.joinPlayer({ name: 'Charlie' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const letter = game.getState().match.currentLetter!;
          game.submitWord(alice, `${letter}pple`);

          game.submitVotes(bob, { decision: 'accept' });

          const state = game.getState();
          expect(state.match.submittedByName).toBe('Alice');
          expect(state.match.votesAccept).toBe(1);
          expect(state.match.votesReject).toBe(0);
          expect(state.match.votedPlayerIds).toContain(bob);
          expect(state.match.eligibleVoterCount).toBe(2);
        })
      );
    });

    it('letter sequence starts at random position controlled by stub', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });

          const game = createGame({ playerStore: store });
          game.startRound(10000);

          const state = game.getState();
          // Random value 0 => Math.floor(0 * 26) = 0 => starts at A
          expect(state.match.letterSequence[0]).toBe('A');
          expect(state.match.currentLetter).toBe('A');
        })
      );
    });

    it('increments match id on each start', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          store.joinPlayer({ name: 'Alice' });

          const game = createGame({ playerStore: store });

          const first = game.startRound(10000);
          expect(first.matchId).toBe(1);

          // endGame resets match to empty (id: 0), so next start is 1 again
          game.endGame();

          const second = game.startRound(10000);
          expect(second.matchId).toBe(1);
        })
      );
    });
  });
});
