import { describe, it, expect, vi } from 'vitest';
import { createGame } from '../doublebluff.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { createSessionStore } from '../../shared/stores/session-store.js';
import { withFakeTimers, withStubbedRandom } from '../../shared/tests/helpers.js';

function setupThreePlayerGame() {
  const store = createPlayerStore();
  const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
  const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
  const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
  const game = createGame({ playerStore: store });
  return { game, store, alice, bob, charlie };
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

function submitWaveAll(
  game: ReturnType<typeof createGame>,
  playerIds: string[],
  wordFn: (index: number, playerId: string) => string
): void {
  playerIds.forEach((pid, i) => {
    const result = game.submitWord(pid, wordFn(i, pid));
    if (!result.ok) {
      throw new Error(`clue submission failed for wave: ${result.reason}`);
    }
  });
}

function voteAllFor(  game: ReturnType<typeof createGame>,
  targetId: string,
  targetVoteFor?: string
): void {
  const participants = game.getState().match.participants;
  const others = participants.filter(p => p !== targetId);
  for (const pid of others) {
    game.submitVotes(pid, { targetPlayerId: targetId });
  }
  game.submitVotes(targetId, { targetPlayerId: targetVoteFor || others[0] });
}

function advanceToWaveTwo(
  game: ReturnType<typeof createGame>,
  playerIds: string[]
): void {
  revealAndReadyAll(game, playerIds);
  submitWaveAll(game, playerIds, (i) => `first${i}`);
}

function advanceToVoting(
  game: ReturnType<typeof createGame>,
  playerIds: string[]
): void {
  advanceToWaveTwo(game, playerIds);
  submitWaveAll(game, playerIds, (i) => `second${i}`);
}

function advanceToGuessing(
  game: ReturnType<typeof createGame>,
  playerIds: string[]
): void {
  advanceToVoting(game, playerIds);
  voteAllFor(game, playerIds[0]);
}

describe('doubleBluff', () => {
  describe('round start validation', () => {
    it('rejects start with fewer than 3 players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        store.joinPlayer({ name: 'Bob' });
        const game = createGame({ playerStore: store });

        const result = game.startRound(1000);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('need_3_players');
      });
    });

    it('successfully starts with 3 players', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        const result = game.startRound(1000);
        expect(result.ok).toBe(true);
        expect(result.roundId).toBe(1);
      });
    });

    it('sets state to reveal on start', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(1000);
        expect(game.getState().match.state).toBe('reveal');
      });
    });

    it('assigns a word on start', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(1000);
        expect(game.getState().match.word).toBeTruthy();
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
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob } = setupThreePlayerGame();
          game.startRound(1000);

          const agentResult = game.submitWord(alice, 'REVEAL');
          expect(agentResult.ok).toBe(true);
          expect(agentResult.role).toBe('undercover');

          const civilianResult = game.submitWord(bob, 'REVEAL');
          expect(civilianResult.ok).toBe(true);
          expect(civilianResult.role).toBe('civilian');
        })
      );
    });

    it('tracks revealed players', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();
        game.startRound(1000);

        game.submitWord(alice, 'REVEAL');
        expect(game.getState().match.revealedPlayerIds).toContain(alice);
      });
    });

    it('player can ready after revealing', async () => {
      await withFakeTimers(() => {
        const { game, alice } = setupThreePlayerGame();
        game.startRound(1000);

        game.submitWord(alice, 'REVEAL');
        const result = game.submitWord(alice, 'READY');
        expect(result.ok).toBe(true);
        expect(game.getState().match.readyPlayerIds).toContain(alice);
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
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        const state = game.getState();
        expect(state.match.state).toBe('submitting');
        expect(state.match.cluePhase).toBe(1);
      });
    });

    it('exactly one player gets undercover role', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);

          const roles = [alice, bob, charlie].map(pid =>
            game.submitWord(pid, 'REVEAL').role
          );
          expect(roles.filter(r => r === 'undercover')).toHaveLength(1);
          expect(roles.filter(r => r === 'civilian')).toHaveLength(2);
        })
      );
    });
  });

  describe('clue wave 1', () => {
    it('any player can submit without waiting for turns', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        expect(game.submitWord(bob, 'apple').ok).toBe(true);
        expect(game.submitWord(alice, 'alpha').ok).toBe(true);
        expect(game.submitWord(charlie, 'cherry').ok).toBe(true);
      });
    });

    it('tracks submitted players during the wave', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        game.submitWord(bob, 'apple');
        const state = game.getState();
        expect(state.match.submittedPlayerIds).toEqual([bob]);
        expect(state.match.cluePhase).toBe(1);
      });
    });

    it('rejects empty clues', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        const result = game.submitWord(alice, '   ');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('empty');
      });
    });

    it('rejects a second submission in the same wave', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        game.submitWord(alice, 'alpha');
        const result = game.submitWord(alice, 'beta');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('already_submitted');
      });
    });

    it('allows duplicate clues during wave 1', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        expect(game.submitWord(bob, 'apple').ok).toBe(true);
        expect(game.submitWord(charlie, 'apple').ok).toBe(true);
      });
    });

    it('stays in wave 1 until everyone has submitted', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        game.submitWord(alice, 'alpha');
        game.submitWord(bob, 'apple');

        const state = game.getState();
        expect(state.match.state).toBe('submitting');
        expect(state.match.cluePhase).toBe(1);
        expect(state.match.firstClues).toEqual([]);
        void charlie;
      });
    });

    it('transitions to wave 2 when all players submitted', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        submitWaveAll(game, [alice, bob, charlie], (i) => `w${i}`);

        const state = game.getState();
        expect(state.match.state).toBe('submitting');
        expect(state.match.cluePhase).toBe(2);
        expect(state.match.submittedPlayerIds).toEqual([]);
      });
    });

    it('exposes anonymous civilian first clues to the agent in wave 2', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          game.submitWord(alice, 'alphaword');
          game.submitWord(bob, 'apple');
          game.submitWord(charlie, 'cherry');

          const state = game.getState();
          expect(state.match.firstClues.slice().sort()).toEqual(['apple', 'cherry']);
        })
      );
    });

    it('civilian submitting the secret word in wave 1 ends the round immediately', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const word = game.getState().match.word!;
          const result = game.submitWord(bob, word);

          expect(result.ok).toBe(true);
          const state = game.getState();
          expect(state.match.state).toBe('idle');
          expect(state.match.finishReason).toBe('civilian_revealed_word');
          expect(state.match.winnerIsUndercover).toBe(true);
          expect(state.match.scores[alice]).toBe(2);
          void charlie;
        })
      );
    });

    it('agent submitting the secret word in wave 1 ends the round immediately', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          const word = game.getState().match.word!;
          const result = game.submitWord(alice, word);

          expect(result.ok).toBe(true);
          const state = game.getState();
          expect(state.match.state).toBe('idle');
          expect(state.match.finishReason).toBe('agent_found_word');
          expect(state.match.scores[alice]).toBe(2);
          void bob;
          void charlie;
        })
      );
    });
  });

  describe('clue wave 2', () => {
    it('allows the same wave-2 word from two different players', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        advanceToWaveTwo(game, [alice, bob, charlie]);

        expect(game.submitWord(bob, 'apple').ok).toBe(true);
        expect(game.submitWord(charlie, 'Apple').ok).toBe(true);
      });
    });

    it('rejects a player resubmitting their own wave-1 word', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        advanceToWaveTwo(game, [alice, bob, charlie]);

        const result = game.submitWord(alice, 'first0');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('duplicate_first_clue');
      });
    });

    it('rejects the agent submitting a shown civilian first clue', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToWaveTwo(game, [alice, bob, charlie]);

          const result = game.submitWord(alice, 'first1');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('duplicate_first_clue');
        })
      );
    });

    it('allows the agent to submit a fresh non-duplicate wave-2 word', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToWaveTwo(game, [alice, bob, charlie]);

          const result = game.submitWord(alice, 'alicefirst');
          expect(result.ok).toBe(true);
          void bob;
          void charlie;
        })
      );
    });

    it('allows a wave-2 clue matching another player discarded wave-1 clue', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          game.submitWord(alice, 'alpha');
          game.submitWord(bob, 'apple');
          game.submitWord(charlie, 'cherry');

          expect(game.submitWord(charlie, 'apple').ok).toBe(true);
          expect(game.submitWord(bob, 'grape').ok).toBe(true);
          expect(game.submitWord(alice, 'zebra').ok).toBe(true);
          expect(game.getState().match.state).toBe('voting');
        })
      );
    });

    it('civilian submitting the secret word ends the round immediately', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToWaveTwo(game, [alice, bob, charlie]);

          const word = game.getState().match.word!;
          const result = game.submitWord(bob, word);

          expect(result.ok).toBe(true);
          const state = game.getState();
          expect(state.match.finishReason).toBe('civilian_revealed_word');
          expect(state.match.winnerIsUndercover).toBe(true);
          expect(state.match.scores[alice]).toBe(2);
          void charlie;
        })
      );
    });

    it('agent submitting the secret word ends the round immediately', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToWaveTwo(game, [alice, bob, charlie]);

          const word = game.getState().match.word!;
          const result = game.submitWord(alice, word);

          expect(result.ok).toBe(true);
          const state = game.getState();
          expect(state.match.finishReason).toBe('agent_found_word');
          expect(state.match.scores[alice]).toBe(2);
          void bob;
          void charlie;
        })
      );
    });

    it('builds displayed clues and transitions to voting when all submitted', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToWaveTwo(game, [alice, bob, charlie]);

          submitWaveAll(game, [alice, bob, charlie], (i) => `second${i}`);

          const state = game.getState();
          expect(state.match.state).toBe('voting');
          expect(state.match.firstClues).toEqual([]);
          for (const sub of state.match.submissions) {
            expect(sub.displayedClue).toBeTruthy();
            expect(sub.clues).toContain(sub.displayedClue);
          }
        })
      );
    });

    it('displays a random one of each civilian clue pair', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToWaveTwo(game, [alice, bob, charlie]);
          submitWaveAll(game, [alice, bob, charlie], (i) => `second${i}`);

          const state = game.getState();
          const bobSubmission = state.match.submissions.find(s => s.playerId === bob)!;
          expect(bobSubmission.clues).toEqual(['first1', 'second1']);
          expect(bobSubmission.displayedClue).toBe('first1');
          void alice;
          void charlie;
        })
      );
    });

    it('always displays the agent second clue', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToWaveTwo(game, [alice, bob, charlie]);
          submitWaveAll(game, [alice, bob, charlie], (i) => `second${i}`);

          const state = game.getState();
          const agentSubmission = state.match.submissions.find(s => s.playerId === alice)!;
          expect(agentSubmission.clues).toEqual(['second0']);
          expect(agentSubmission.displayedClue).toBe('second0');
          void bob;
          void charlie;
        })
      );
    });

    it('avoids displaying duplicate words when two civilians share a first clue', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          game.submitWord(alice, 'alpha');
          game.submitWord(bob, 'apple');
          game.submitWord(charlie, 'apple');

          game.submitWord(alice, 'delta');
          game.submitWord(bob, 'bravo');
          game.submitWord(charlie, 'charlie');

          const state = game.getState();
          expect(state.match.state).toBe('voting');
          const bobSub = state.match.submissions.find(s => s.playerId === bob)!;
          const charlieSub = state.match.submissions.find(s => s.playerId === charlie)!;

          expect(bobSub.displayedClue).not.toBe(charlieSub.displayedClue);
          const displayed = [
            bobSub.displayedClue,
            charlieSub.displayedClue,
            state.match.submissions.find(s => s.playerId === alice)!.displayedClue,
          ];
          expect(new Set(displayed).size).toBe(3);
        })
      );
    });

    it('avoids any civilian displayed clue duplicating the agent second clue', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0.75, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          game.submitWord(alice, 'alpha');
          game.submitWord(bob, 'bravo');
          game.submitWord(charlie, 'charlie');

          game.submitWord(alice, 'apple');
          game.submitWord(bob, 'apple');
          game.submitWord(charlie, 'apple');

          const state = game.getState();
          expect(state.match.state).toBe('voting');

          const agentSub = state.match.submissions.find(
            s => s.playerId === state.match.undercoverPlayerId
          )!;
          const civilians = state.match.submissions.filter(
            s => s.playerId !== state.match.undercoverPlayerId
          );

          expect(agentSub.displayedClue).toBeTruthy();
          for (const civ of civilians) {
            expect(civ.displayedClue).not.toBe(agentSub.displayedClue);
          }
        })
      );
    });

    it("avoids displaying duplicate words when one civilian's second clue duplicates another's first", async () => {      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          game.submitWord(alice, 'alpha');
          game.submitWord(bob, 'apple');
          game.submitWord(charlie, 'charlie');

          game.submitWord(alice, 'delta');
          game.submitWord(bob, 'bravo');
          game.submitWord(charlie, 'apple');

          const state = game.getState();
          expect(state.match.state).toBe('voting');
          const bobSub = state.match.submissions.find(s => s.playerId === bob)!;
          const charlieSub = state.match.submissions.find(s => s.playerId === charlie)!;

          expect(bobSub.displayedClue).not.toBe(charlieSub.displayedClue);
          const displayed = [
            bobSub.displayedClue,
            charlieSub.displayedClue,
            state.match.submissions.find(s => s.playerId === alice)!.displayedClue,
          ];
          expect(new Set(displayed).size).toBe(3);
        })
      );
    });

    it('keeps the random baseline when it is already duplicate-free', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          game.submitWord(alice, 'alpha');
          game.submitWord(bob, 'bravo');
          game.submitWord(charlie, 'charlie');

          game.submitWord(alice, 'delta');
          game.submitWord(bob, 'bignew');
          game.submitWord(charlie, 'cnew');

          const state = game.getState();
          const bobSub = state.match.submissions.find(s => s.playerId === bob)!;
          const charlieSub = state.match.submissions.find(s => s.playerId === charlie)!;

          expect(bobSub.displayedClue).toBe('bravo');
          expect(charlieSub.displayedClue).toBe('charlie');
        })
      );
    });

    it('flips the fewest civilians needed to clear a duplicate', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          revealAndReadyAll(game, [alice, bob, charlie]);

          game.submitWord(alice, 'alpha');
          game.submitWord(bob, 'apple');
          game.submitWord(charlie, 'apple');

          game.submitWord(alice, 'delta');
          game.submitWord(bob, 'bravo');
          game.submitWord(charlie, 'charlie');

          const state = game.getState();
          const bobSub = state.match.submissions.find(s => s.playerId === bob)!;
          const charlieSub = state.match.submissions.find(s => s.playerId === charlie)!;

          const flippedToSecond = [bobSub, charlieSub].filter(
            sub => sub.displayedClue === sub.clues[1]
          ).length;
          expect(flippedToSecond).toBe(1);
        })
      );
    });
  });

  describe('voting phase', () => {
    it('records votes from players', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        advanceToVoting(game, [alice, bob, charlie]);

        game.submitVotes(bob, { targetPlayerId: alice });
        const state = game.getState();
        expect(state.match.votedPlayerIds).toContain(bob);
        expect(state.match.currentVoteRound).toBe(1);
        void charlie;
      });
    });

    it('cannot vote for self', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        advanceToVoting(game, [alice, bob, charlie]);

        const result = game.submitVotes(alice, { targetPlayerId: alice });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('cannot_vote_self');
        void bob;
        void charlie;
      });
    });

    it('cannot vote for a non-participant', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        advanceToVoting(game, [alice, bob, charlie]);

        const result = game.submitVotes(alice, { targetPlayerId: 'fake-id' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('invalid_target');
        void bob;
        void charlie;
      });
    });

    it('cannot vote twice', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        advanceToVoting(game, [alice, bob, charlie]);

        game.submitVotes(bob, { targetPlayerId: alice });
        const result = game.submitVotes(bob, { targetPlayerId: charlie });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('already_voted');
        void charlie;
      });
    });

    it('cannot vote when not in voting phase', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob } = setupThreePlayerGame();
        game.startRound(1000);

        const result = game.submitVotes(alice, { targetPlayerId: bob });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('not_voting');
      });
    });

    it('tie triggers a re-vote', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        advanceToVoting(game, [alice, bob, charlie]);

        game.submitVotes(alice, { targetPlayerId: bob });
        game.submitVotes(bob, { targetPlayerId: charlie });
        game.submitVotes(charlie, { targetPlayerId: alice });

        const state = game.getState();
        expect(state.match.state).toBe('voting');
        expect(state.match.currentVoteRound).toBe(2);
        expect(state.match.voteRounds.length).toBe(1);
        expect(state.match.voteRounds[0].isTie).toBe(true);
        expect(state.match.voteRounds[0].targetPlayerId).toBeNull();
      });
    });

    it('broadcasts the new vote round when the last vote creates a tie', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;
        const notifySpy = vi.fn();
        const game = createGame({ playerStore: store, onStateChange: notifySpy });

        game.startRound(1000);
        advanceToVoting(game, [alice, bob, charlie]);

        const beforeVotes = notifySpy.mock.calls.length;
        game.submitVotes(alice, { targetPlayerId: bob });
        game.submitVotes(bob, { targetPlayerId: charlie });
        game.submitVotes(charlie, { targetPlayerId: alice });

        expect(notifySpy.mock.calls.length).toBeGreaterThan(beforeVotes + 2);
      });
    });

    it('majority vote for undercover agent transitions to guessing', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToVoting(game, [alice, bob, charlie]);

          voteAllFor(game, alice);

          const state = game.getState();
          expect(state.match.state).toBe('guessing');
          expect(state.match.undercoverPlayerId).toBe(alice);
          void bob;
          void charlie;
        })
      );
    });

    it('majority vote for civilian results in agent getting 3 points', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToVoting(game, [alice, bob, charlie]);

          voteAllFor(game, bob);

          const state = game.getState();
          expect(state.match.scores[alice]).toBe(3);
          expect(state.match.scores[bob]).toBe(1);
          expect(state.match.finishReason).toBe('wrong_vote');
          void charlie;
        })
      );
    });
  });

  describe('guessing phase', () => {
    it('non-agent cannot guess', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToGuessing(game, [alice, bob, charlie]);

          const result = game.submitWord(bob, 'whatever');
          expect(result.ok).toBe(false);
          expect(result.reason).toBe('not_undercover');
          void charlie;
        })
      );
    });

    it('correct final guess scores agent and voters', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToVoting(game, [alice, bob, charlie]);
          const word = game.getState().match.word!;
          voteAllFor(game, alice);

          expect(game.getState().match.state).toBe('guessing');
          const result = game.submitWord(alice, word);
          expect(result.ok).toBe(true);

          const state = game.getState();
          expect(state.match.finishReason).toBe('agent_final_guess_correct');
          expect(state.match.winnerIsUndercover).toBe(true);
          expect(state.match.scores[alice]).toBe(1);
          expect(state.match.scores[bob]).toBe(1);
          expect(state.match.scores[charlie]).toBe(1);
        })
      );
    });

    it('wrong final guess scores civilians including correct voters', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.startRound(1000);
          advanceToGuessing(game, [alice, bob, charlie]);

          const result = game.submitWord(alice, 'nottheword');
          expect(result.ok).toBe(true);

          const state = game.getState();
          expect(state.match.finishReason).toBe('agent_final_guess_wrong');
          expect(state.match.winnerIsUndercover).toBe(false);
          expect(state.match.scores[bob]).toBe(2);
          expect(state.match.scores[charlie]).toBe(2);
          expect(state.match.scores[alice]).toBe(0);
        })
      );
    });
  });

  describe('game end', () => {
    it('first player to reach the winning score wins the game', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const { game, alice, bob, charlie } = setupThreePlayerGame();
          game.updateSettings({ winningScore: 1 });
          game.startRound(1000);
          advanceToVoting(game, [alice, bob, charlie]);

          voteAllFor(game, bob);

          const state = game.getState();
          expect(state.match.state).toBe('finished');
          expect(state.match.winnerIds).toEqual([alice]);
          expect(state.match.winnerNames).toEqual(['Alice']);
          void charlie;
        })
      );
    });

    it('admin can end active game early', async () => {
      await withFakeTimers(() => {
        const { game } = setupThreePlayerGame();
        game.startRound(1000);

        expect(game.getState().match.state).toBe('reveal');

        const result = game.endGame();
        expect(result.ok).toBe(true);
        expect(game.getState().match.state).toBe('idle');
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
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        revealAndReadyAll(game, [alice, bob, charlie]);

        expect(game.getState().match.state).toBe('submitting');

        const result = game.endGame();
        expect(result.ok).toBe(true);
        expect(game.getState().match.state).toBe('idle');
      });
    });

    it('can end game during voting phase', async () => {
      await withFakeTimers(() => {
        const { game, alice, bob, charlie } = setupThreePlayerGame();
        game.startRound(1000);
        advanceToVoting(game, [alice, bob, charlie]);

        expect(game.getState().match.state).toBe('voting');

        const result = game.endGame();
        expect(result.ok).toBe(true);
        expect(game.getState().match.state).toBe('idle');
      });
    });
  });

  describe('used words persistence', () => {
    it('persists used words across game instances via session store', async () => {
      await withFakeTimers(() =>
        withStubbedRandom(0, () => {
          const store = createPlayerStore();
          const sessionStore = createSessionStore();
          const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
          const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
          const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

          const game1 = createGame({ playerStore: store, sessionStore });
          game1.startRound(1000);
          const firstWord = game1.getState().match.word!;
          game1.endGame();

          const game2 = createGame({ playerStore: store, sessionStore });
          game2.startRound(1000);
          const secondWord = game2.getState().match.word!;

          expect(secondWord).not.toBe(firstWord);
          void bob;
          void charlie;
        })
      );
    });
  });
});
