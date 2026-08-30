import { describe, it, expect, vi } from 'vitest';
import { createGame } from '../undercoveragent.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers, withStubbedRandom } from '../../shared/tests/helpers.js';

function setupThreePlayerGame() {
  const store = createPlayerStore();
  const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
  const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
  const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
  const game = createGame({ playerStore: store });
  return { game, store, alice, bob, charlie };
}

function setupFourPlayerGame() {
  const store = createPlayerStore();
  const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
  const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
  const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
  const dave = store.joinPlayer({ name: 'Dave' }).playerId!;
  const game = createGame({ playerStore: store });
  return { game, store, alice, bob, charlie, dave };
}

function revealAndReadyAll(
  game: ReturnType<typeof createGame>,
  playerIds: string[]
): void {
  for (const pid of playerIds) {
    game.submitWord(pid, 'REVEAL');
    game.submitWord(pid, 'READY');
  }
}

function submitAllInTurnOrder(
  game: ReturnType<typeof createGame>,
  wordFn: (index: number, playerId: string) => string
): void {
  const state = game.getState();
  const turnOrder = state.match.turnOrder;
  for (let i = 0; i < turnOrder.length; i++) {
    game.submitWord(turnOrder[i], wordFn(i, turnOrder[i]));
  }
}

function voteAllFor(
  game: ReturnType<typeof createGame>,
  targetId: string,
  targetVoteFor?: string
): void {
  const state = game.getState();
  const participants = state.match.participants;
  const others = participants.filter(p => p !== targetId);
  for (const pid of others) {
    game.submitVotes(pid, { targetPlayerId: targetId });
  }
  game.submitVotes(targetId, { targetPlayerId: targetVoteFor || others[0] });
}

describe('undercoverAgent', () => {
  describe('round start validation', () => {
    it('rejects start with fewer than 3 players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        let result = game.startRound(1000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('need_3_players');

        store.joinPlayer({ name: 'Alice' });
        result = game.startRound(1000);
        expect(result.ok).toBe(false);

        store.joinPlayer({ name: 'Bob' });
        result = game.startRound(1000);
        expect(result.ok).toBe(false);
      });
    });

    it('successfully starts with 3 players', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        const result = game.startRound(1000);
        expect(result.ok).toBe(true);
        expect(result.roundId).toBeDefined();
      });
    });

    it('sets state to reveal on start', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(1000);
        const state = game.getState();
        expect(state.match.state).toBe('reveal');
      });
    });

    it('assigns a word on start', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(1000);
        const state = game.getState();
        expect(state.match.word).not.toBeNull();
        expect(typeof state.match.word).toBe('string');
      });
    });

    it('initialises scores to 0 for all players', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        const state = game.getState();
        expect(state.match.scores[alice]).toBe(0);
        expect(state.match.scores[bob]).toBe(0);
        expect(state.match.scores[charlie]).toBe(0);
      });
    });

    it('broadcasts winningScore default in state', () => {
      const { game } = setupThreePlayerGame();
      const state = game.getState();
      expect(state.gameSettings).toEqual({ winningScore: 5 });
    });
  });

  describe('settings', () => {
    it('accepts valid winningScore values', () => {
      const { game } = setupThreePlayerGame();
      expect(game.updateSettings({ winningScore: 3 }).ok).toBe(true);
      expect(game.updateSettings({ winningScore: 10 }).ok).toBe(true);
      expect(game.updateSettings({ winningScore: 25 }).ok).toBe(true);
    });

    it('rejects invalid winningScore values', () => {
      const { game } = setupThreePlayerGame();
      expect(game.updateSettings({ winningScore: 0 }).ok).toBe(false);
      expect(game.updateSettings({ winningScore: 51 }).ok).toBe(false);
      expect(game.updateSettings({ winningScore: 2.5 }).ok).toBe(false);
    });

    it('rejects settings changes during active game', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(1000);
        expect(game.updateSettings({ winningScore: 10 }).reason).toBe('game_active');
      });
    });

    it('broadcasts updated gameSettings', () => {
      const { game } = setupThreePlayerGame();
      game.updateSettings({ winningScore: 10 });
      expect(game.getState().gameSettings).toEqual({ winningScore: 10 });
    });
  });

  describe('reveal phase', () => {
    it('player can reveal their role via REVEAL command', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();
        game.startRound(1000);

        const result = game.submitWord(alice, 'REVEAL');
        expect(result.ok).toBe(true);
        expect(result.role).toBeDefined();
        expect(['undercover', 'civilian']).toContain(result.role);
      });
    });

    it('tracks revealed players', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob } = setupThreePlayerGame();
        game.startRound(1000);

        game.submitWord(alice, 'REVEAL');
        let state = game.getState();
        expect(state.match.revealedPlayerIds).toContain(alice);
        expect(state.match.revealedPlayerIds).not.toContain(bob);

        game.submitWord(bob, 'REVEAL');
        state = game.getState();
        expect(state.match.revealedPlayerIds).toContain(bob);
      });
    });

    it('player can ready after revealing', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();
        game.startRound(1000);

        game.submitWord(alice, 'REVEAL');
        const result = game.submitWord(alice, 'READY');
        expect(result.ok).toBe(true);

        const state = game.getState();
        expect(state.match.readyPlayerIds).toContain(alice);
      });
    });

    it('cannot reveal twice', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();
        game.startRound(1000);

        game.submitWord(alice, 'REVEAL');
        const result = game.submitWord(alice, 'REVEAL');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('already_revealed');
      });
    });

    it('cannot ready before revealing', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();
        game.startRound(1000);

        const result = game.submitWord(alice, 'READY');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('must_reveal_first');
      });
    });

    it('transitions to submitting when all players ready', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);

          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          expect(state.match.state).toBe('submitting');
        })
      );
    });

    it('exactly one player gets undercover role', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);

        const resultA = game.submitWord(alice, 'REVEAL');
        const resultB = game.submitWord(bob, 'REVEAL');
        const resultC = game.submitWord(charlie, 'REVEAL');

        const roles = [resultA.role, resultB.role, resultC.role];
        const undercoverCount = roles.filter(r => r === 'undercover').length;
        const civilianCount = roles.filter(r => r === 'civilian').length;

        expect(undercoverCount).toBe(1);
        expect(civilianCount).toBe(2);
      });
    });
  });

  describe('submission phase', () => {
    it('only current turn player can submit', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          expect(state.match.state).toBe('submitting');
          const currentPlayer = state.match.currentTurnPlayerId!;
          const otherPlayers = [alice, bob, charlie].filter(
            id => id !== currentPlayer
          );

          const invalidResult = game.submitWord(otherPlayers[0], 'myword');
          expect(invalidResult.ok).toBe(false);
          expect(invalidResult.reason).toBe('not_your_turn');
        })
      );
    });

    it('rejects duplicate words', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const firstPlayer = state.match.turnOrder[0];
          game.submitWord(firstPlayer, 'hello');

          const secondState = game.getState();
          const secondPlayer = secondState.match.currentTurnPlayerId!;
          const result = game.submitWord(secondPlayer, 'hello');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('duplicate');
        })
      );
    });

    it('rejects empty words', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const currentPlayer = state.match.currentTurnPlayerId!;
          const result = game.submitWord(currentPlayer, '   ');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('empty');
        })
      );
    });

    it('advances to next turn after valid submission', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const firstPlayer = state.match.turnOrder[0];
          const secondPlayer = state.match.turnOrder[1];

          game.submitWord(firstPlayer, 'apple');

          const nextState = game.getState();
          expect(nextState.match.currentTurnPlayerId).toBe(secondPlayer);
          expect(nextState.match.currentTurnIndex).toBe(1);
        })
      );
    });

    it('tracks submissions per player', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          submitAllInTurnOrder(game, (i) => `word${i}`);

          const state = game.getState();
          for (const sub of state.match.submissions) {
            expect(sub.words.length).toBe(1);
          }
        })
      );
    });

    it('transitions to voting after all submit', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          submitAllInTurnOrder(game, (i) => `word${i}`);

          const state = game.getState();
          expect(state.match.state).toBe('voting');
        })
      );
    });

    it('cannot submit when not in submitting phase', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();

        const result = game.submitWord(alice, 'test');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('invalid_state');
      });
    });
  });

  describe('voting phase', () => {
    function setupVotingPhase() {
      const { game, alice, bob, charlie } = setupThreePlayerGame();
      game.startRound(1000);
      revealAndReadyAll(game, [alice, bob, charlie]);
      submitAllInTurnOrder(game, (i) => `word${i}`);
      return { game, alice, bob, charlie };
    }

    it('records votes from players', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob } = setupVotingPhase();

          const state = game.getState();
          expect(state.match.state).toBe('voting');

          const result = game.submitVotes(alice, { targetPlayerId: bob });
          expect(result.ok).toBe(true);

          const stateAfter = game.getState();
          expect(stateAfter.match.votedPlayerIds).toContain(alice);
        })
      );
    });

    it('cannot vote for self', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice } = setupVotingPhase();
          const result = game.submitVotes(alice, {
            targetPlayerId: alice,
          });
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('cannot_vote_self');
        })
      );
    });

    it('cannot vote for a non-participant', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice } = setupVotingPhase();
          const result = game.submitVotes(alice, {
            targetPlayerId: 'nonexistent',
          });
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('invalid_target');
        })
      );
    });

    it('cannot vote twice', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob } = setupVotingPhase();
          game.submitVotes(alice, { targetPlayerId: bob });
          const result = game.submitVotes(alice, { targetPlayerId: bob });
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('already_voted');
        })
      );
    });

    it('tie triggers a re-vote', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupVotingPhase();
          const state = game.getState();

          // A tie: each player votes for a different person
          // Alice votes Bob, Bob votes Charlie, Charlie votes Alice
          game.submitVotes(alice, { targetPlayerId: bob });
          game.submitVotes(bob, { targetPlayerId: charlie });
          game.submitVotes(charlie, { targetPlayerId: alice });

          const afterState = game.getState();
          expect(afterState.match.state).toBe('voting');
          expect(afterState.match.currentVoteRound).toBe(2);
          expect(afterState.match.voteRounds.length).toBe(1);
          expect(afterState.match.voteRounds[0].isTie).toBe(true);
          expect(afterState.match.voteRounds[0].targetPlayerId).toBeNull();
        })
      );
    });

    it('broadcasts the new vote round when the last vote creates a tie', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
          const notifySpy = vi.fn();
          const game = createGame({ playerStore: store, onStateChange: notifySpy });

          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `word${i}`);

          const beforeVotes = notifySpy.mock.calls.length;
          game.submitVotes(alice, { targetPlayerId: bob });
          game.submitVotes(bob, { targetPlayerId: charlie });
          game.submitVotes(charlie, { targetPlayerId: alice });

          expect(notifySpy.mock.calls.length).toBeGreaterThan(beforeVotes + 2);
        })
      );
    });

    it('records who each player voted for in the vote round', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupVotingPhase();

          game.submitVotes(alice, { targetPlayerId: bob });
          game.submitVotes(bob, { targetPlayerId: alice });
          game.submitVotes(charlie, { targetPlayerId: alice });

          const state = game.getState();
          const round = state.match.voteRounds[0];
          expect(round.votes).toEqual([
            { playerId: alice, targetPlayerId: bob },
            { playerId: bob, targetPlayerId: alice },
            { playerId: charlie, targetPlayerId: alice },
          ]);
        })
      );
    });

    it('majority vote for undercover agent transitions to guessing', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game } = setupVotingPhase();

          const state = game.getState();
          const participants = state.match.participants;
          const undercoverId = participants[0];

          voteAllFor(game, undercoverId);

          const afterVote = game.getState();
          expect(afterVote.match.state).toBe('guessing');
          expect(afterVote.match.undercoverPlayerId).toBe(undercoverId);
        })
      );
    });

    it('majority vote for civilian results in agent getting 3 points', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game } = setupVotingPhase();

          const state = game.getState();
          const participants = state.match.participants;
          const undercoverId = participants[0];
          const civilianTarget = participants[1];

          voteAllFor(game, civilianTarget);

          const afterState = game.getState();
          expect(afterState.match.scores[undercoverId]).toBe(3);
          expect(afterState.match.scores[civilianTarget]).toBe(1);
        })
      );
    });

    it('cannot vote when not in voting phase', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob } = setupThreePlayerGame();
        game.startRound(1000);

        const result = game.submitVotes(alice, {
          targetPlayerId: bob,
        });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('not_voting');
      });
    });

    it('rejects votes from non-participants', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, bob } = setupVotingPhase();

          const result = game.submitVotes('nonexistent-player', {
            targetPlayerId: bob,
          });
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('not_participant');
        })
      );
    });
  });

  describe('guessing phase', () => {
    function setupGuessingPhase() {
      const { game, alice, bob, charlie } = setupThreePlayerGame();
      game.startRound(1000);
      revealAndReadyAll(game, [alice, bob, charlie]);
      submitAllInTurnOrder(game, (i) => `clue${i}`);

      const state = game.getState();
      const participants = state.match.participants;
      const undercover = participants[0];
      const secretWord = state.match.word!;

      voteAllFor(game, undercover);

      return { game, alice, bob, charlie, undercover, secretWord };
    }

    it('transitions to guessing after correct vote', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game } = setupGuessingPhase();
          expect(game.getState().match.state).toBe('guessing');
        })
      );
    });

    it('reveals undercoverPlayerId during guessing phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover } = setupGuessingPhase();
          const state = game.getState();
          expect(state.match.undercoverPlayerId).toBe(undercover);
        })
      );
    });

    it('publishes the secret word during guessing phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game } = setupGuessingPhase();
          const state = game.getState();
          expect(state.match.word).not.toBeNull();
        })
      );
    });

    it('agent guessing the correct word gets 1 point', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover, secretWord } = setupGuessingPhase();

          game.submitWord(undercover, secretWord);

          const finalState = game.getState();
          expect(finalState.match.state).toBe('idle');
          expect(finalState.match.scores[undercover]).toBe(1);
          expect(finalState.match.finalGuess).toBe(secretWord);
        })
      );
    });

    it('agent guessing wrong gives 2 points to each civilian', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover, alice, bob, charlie } = setupGuessingPhase();

          game.submitWord(undercover, 'totallyWrong');

          const finalState = game.getState();
          expect(finalState.match.state).toBe('idle');
          const civilians = [alice, bob, charlie].filter(id => id !== undercover);
          for (const cid of civilians) {
            expect(finalState.match.scores[cid]).toBe(2);
          }
          expect(finalState.match.scores[undercover]).toBe(0);
          expect(finalState.match.finalGuess).toBe('totallyWrong');
        })
      );
    });

    it('correct final guess is case insensitive', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover, secretWord } = setupGuessingPhase();

          game.submitWord(undercover, secretWord.toUpperCase());

          const finalState = game.getState();
          expect(finalState.match.state).toBe('idle');
          expect(finalState.match.scores[undercover]).toBe(1);
        })
      );
    });

    it('non-undercover player cannot submit during guessing phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover, alice, bob, charlie } = setupGuessingPhase();
          const civilian = [alice, bob, charlie].find(id => id !== undercover)!;

          const result = game.submitWord(civilian, 'anything');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('not_undercover');
        })
      );
    });

    it('rejects empty guess', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover } = setupGuessingPhase();

          const result = game.submitWord(undercover, '   ');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('empty');
        })
      );
    });

    it('word is revealed in idle state after guessing ends', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover, secretWord } = setupGuessingPhase();

          expect(game.getState().match.word).not.toBeNull();

          game.submitWord(undercover, 'wrong');

          const finalState = game.getState();
          expect(finalState.match.state).toBe('idle');
          expect(finalState.match.word).toBe(secretWord);
        })
      );
    });
  });

  describe('scoring and winner detection', () => {
    it('agent gets 3 points when civilians vote wrong', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          const state = game.getState();
          const undercover = state.match.participants[0];
          const civilianTarget = state.match.participants[1];

          voteAllFor(game, civilianTarget);

          const finalState = game.getState();
          expect(finalState.match.scores[undercover]).toBe(3);
        })
      );
    });

    it('game finishes when someone reaches winningScore (default 5)', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game } = setupThreePlayerGame();
          game.updateSettings({ winningScore: 2 });

          // First round: agent gets 3 points
          game.startRound(1000);
          revealAndReadyAll(game, game.getState().match.participants);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          const state = game.getState();
          const undercover = state.match.participants[0];
          const civilianTarget = state.match.participants[1];
          voteAllFor(game, civilianTarget);

          const afterRound = game.getState();
          expect(afterRound.match.state).toBe('finished');
          expect(afterRound.match.winnerIds).toContain(undercover);
        })
      );
    });

    it('multiple rounds accumulate scores until a winner is found', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.updateSettings({ winningScore: 5 });

          // Round 1: civilians vote wrong → agent gets 3
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `r1w${i}`);
          let state = game.getState();
          let undercover = state.match.participants[0];
          voteAllFor(game, state.match.participants[1]);

          // Back to idle (agent has 3 points, needs 5)
          state = game.getState();
          expect(state.match.state).toBe('idle');
          expect(state.match.scores[undercover]).toBe(3);

          // Round 2: civilians vote wrong again → agent gets 3 more → total 6 ≥ 5
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `r2w${i}`);
          state = game.getState();
          voteAllFor(game, state.match.participants[1]);

          state = game.getState();
          expect(state.match.state).toBe('finished');
          expect(state.match.scores[undercover]).toBe(6);
          expect(state.match.winnerIds).toContain(undercover);
        })
      );
    });
  });

  describe('secret word submission', () => {
    it('agent submitting secret word gets 2 points', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const secretWord = state.match.word!;
          const turnOrder = state.match.turnOrder;

          for (let i = 0; i < turnOrder.length; i++) {
            if (turnOrder[i] === state.match.participants[0]) {
              game.submitWord(turnOrder[i], secretWord);
              break;
            }
            game.submitWord(turnOrder[i], `clue${i}`);
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('idle');
          expect(finalState.match.scores[state.match.participants[0]]).toBe(2);
        })
      );
    });

    it('civilian submitting secret word gives agent 2 points', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const secretWord = state.match.word!;
          const turnOrder = state.match.turnOrder;

          for (const pid of turnOrder) {
            if (pid !== state.match.participants[0]) {
              game.submitWord(pid, secretWord);
              break;
            }
            game.submitWord(pid, `clue_${pid}`);
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('idle');
          expect(finalState.match.scores[state.match.participants[0]]).toBe(2);
        })
      );
    });

    it('secret word submission is case insensitive', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const secretWord = state.match.word!;
          const turnOrder = state.match.turnOrder;

          for (let i = 0; i < turnOrder.length; i++) {
            if (turnOrder[i] === state.match.participants[0]) {
              game.submitWord(turnOrder[i], secretWord.toUpperCase());
              break;
            }
            game.submitWord(turnOrder[i], `clue${i}`);
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('idle');
          expect(finalState.match.scores[state.match.participants[0]]).toBe(2);
        })
      );
    });
  });

  describe('end game', () => {
    it('admin can end active game early', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(1000);

        expect(game.getState().match.state).toBe('reveal');

        const result = game.endGame();
        expect(result.ok).toBe(true);

        const state = game.getState();
        expect(state.match.state).toBe('idle');
      });
    });

    it('cannot end already idle game', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();

        const result = game.endGame();
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('not_active');
      });
    });

    it('can end game during submitting phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          expect(game.getState().match.state).toBe('submitting');

          const result = game.endGame();
          expect(result.ok).toBe(true);
          expect(game.getState().match.state).toBe('idle');
        })
      );
    });

    it('can end game during voting phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          expect(game.getState().match.state).toBe('voting');

          const result = game.endGame();
          expect(result.ok).toBe(true);
          expect(game.getState().match.state).toBe('idle');
        })
      );
    });
  });

  describe('join player', () => {
    it('players can join via joinPlayer', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.joinPlayer({ name: 'NewPlayer' });
        expect(result.ok).toBe(true);
        expect(result.playerId).toBeDefined();
        expect(result.name).toBe('NewPlayer');
      });
    });

    it('player store integration works', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        game.joinPlayer({ name: 'Alice' });
        game.joinPlayer({ name: 'Bob' });

        const state = game.getState();
        expect(state.players.length).toBe(2);
        expect(state.players.map(p => p.name)).toContain('Alice');
        expect(state.players.map(p => p.name)).toContain('Bob');
      });
    });

    it('returns error when no player store configured', async () => {
      await withFakeTimers(() => {
        const game = createGame();

        const result = game.joinPlayer({ name: 'Alice' });
        expect(result.ok).toBe(false);
        expect(result.error).toBe('no_player_store');
      });
    });

    it('initializes score to 0 for new players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        const result = game.joinPlayer({ name: 'Alice' });
        expect(result.ok).toBe(true);

        const state = game.getState();
        if (result.playerId) {
          expect(state.match.scores[result.playerId]).toBe(0);
        }
      });
    });
  });

  describe('state change notifications', () => {
    it('notifies on state changes', async () => {
      await withFakeTimers(() => {
        let changeCount = 0;
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        store.joinPlayer({ name: 'Bob' });
        store.joinPlayer({ name: 'Charlie' });
        const game = createGame({
          playerStore: store,
          onStateChange: () => {
            changeCount++;
          },
        });

        const before = changeCount;
        game.startRound(1000);
        expect(changeCount).toBeGreaterThan(before);
      });
    });
  });

  describe('getPhase', () => {
    it('returns current phase string', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();

        expect(game.getPhase()).toBe('idle');

        game.startRound(1000);
        expect(game.getPhase()).toBe('reveal');
      });
    });

    it('returns finished when there are winners', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game } = setupThreePlayerGame();
          game.updateSettings({ winningScore: 2 });

          game.startRound(1000);
          const players = game.getState().match.participants;
          revealAndReadyAll(game, players);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          const undercover = game.getState().match.participants[0];
          const others = players.filter((p: string) => p !== undercover);
          for (const p of others) {
            game.submitVotes(p, { targetPlayerId: undercover });
          }
          game.submitVotes(undercover, { targetPlayerId: others[0] });

          const guessingState = game.getState();
          expect(guessingState.match.state).toBe('guessing');

          game.submitWord(undercover, 'wrongguess');

          const phase = game.getPhase();
          const finalState = game.getState();
          // Agent got 0, civilians got 2 each, needs 2 → agent didn't reach
          // Actually with winningScore=2 civilians each got 2, so they tie for win
          expect(phase).toBe('finished');
          expect(finalState.match.winnerIds.length).toBeGreaterThan(0);
        })
      );
    });
  });

  describe('public state publishes role and word', () => {
    it('undercoverPlayerId is set in reveal/submitting', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);

          const startState = game.getState();
          expect(startState.match.undercoverPlayerId).not.toBeNull();

          revealAndReadyAll(game, [alice, bob, charlie]);

          expect(game.getState().match.undercoverPlayerId).toBe(
            startState.match.undercoverPlayerId
          );
        })
      );
    });
  });

  describe('duplicate detection is case insensitive', () => {
    it('rejects words that differ only in case', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const first = state.match.turnOrder[0];
          game.submitWord(first, 'Hello');

          const second = game.getState().match.currentTurnPlayerId!;
          const result = game.submitWord(second, 'hello');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('duplicate');
        })
      );
    });
  });
});
