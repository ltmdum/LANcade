import { describe, it, expect } from 'vitest';
import { createGame } from '../undercoveragent.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers, withStubbedRandom } from '../../shared/tests/helpers.js';

/**
 * Helper to set up a game with 3 players and a player store.
 * @returns Object with game, store, and player IDs.
 */
function setupThreePlayerGame() {
  const store = createPlayerStore();
  const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
  const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
  const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
  const game = createGame({ playerStore: store });
  return { game, store, alice, bob, charlie };
}

/**
 * Helper to set up a game with 4 players and a player store.
 * @returns Object with game, store, and player IDs.
 */
function setupFourPlayerGame() {
  const store = createPlayerStore();
  const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
  const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
  const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
  const dave = store.joinPlayer({ name: 'Dave' }).playerId!;
  const game = createGame({ playerStore: store });
  return { game, store, alice, bob, charlie, dave };
}

/**
 * Drive all players through the reveal phase by revealing and readying.
 * @param game The game instance.
 * @param playerIds Array of all participant player IDs.
 */
/**
 * Drive all players through the reveal phase by revealing and readying.
 * @param game The game instance.
 * @param playerIds Array of all participant player IDs.
 */
function revealAndReadyAll(
  game: ReturnType<typeof createGame>,
  playerIds: string[]
): void {
  for (const pid of playerIds) {
    game.submitWord(pid, 'REVEAL');
    game.submitWord(pid, 'READY');
  }
}

/**
 * Submit words in turn order for all participants in the current round.
 * @param game The game instance.
 * @param wordFn Function that returns the word for a given player index.
 */
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

describe('undercoverAgent', () => {
  describe('round start validation', () => {
    it('rejects start with fewer than 3 players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store });

        let result = game.startRound(2000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('need_3_players');

        store.joinPlayer({ name: 'Alice' });
        result = game.startRound(2000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('need_3_players');

        store.joinPlayer({ name: 'Bob' });
        result = game.startRound(2000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('need_3_players');
      });
    });

    it('successfully starts with 3 players', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        const result = game.startRound(2000);
        expect(result.ok).toBe(true);
        expect(result.roundId).toBeDefined();
      });
    });

    it('sets state to reveal on start', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(2000);
        const state = game.getState();
        expect(state.match.state).toBe('reveal');
      });
    });

    it('assigns a word on start', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(2000);
        const state = game.getState();
        expect(state.match.word).not.toBeNull();
        expect(typeof state.match.word).toBe('string');
      });
    });

    it('durationMs determines number of rounds', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();

        game.startRound(2000);
        expect(game.getState().match.totalRounds).toBe(2);

        game.endGame();
        game.startRound(3000);
        expect(game.getState().match.totalRounds).toBe(3);

        game.endGame();
        game.startRound(5000);
        expect(game.getState().match.totalRounds).toBe(5);
      });
    });
  });

  describe('reveal phase', () => {
    it('player can reveal their role via REVEAL command', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();
        game.startRound(2000);

        const result = game.submitWord(alice, 'REVEAL');
        expect(result.ok).toBe(true);
        expect(result.role).toBeDefined();
        expect(['undercover', 'civilian']).toContain(result.role);
      });
    });

    it('tracks revealed players', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob } = setupThreePlayerGame();
        game.startRound(2000);

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
        game.startRound(2000);

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
        game.startRound(2000);

        game.submitWord(alice, 'REVEAL');
        const result = game.submitWord(alice, 'REVEAL');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('already_revealed');
      });
    });

    it('cannot ready before revealing', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();
        game.startRound(2000);

        const result = game.submitWord(alice, 'READY');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('must_reveal_first');
      });
    });

    it('transitions to submitting when all players ready', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000);

          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          expect(state.match.state).toBe('submitting');
        })
      );
    });

    it('exactly one player gets undercover role', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(2000);

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
          game.startRound(2000);
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
          game.startRound(2000);
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
          game.startRound(2000);
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
          game.startRound(2000);
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

    it('tracks submissions per player per round', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          submitAllInTurnOrder(game, (i) => `word${i}`);

          const state = game.getState();
          for (const sub of state.match.submissions) {
            expect(sub.words.length).toBe(1);
          }
        })
      );
    });

    it('after all players submit a round, starts next round if more remain', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000); // 2 rounds
          revealAndReadyAll(game, [alice, bob, charlie]);

          // Complete round 1
          submitAllInTurnOrder(game, (i) => `round1word${i}`);

          const state = game.getState();
          expect(state.match.state).toBe('submitting');
          expect(state.match.currentRound).toBe(2);
          expect(state.match.roundSubmittedPlayerIds.length).toBe(0);
        })
      );
    });

    it('after all rounds complete, transitions to voting', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000); // 2 rounds
          revealAndReadyAll(game, [alice, bob, charlie]);

          // Complete round 1
          submitAllInTurnOrder(game, (i) => `r1w${i}`);
          // Complete round 2
          submitAllInTurnOrder(game, (i) => `r2w${i}`);

          const state = game.getState();
          expect(state.match.state).toBe('voting');
        })
      );
    });

    it('cannot submit when not in submitting phase', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();

        // Game not started
        const result = game.submitWord(alice, 'test');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('invalid_state');
      });
    });
  });

  describe('voting phase', () => {
    /**
     * Helper to drive a game into the voting phase.
     * @returns Object with game and player IDs.
     */
    function setupVotingPhase() {
      const { game, alice, bob, charlie } = setupThreePlayerGame();
      game.startRound(1000); // 1 round
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

    it('non-unanimous vote starts new voting round with tally preserved', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupVotingPhase();
          const state = game.getState();
          expect(state.match.state).toBe('voting');

          // Split vote: not unanimous
          game.submitVotes(alice, { targetPlayerId: bob });
          game.submitVotes(bob, { targetPlayerId: charlie });
          game.submitVotes(charlie, { targetPlayerId: alice });

          const afterState = game.getState();
          expect(afterState.match.state).toBe('voting');
          expect(afterState.match.currentVoteRound).toBe(2);
          expect(afterState.match.voteRounds.length).toBe(1);
          expect(afterState.match.voteRounds[0].isUnanimous).toBe(false);
          expect(afterState.match.votedPlayerIds.length).toBe(0);
        })
      );
    });

    it('unanimous vote for undercover agent transitions to guessing phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game } = setupVotingPhase();

          const state = game.getState();
          const participants = state.match.participants;
          const undercoverId = participants[0];
          const civilians = participants.filter(id => id !== undercoverId);

          for (const pid of civilians) {
            game.submitVotes(pid, { targetPlayerId: undercoverId });
          }
          game.submitVotes(undercoverId, {
            targetPlayerId: civilians[0],
          });

          const afterVote = game.getState();
          expect(afterVote.match.state).toBe('guessing');
          expect(afterVote.match.undercoverPlayerId).toBe(undercoverId);

          // Agent guesses wrong -> civilians win
          game.submitWord(undercoverId, 'wrongguess');

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(false);
          expect(finalState.match.finishReason).toBe('agent_final_guess_wrong');
        })
      );
    });

    it('unanimous vote for wrong player results in undercover wins', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupVotingPhase();

          const state = game.getState();
          const participants = state.match.participants;
          // With random = 0, undercover is first participant
          const undercoverId = participants[0];
          const wrongTarget = participants.find(
            id => id !== undercoverId
          )!;

          // Everyone except wrongTarget votes for wrongTarget
          for (const pid of participants) {
            if (pid !== wrongTarget) {
              game.submitVotes(pid, { targetPlayerId: wrongTarget });
            }
          }
          // wrongTarget votes for someone else
          const otherTarget = participants.find(
            id => id !== wrongTarget && id !== undercoverId
          ) || undercoverId;
          game.submitVotes(wrongTarget, {
            targetPlayerId: otherTarget,
          });

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
        })
      );
    });

    it('cannot vote when not in voting phase', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob } = setupThreePlayerGame();
        game.startRound(2000);

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

  describe('unanimous vote logic', () => {
    it('with 3 players: needs 2 votes from non-target players', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          const state = game.getState();
          const participants = state.match.participants;
          const target = participants[0]; // undercover with random=0
          const nonTargets = participants.filter(id => id !== target);

          // 2 non-target players vote for target (unanimous)
          for (const pid of nonTargets) {
            game.submitVotes(pid, { targetPlayerId: target });
          }
          // Target votes for someone else
          game.submitVotes(target, { targetPlayerId: nonTargets[0] });

          const afterVote = game.getState();
          // Correct identification goes to guessing, not finished
          expect(afterVote.match.state).toBe('guessing');
          const lastRound =
            afterVote.match.voteRounds[
              afterVote.match.voteRounds.length - 1
            ];
          expect(lastRound.isUnanimous).toBe(true);
          expect(lastRound.unanimousTargetId).toBe(target);
        })
      );
    });

    it('with 4 players: needs 3 votes from non-target players', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie, dave } =
            setupFourPlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie, dave]);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          const state = game.getState();
          const participants = state.match.participants;
          const target = participants[0];
          const nonTargets = participants.filter(id => id !== target);

          // 3 non-target players vote for target
          for (const pid of nonTargets) {
            game.submitVotes(pid, { targetPlayerId: target });
          }
          // Target votes for someone else
          game.submitVotes(target, { targetPlayerId: nonTargets[0] });

          const afterVote = game.getState();
          // Correct identification goes to guessing, not finished
          expect(afterVote.match.state).toBe('guessing');
          const lastRound =
            afterVote.match.voteRounds[
              afterVote.match.voteRounds.length - 1
            ];
          expect(lastRound.isUnanimous).toBe(true);
        })
      );
    });
  });

  describe('game completion', () => {
    it('finished state reveals undercover player identity', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          // Before finishing, undercover is hidden
          const beforeState = game.getState();
          expect(beforeState.match.undercoverPlayerId).toBeNull();

          const participants = beforeState.match.participants;
          const target = participants[0];
          const nonTargets = participants.filter(id => id !== target);

          for (const pid of nonTargets) {
            game.submitVotes(pid, { targetPlayerId: target });
          }
          game.submitVotes(target, { targetPlayerId: nonTargets[0] });

          // Agent is revealed in guessing phase
          const guessingState = game.getState();
          expect(guessingState.match.state).toBe('guessing');
          expect(guessingState.match.undercoverPlayerId).toBe(target);

          // Agent guesses wrong -> finished
          game.submitWord(target, 'wrongguess');

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.undercoverPlayerId).not.toBeNull();
          expect(finalState.match.undercoverPlayerId).toBe(target);
        })
      );
    });

    it('winnerIsUndercover is false when civilians correctly identify the agent and agent guesses wrong', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          const participants = game.getState().match.participants;
          const undercover = participants[0];
          const nonTargets = participants.filter(id => id !== undercover);

          for (const pid of nonTargets) {
            game.submitVotes(pid, { targetPlayerId: undercover });
          }
          game.submitVotes(undercover, {
            targetPlayerId: nonTargets[0],
          });

          // Agent gets final guess - guesses wrong
          expect(game.getState().match.state).toBe('guessing');
          game.submitWord(undercover, 'wrongguess');

          const finalState = game.getState();
          expect(finalState.match.winnerIsUndercover).toBe(false);
        })
      );
    });

    it('winnerIsUndercover is true when civilians vote for wrong player', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          const participants = game.getState().match.participants;
          const undercover = participants[0];
          const wrongTarget = participants[1];
          const other = participants[2];

          // Everyone except wrongTarget votes for wrongTarget (unanimous)
          game.submitVotes(undercover, {
            targetPlayerId: wrongTarget,
          });
          game.submitVotes(other, { targetPlayerId: wrongTarget });
          // wrongTarget votes for someone else
          game.submitVotes(wrongTarget, {
            targetPlayerId: undercover,
          });

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
        })
      );
    });
  });

  describe('end game', () => {
    it('admin can end active game early', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(2000);

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
          game.startRound(2000);
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
        game.startRound(2000);
        expect(changeCount).toBeGreaterThan(before);
      });
    });
  });

  describe('getPhase', () => {
    it('returns current phase string', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();

        expect(game.getPhase()).toBe('idle');

        game.startRound(2000);
        expect(game.getPhase()).toBe('reveal');
      });
    });
  });

  describe('public state hides undercover until finished', () => {
    it('undercoverPlayerId is null in non-finished states', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000);

          // Reveal phase
          expect(game.getState().match.undercoverPlayerId).toBeNull();

          revealAndReadyAll(game, [alice, bob, charlie]);

          // Submitting phase
          expect(game.getState().match.undercoverPlayerId).toBeNull();
        })
      );
    });
  });

  describe('duplicate detection is case insensitive', () => {
    it('rejects words that differ only in case', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000);
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

  describe('agent guesses secret word during submission', () => {
    it('ends the game when the undercover agent submits the secret word', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const secretWord = state.match.word!;
          const undercover = state.match.participants[0];

          // Advance turns until it is the undercover agent's turn
          const turnOrder = state.match.turnOrder;
          for (let i = 0; i < turnOrder.length; i++) {
            if (turnOrder[i] === undercover) {
              game.submitWord(undercover, secretWord);
              break;
            }
            game.submitWord(turnOrder[i], `clue${i}`);
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
          expect(finalState.match.finishReason).toBe('agent_found_word');
        })
      );
    });

    it('civilian submitting the secret word ends the game with agent win', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const secretWord = state.match.word!;
          const undercover = state.match.participants[0];
          const turnOrder = state.match.turnOrder;

          // Find first civilian in turn order
          for (const pid of turnOrder) {
            if (pid !== undercover) {
              game.submitWord(pid, secretWord);
              break;
            }
            game.submitWord(pid, `clue_${pid}`);
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
          expect(finalState.match.finishReason).toBe('civilian_revealed_word');
        })
      );
    });

    it('civilian secret word submission bypasses duplicate check', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const secretWord = state.match.word!;
          const undercover = state.match.participants[0];
          const turnOrder = state.match.turnOrder;

          // Find two civilians to test that submitting the secret word ends the game
          // even when another player has already submitted a clue.
          let firstCivilian: string | null = null;
          let secondCivilian: string | null = null;
          for (const pid of turnOrder) {
            if (pid !== undercover) {
              if (!firstCivilian) {
                firstCivilian = pid;
              } else if (!secondCivilian) {
                secondCivilian = pid;
              }
            }
          }

          // Submit clues until first civilian's turn, then have them submit the secret word
          for (const pid of turnOrder) {
            if (pid === firstCivilian) {
              // First civilian submits a regular clue
              game.submitWord(pid, 'regularclue');
            } else if (pid === secondCivilian) {
              // Second civilian submits the secret word
              const result = game.submitWord(pid, secretWord);
              expect(result.ok).toBe(true);
              break;
            } else {
              game.submitWord(pid, `clue_${pid}`);
            }
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
          expect(finalState.match.finishReason).toBe('civilian_revealed_word');
        })
      );
    });

    it('agent secret word guess is case insensitive', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(2000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const state = game.getState();
          const secretWord = state.match.word!;
          const undercover = state.match.participants[0];
          const turnOrder = state.match.turnOrder;

          for (let i = 0; i < turnOrder.length; i++) {
            if (turnOrder[i] === undercover) {
              game.submitWord(undercover, secretWord.toUpperCase());
              break;
            }
            game.submitWord(turnOrder[i], `clue${i}`);
          }

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
          expect(finalState.match.finishReason).toBe('agent_found_word');
        })
      );
    });
  });

  describe('guessing phase', () => {
    /**
     * Helper to drive a game into the guessing phase (correct unanimous vote).
     * @returns Object with game, player IDs, and the secret word.
     */
    function setupGuessingPhase() {
      const { game, alice, bob, charlie } = setupThreePlayerGame();
      game.startRound(1000);
      revealAndReadyAll(game, [alice, bob, charlie]);
      submitAllInTurnOrder(game, (i) => `clue${i}`);

      const state = game.getState();
      const participants = state.match.participants;
      const undercover = participants[0];
      const civilians = participants.filter(id => id !== undercover);
      const secretWord = state.match.word!;

      // Unanimous vote for the correct undercover agent
      for (const pid of civilians) {
        game.submitVotes(pid, { targetPlayerId: undercover });
      }
      game.submitVotes(undercover, { targetPlayerId: civilians[0] });

      return { game, alice, bob, charlie, undercover, civilians, secretWord };
    }

    it('transitions to guessing after correct unanimous vote', async () => {
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

    it('hides the secret word during guessing phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game } = setupGuessingPhase();
          const state = game.getState();
          expect(state.match.word).toBeNull();
        })
      );
    });

    it('agent guessing the correct word wins the game', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover, secretWord } = setupGuessingPhase();

          game.submitWord(undercover, secretWord);

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
          expect(finalState.match.finishReason).toBe('agent_final_guess_correct');
          expect(finalState.match.finalGuess).toBe(secretWord);
        })
      );
    });

    it('agent guessing the wrong word loses the game', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover } = setupGuessingPhase();

          game.submitWord(undercover, 'totallyWrong');

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(false);
          expect(finalState.match.finishReason).toBe('agent_final_guess_wrong');
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
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
          expect(finalState.match.finishReason).toBe('agent_final_guess_correct');
        })
      );
    });

    it('non-undercover player cannot submit during guessing phase', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, civilians } = setupGuessingPhase();

          const result = game.submitWord(civilians[0], 'anything');
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

    it('wrong unanimous vote skips guessing and agent wins immediately', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);
          submitAllInTurnOrder(game, (i) => `w${i}`);

          const state = game.getState();
          const participants = state.match.participants;
          const undercover = participants[0];
          const wrongTarget = participants[1];

          // Everyone except wrongTarget votes for wrongTarget
          for (const pid of participants) {
            if (pid !== wrongTarget) {
              game.submitVotes(pid, { targetPlayerId: wrongTarget });
            }
          }
          game.submitVotes(wrongTarget, { targetPlayerId: undercover });

          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.winnerIsUndercover).toBe(true);
          expect(finalState.match.finishReason).toBe('wrong_vote');
        })
      );
    });

    it('word is revealed again after guessing phase ends', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, undercover, secretWord } = setupGuessingPhase();

          // Word is hidden during guessing
          expect(game.getState().match.word).toBeNull();

          // Agent guesses wrong
          game.submitWord(undercover, 'wrong');

          // Word is revealed in finished state
          const finalState = game.getState();
          expect(finalState.match.state).toBe('finished');
          expect(finalState.match.word).toBe(secretWord);
        })
      );
    });
  });

});
