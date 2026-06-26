import { describe, it, expect } from 'vitest';
import { createGame } from '../gridlock.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers } from '../../shared/tests/helpers.js';

const SEED_WORD = 'NOTEBOOKS';

/**
 * Find an uppercase letter that does not appear in the grid tiles.
 * @param letters The available tiles.
 * @returns A letter that cannot be formed from the tiles.
 */
function absentLetter(letters: string[]): string {
  const present = new Set(letters);
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!present.has(letter)) {
      return letter;
    }
  }
  throw new Error('grid uses every letter');
}

describe('gridlock', () => {
  it('rejects words when no active round', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const game = createGame({ playerStore: store });
      const result = game.submitWord('player-1', 'NOTE');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('round_not_active');
    });
  });

  it('exposes nine jumbled tiles and no category during an active round', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      store.joinPlayer({ name: 'Alice' });
      const game = createGame({ playerStore: store, clientGraceMs: 0, gridOptions: { word: SEED_WORD } });
      game.startRound(2000);
      const state = game.getState();
      expect(state.round.letters).toHaveLength(9);
      expect(state.round.letter).toBeNull();
      expect(state.round.categories).toEqual([]);
      expect(state.settings.categories).toEqual([]);
    });
  });

  it('accepts words formable from the tiles and scores by length', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const game = createGame({ playerStore: store, clientGraceMs: 0, gridOptions: { word: SEED_WORD } });
      game.startRound(2000);
      const tiles = game.getState().round.letters!;

      const fourLetter = tiles.slice(0, 4).join('');
      const threeLetter = tiles.slice(4, 7).join('');
      expect(game.submitWord(alice, fourLetter).ok).toBe(true);
      expect(game.submitWord(alice, threeLetter).ok).toBe(true);

      const scores = game.getState().round.scoresByPlayer;
      expect(scores[alice]).toBe(fourLetter.length + threeLetter.length);
    });
  });

  it('rejects words using letters that are not on the grid', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const game = createGame({ playerStore: store, clientGraceMs: 0, gridOptions: { word: SEED_WORD } });
      game.startRound(2000);
      const tiles = game.getState().round.letters!;

      const result = game.submitWord(alice, absentLetter(tiles));
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('invalid_letters');
    });
  });

  it('rejects reusing a letter more times than it appears on the grid', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      // T appears once in NOTEBOOKS, so "TT" cannot be formed.
      const game = createGame({ playerStore: store, clientGraceMs: 0, gridOptions: { word: SEED_WORD } });
      game.startRound(2000);

      const result = game.submitWord(alice, 'TT');
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('invalid_letters');
    });
  });

  it('rejects a word already submitted by the same player', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const game = createGame({ playerStore: store, clientGraceMs: 0, gridOptions: { word: SEED_WORD } });
      game.startRound(2000);
      const word = game.getState().round.letters!.slice(0, 4).join('');

      expect(game.submitWord(alice, word).ok).toBe(true);
      const duplicate = game.submitWord(alice, word.toLowerCase());
      expect(duplicate.ok).toBe(false);
      expect(duplicate.reason).toBe('duplicate');
    });
  });

  it('rejects a word already submitted by another player', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
      const game = createGame({ playerStore: store, clientGraceMs: 0, gridOptions: { word: SEED_WORD } });
      game.startRound(2000);
      const word = game.getState().round.letters!.slice(0, 4).join('');

      expect(game.submitWord(alice, word).ok).toBe(true);
      const duplicate = game.submitWord(bob, word);
      expect(duplicate.ok).toBe(false);
      expect(duplicate.reason).toBe('duplicate');
      expect(duplicate.blockedByName).toBe('Alice');
    });
  });

  it('runs a full round with voting and length-based scoring', async () => {
    await withFakeTimers(() => {
      const store = createPlayerStore();
      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
      const game = createGame({ playerStore: store, clientGraceMs: 0, gridOptions: { word: SEED_WORD } });
      game.startRound(2000);
      const tiles = game.getState().round.letters!;

      const aliceWord = tiles.slice(0, 5).join('');
      const bobWord = tiles.slice(0, 4).join('');
      game.submitWord(alice, aliceWord);
      game.submitWord(bob, bobWord);

      const activeState = game.getState();
      game.finishRound(alice, activeState.round.id);
      game.finishRound(bob, activeState.round.id);
      expect(game.getState().round.state).toBe('voting');

      // Both vote out Alice's word.
      const aliceGroup = game.getState().round.wordsByPlayer.find((group) => group.playerId === alice)!;
      game.submitVotes(bob, [aliceGroup.words[0].id]);
      game.submitVotes(alice, []);

      const results = game.getState().round.resultsByPlayer!;
      expect(results[alice].finalScore).toBe(0);
      expect(results[alice].votedOut).toBe(1);
      expect(results[bob].finalScore).toBe(bobWord.length);
    });
  });
});
