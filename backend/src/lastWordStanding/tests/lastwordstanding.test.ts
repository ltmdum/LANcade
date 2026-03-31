import { describe, it, expect } from 'vitest';
import { createGame } from '../lastwordstanding.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers, withStubbedRandom, pickOtherLetter } from '../../shared/tests/helpers.js';

/**
 * Drive the game flow to eliminate a target player.
 * @param game WordRush game instance.
 * @param targetId Player to eliminate.
 * @param voterIds Voters who will reject the word.
 */
function eliminatePlayer(
  game: ReturnType<typeof createGame>,
  targetId: string,
  voterIds: string[]
): void {
  let state = game.getState();
  // Submit a word by current player (who should be targetId)
  const word = `${state.match.currentLetter}test`;
  game.submitWord(targetId, word);

  // Reject the word
  for (const voterId of voterIds) {
    game.submitVotes(voterId, 'reject');
  }

  // Last chance - submit another word and reject again
  state = game.getState();
  const lastChanceWord = `${state.match.currentLetter}last`;
  game.submitWord(targetId, lastChanceWord);

  for (const voterId of voterIds) {
    game.submitVotes(voterId, 'reject');
  }
}

describe('wordrush', () => {
  it('validates round start requirements', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      const game = createGame({ playerStore: store });
      const noPlayers = game.startRound(1000);
      expect(noPlayers.ok).toBe(false);
      expect(noPlayers.reason).toBe('no_players');

      store.joinPlayer({ name: 'Solo' });
      const invalidDuration = game.startRound(-10);
      expect(invalidDuration.ok).toBe(false);
      expect(invalidDuration.reason).toBe('invalid_duration');
    });
  });

  it('handles voting, last chance, and elimination', async () => {
    await withFakeTimers((_timers) =>
      withStubbedRandom(0, () => {
        const store = createPlayerStore();
        const alex = store.joinPlayer({ name: 'Alex' }).playerId!;
        const bri = store.joinPlayer({ name: 'Bri' }).playerId!;
        const cal = store.joinPlayer({ name: 'Cal' }).playerId!;

        const game = createGame({ playerStore: store });
        const start = game.startRound(5000);
        expect(start.ok).toBe(true);

        let state = game.getState();
        const currentId = state.match.currentPlayerId!;
        const otherIds = state.match.order.filter((id) => id !== currentId);

        const notTurn = game.submitWord(otherIds[0], 'Apple');
        expect(notTurn.ok).toBe(false);
        expect(notTurn.reason).toBe('not_turn');

        const badLetter = pickOtherLetter(state.match.currentLetter!);
        const invalid = game.submitWord(currentId, `${badLetter}est`);
        expect(invalid.ok).toBe(false);
        expect(invalid.reason).toBe('invalid_letter');

        const firstWord = `${state.match.currentLetter}pple`;
        const accepted = game.submitWord(currentId, firstWord);
        expect(accepted.ok).toBe(true);

        state = game.getState();
        expect(state.match.state).toBe('voting');

        const selfVote = game.submitVotes(currentId, 'accept');
        expect(selfVote.ok).toBe(false);
        expect(selfVote.reason).toBe('not_eligible');

        const rejectOne = game.submitVotes(otherIds[0], 'reject');
        const rejectTwo = game.submitVotes(otherIds[1], 'reject');
        expect(rejectOne.ok).toBe(true);
        expect(rejectTwo.ok).toBe(true);

        state = game.getState();
        expect(state.match.state).toBe('active');
        expect(state.match.lastChance).toBe(true);
        expect(state.match.currentPlayerId).toBe(currentId);

        const lastChanceWord = `${state.match.currentLetter}pricot`;
        const lastChanceResult = game.submitWord(currentId, lastChanceWord);
        expect(lastChanceResult.ok).toBe(true);

        game.submitVotes(otherIds[0], 'reject');
        game.submitVotes(otherIds[1], 'reject');

        state = game.getState();
        expect(state.match.eliminatedPlayerIds.includes(currentId)).toBe(true);
        expect(state.match.currentPlayerId).not.toBe(currentId);

        const duplicateAttempt = game.submitWord(state.match.currentPlayerId!, firstWord);
        expect(duplicateAttempt.ok).toBe(false);
        expect(duplicateAttempt.reason).toBe('duplicate');

        const invalidVote = game.submitVotes(state.match.currentPlayerId!, 'maybe');
        expect(invalidVote.ok).toBe(false);
        expect(invalidVote.reason).toBe('not_voting');

        const idSet = new Set([alex, bri, cal]);
        expect(idSet.has(currentId)).toBe(true);
      })
    );
  });

  it('accepts when majority votes accept', async () => {
    await withFakeTimers((_timers) =>
      withStubbedRandom(0, () => {
        const store = createPlayerStore();
        const first = store.joinPlayer({ name: 'First' }).playerId!;
        const second = store.joinPlayer({ name: 'Second' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(4000);

        let state = game.getState();
        const currentId = state.match.currentPlayerId!;
        const otherId = currentId === first ? second : first;
        const word = `${state.match.currentLetter}lpha`;

        const submit = game.submitWord(currentId, word);
        expect(submit.ok).toBe(true);

        const vote = game.submitVotes(otherId, 'accept');
        expect(vote.ok).toBe(true);

        state = game.getState();
        expect(state.match.state).toBe('active');
        expect(state.match.usedWords.length).toBe(1);
        expect(state.match.usedWords[0].word).toBe(word);
      })
    );
  });

  it('allows eliminated players to vote', async () => {
    await withFakeTimers((_timers) =>
      withStubbedRandom(0, () => {
        const store = createPlayerStore();
        const alex = store.joinPlayer({ name: 'Alex' }).playerId!;
        const bri = store.joinPlayer({ name: 'Bri' }).playerId!;
        const cal = store.joinPlayer({ name: 'Cal' }).playerId!;

        const game = createGame({ playerStore: store });
        game.startRound(5000);

        let state = game.getState();
        const firstPlayer = state.match.currentPlayerId!;
        const others = state.match.order.filter((id) => id !== firstPlayer);

        // Eliminate the first player
        eliminatePlayer(game, firstPlayer, others);

        state = game.getState();
        expect(state.match.eliminatedPlayerIds).toContain(firstPlayer);
        expect(state.match.state).toBe('active');

        // Now the second player submits a word
        const currentPlayer = state.match.currentPlayerId!;
        const activeOthers = state.match.order.filter(
          (id) => id !== currentPlayer && !state.match.eliminatedPlayerIds.includes(id)
        );

        const word = `${state.match.currentLetter}word`;
        game.submitWord(currentPlayer, word);

        state = game.getState();
        expect(state.match.state).toBe('voting');

        // The eliminated player should be able to vote
        const eliminatedVote = game.submitVotes(firstPlayer, 'accept');
        expect(eliminatedVote.ok).toBe(true);

        // The other active player also votes
        const activeVote = game.submitVotes(activeOthers[0], 'accept');
        expect(activeVote.ok).toBe(true);

        state = game.getState();
        expect(state.match.state).toBe('active');
        expect(state.match.usedWords.some((w) => w.word === word)).toBe(true);
      })
    );
  });

  it('auto-accepts word when vote timeout expires', async () => {
    await withFakeTimers((timers) =>
      withStubbedRandom(0, () => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alex' });
        store.joinPlayer({ name: 'Bri' });
        store.joinPlayer({ name: 'Cal' });

        const game = createGame({ playerStore: store });
        game.startRound(5000);

        let state = game.getState();
        const currentPlayer = state.match.currentPlayerId!;

        const word = `${state.match.currentLetter}word`;
        game.submitWord(currentPlayer, word);

        state = game.getState();
        expect(state.match.state).toBe('voting');
        expect(state.match.votes).not.toBeNull();
        expect(state.match.votes!.voteEndsAt).toBeDefined();

        // No one votes, advance time past the vote timeout
        timers.advance(6000);

        state = game.getState();
        // Word should be auto-accepted and game should move to next turn
        expect(state.match.state).toBe('active');
        expect(state.match.usedWords.some((w) => w.word === word)).toBe(true);
        expect(state.match.currentPlayerId).not.toBe(currentPlayer);
      })
    );
  });

  it('auto-accepts when partial votes and timeout expires', async () => {
    await withFakeTimers((timers) =>
      withStubbedRandom(0, () => {
        const store = createPlayerStore();
        const alex = store.joinPlayer({ name: 'Alex' }).playerId!;
        const bri = store.joinPlayer({ name: 'Bri' }).playerId!;
        store.joinPlayer({ name: 'Cal' });

        const game = createGame({ playerStore: store });
        game.startRound(5000);

        let state = game.getState();
        const currentPlayer = state.match.currentPlayerId!;
        const voters = [alex, bri].filter((id) => id !== currentPlayer);

        const word = `${state.match.currentLetter}word`;
        game.submitWord(currentPlayer, word);

        state = game.getState();
        expect(state.match.state).toBe('voting');

        // Only one person votes to reject
        game.submitVotes(voters[0], 'reject');

        // Advance time past the vote timeout
        timers.advance(6000);

        state = game.getState();
        // Since only 1 of 2 voters rejected (not majority), word is accepted
        expect(state.match.state).toBe('active');
        expect(state.match.usedWords.some((w) => w.word === word)).toBe(true);
      })
    );
  });

  it('ends an active match and transitions to idle', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alex' });
      store.joinPlayer({ name: 'Bri' });

      const game = createGame({ playerStore: store });
      const start = game.startRound(5000);
      expect(start.ok).toBe(true);

      let state = game.getState();
      expect(state.match.state).toBe('active');

      const result = game.endGame();
      expect(result.ok).toBe(true);

      state = game.getState();
      expect(state.match.state).toBe('idle');
    });
  });

  it('ends a voting match and transitions to idle', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alex' });
      store.joinPlayer({ name: 'Bri' });

      const game = createGame({ playerStore: store });
      game.startRound(5000);

      let state = game.getState();
      const currentPlayer = state.match.currentPlayerId!;
      const word = `${state.match.currentLetter}test`;
      game.submitWord(currentPlayer, word);

      state = game.getState();
      expect(state.match.state).toBe('voting');

      const result = game.endGame();
      expect(result.ok).toBe(true);

      state = game.getState();
      expect(state.match.state).toBe('idle');
    });
  });

  it('returns error when ending game that is already idle', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alex' });

      const game = createGame({ playerStore: store });

      const state = game.getState();
      expect(state.match.state).toBe('idle');

      const result = game.endGame();
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('not_active');
    });
  });

  it('does not include late joiner in match order or active players', async () => {
    await withFakeTimers((_timers) =>
      withStubbedRandom(0, () => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alex' });
        store.joinPlayer({ name: 'Bri' });

        const game = createGame({ playerStore: store });
        game.startRound(5000);

        // Late joiner joins after round has started
        const late = store.joinPlayer({ name: 'Late' }).playerId!;

        const state = game.getState();
        expect(state.match.state).toBe('active');
        expect(state.match.order).not.toContain(late);
        expect(state.match.activePlayerIds).not.toContain(late);
        // But the player IS in the global player list
        expect(state.players.some((p) => p.id === late)).toBe(true);
      })
    );
  });

  it('rejects vote from late-joining player', async () => {
    await withFakeTimers((_timers) =>
      withStubbedRandom(0, () => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alex' });
        store.joinPlayer({ name: 'Bri' });

        const game = createGame({ playerStore: store });
        game.startRound(5000);

        // Late joiner joins after round has started
        const late = store.joinPlayer({ name: 'Late' }).playerId!;

        // Current player submits a word to enter voting
        let state = game.getState();
        const currentPlayer = state.match.currentPlayerId!;
        const word = `${state.match.currentLetter}word`;
        game.submitWord(currentPlayer, word);

        state = game.getState();
        expect(state.match.state).toBe('voting');

        // Late joiner tries to vote
        const voteResult = game.submitVotes(late, 'accept');
        expect(voteResult.ok).toBe(false);
        expect(voteResult.reason).toBe('not_eligible');
      })
    );
  });

  it('allows adding a custom category before starting', async () => {
    await withFakeTimers((_timers) => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alice' });

      const game = createGame({ playerStore: store });

      const result = (game as unknown as { addCategory: (name: string) => { ok: boolean; category?: string; reason?: string } }).addCategory('My Custom');
      expect(result.ok).toBe(true);
      expect(result.category).toBe('My Custom');

      const state = game.getState();
      expect(state.settings.categories).toContain('My Custom');
      expect(state.settings.selectedCategory).toBe('My Custom');
    });
  });

  it('clears pending timers when ending game', async () => {
    await withFakeTimers((timers) => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alex' });
      store.joinPlayer({ name: 'Bri' });

      let changeCount = 0;
      const game = createGame({
        playerStore: store,
        onStateChange: () => { changeCount++; },
      });

      game.startRound(5000);
      const beforeEnd = changeCount;

      game.endGame();

      // Advancing time should not trigger any more state changes
      // because the turn timer should have been cleared
      timers.advance(10000);
      expect(changeCount).toBe(beforeEnd + 1); // Only the endGame change
    });
  });
});
