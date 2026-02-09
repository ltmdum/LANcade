import { describe, it, expect } from 'vitest';
import { createGame } from '../wordsprint.js';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers } from '../../shared/tests/helpers.js';

/**
 * Create a test word set for predictable testing.
 * @returns Set of test words.
 */
function createTestWords(): Set<string> {
  return new Set(['APPLE', 'BERRY', 'CRANE', 'DELTA', 'EARTH', 'FLAME', 'GRAPE', 'HOUSE']);
}

/**
 * Create a test answer word list for predictable testing.
 * @returns Array of answer words.
 */
function createTestAnswers(): string[] {
  return ['APPLE', 'BERRY', 'CRANE', 'DELTA', 'EARTH', 'FLAME', 'GRAPE', 'HOUSE'];
}

describe('wordsprint', () => {
  describe('startRound', () => {
    it('fails when no players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        const result = game.startRound(0);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('no_players');
      });
    });

    it('starts successfully with players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        const result = game.startRound(0);
        expect(result.ok).toBe(true);
        expect(result.matchId).toBe(1);
        expect(game.getPhase()).toBe('active');
      });
    });

    it('fails when round already active', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        game.startRound(0);
        const result = game.startRound(0);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('round_active');
      });
    });

    it('initializes player states for all players', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        store.joinPlayer({ name: 'Bob' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        game.startRound(0);
        
        const state = game.getState();
        expect(state.match.playerStates.length).toBe(2);
        expect(state.match.playerStates[0].grid).toEqual([]);
        expect(state.match.playerStates[1].grid).toEqual([]);
      });
    });
  });

  describe('submitWord - single player', () => {
    it('accepts valid 5-letter word', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const player = store.joinPlayer({ name: 'Alice' });
        const words = createTestWords();
        const game = createGame({ playerStore: store, validWords: words });
        
        const originalRandom = Math.random;
        Math.random = () => 0;
        game.startRound(0);
        Math.random = originalRandom;
        
        const result = game.submitWord(player.playerId!, 'BERRY');
        expect(result.ok).toBe(true);
        expect(result.result).toBeDefined();
        
        const state = game.getState();
        const playerState = state.match.playerStates.find(s => s.playerId === player.playerId);
        expect(playerState?.grid.length).toBe(1);
      });
    });

    it('rejects word not in valid list', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const player = store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        game.startRound(0);
        const result = game.submitWord(player.playerId!, 'ZZZZZ');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('invalid_word');
      });
    });

    it('rejects word with wrong length', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const player = store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        game.startRound(0);
        const result = game.submitWord(player.playerId!, 'APP');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('invalid_length');
      });
    });

    it('wins when guessing correct word', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const player = store.joinPlayer({ name: 'Alice' });
        const words = new Set(['APPLE']);
        const answers = ['APPLE'];
        const game = createGame({ playerStore: store, validWords: words, answerWords: answers });
        game.startRound(0);
        
        const result = game.submitWord(player.playerId!, 'APPLE');
        expect(result.ok).toBe(true);
        expect(result.result?.correctCount).toBe(5);
        
        const state = game.getState();
        expect(state.match.state).toBe('finished');
        expect(state.match.winnerId).toBe(player.playerId);
      });
    });

    it('loses after 6 wrong guesses', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const player = store.joinPlayer({ name: 'Alice' });
        const words = new Set(['ALPHA', 'BRAVO', 'DELTA', 'HOTEL', 'KITES', 'RADIO', 'ZEBRA']);
        const answers = ['ALPHA', 'BRAVO', 'DELTA', 'HOTEL', 'KITES', 'RADIO', 'ZEBRA'];
        const game = createGame({ playerStore: store, validWords: words, answerWords: answers });
        
        const originalRandom = Math.random;
        Math.random = () => 0;
        game.startRound(0);
        Math.random = originalRandom;
        
        game.submitWord(player.playerId!, 'ZEBRA');
        game.submitWord(player.playerId!, 'BRAVO');
        game.submitWord(player.playerId!, 'DELTA');
        game.submitWord(player.playerId!, 'HOTEL');
        game.submitWord(player.playerId!, 'KITES');
        game.submitWord(player.playerId!, 'RADIO');
        
        const state = game.getState();
        expect(state.match.state).toBe('finished');
        expect(state.match.winnerId).toBeNull();
        expect(state.match.targetWord).toBe('ALPHA');
      });
    });

    it('rejects submissions after out of guesses', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        store.joinPlayer({ name: 'Bob' }); // Add Bob so game doesn't end when Alice runs out
        const words = new Set(['ALPHA', 'BRAVO', 'CRANE', 'DELTA', 'EARTH', 'FLAME', 'GRAPE']);
        const game = createGame({ playerStore: store, validWords: words, answerWords: ['ALPHA'] });
        
        const originalRandom = Math.random;
        Math.random = () => 0;
        game.startRound(0);
        Math.random = originalRandom;
        
        // Alice uses all 6 guesses without solving
        game.submitWord(alice, 'BRAVO');
        game.submitWord(alice, 'CRANE');
        game.submitWord(alice, 'DELTA');
        game.submitWord(alice, 'EARTH');
        game.submitWord(alice, 'FLAME');
        game.submitWord(alice, 'GRAPE');
        
        // Now Alice tries a 7th guess - should be rejected
        const result = game.submitWord(alice, 'BRAVO');
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('out_of_guesses');
      });
    });
  });

  describe('submitWord - multiplayer', () => {
    it('allows all players to submit independently', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        
        const originalRandom = Math.random;
        Math.random = () => 0;
        game.startRound(0);
        Math.random = originalRandom;
        
        const result1 = game.submitWord(alice, 'BERRY');
        const result2 = game.submitWord(bob, 'CRANE');
        
        expect(result1.ok).toBe(true);
        expect(result2.ok).toBe(true);
        
        const state = game.getState();
        const aliceState = state.match.playerStates.find(s => s.playerId === alice);
        const bobState = state.match.playerStates.find(s => s.playerId === bob);
        expect(aliceState?.grid.length).toBe(1);
        expect(bobState?.grid.length).toBe(1);
      });
    });

    it('first player to solve wins', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        const words = new Set(['APPLE', 'BERRY']);
        const game = createGame({ playerStore: store, validWords: words, answerWords: ['APPLE'] });
        
        game.startRound(0);
        
        // Bob guesses first but wrong
        game.submitWord(bob, 'BERRY');
        // Alice guesses and wins
        game.submitWord(alice, 'APPLE');
        
        const state = game.getState();
        expect(state.match.state).toBe('finished');
        expect(state.match.winnerId).toBe(alice);
      });
    });

    it('game ends when all players are done', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        
        const words = new Set(['ALPHA', 'BRAVO', 'CRANE', 'DELTA', 'EARTH', 'FLAME', 'GRAPE']);
        const game = createGame({ playerStore: store, validWords: words, answerWords: ['ALPHA'] });
        
        const originalRandom = Math.random;
        Math.random = () => 0;
        game.startRound(0);
        Math.random = originalRandom;
        
        // Alice uses all guesses
        game.submitWord(alice, 'BRAVO');
        game.submitWord(alice, 'CRANE');
        game.submitWord(alice, 'DELTA');
        game.submitWord(alice, 'EARTH');
        game.submitWord(alice, 'FLAME');
        game.submitWord(alice, 'GRAPE');
        
        // Game should still be active since Bob hasn't finished
        expect(game.getPhase()).toBe('active');
        
        // Bob uses all guesses
        game.submitWord(bob, 'BRAVO');
        game.submitWord(bob, 'CRANE');
        game.submitWord(bob, 'DELTA');
        game.submitWord(bob, 'EARTH');
        game.submitWord(bob, 'FLAME');
        game.submitWord(bob, 'GRAPE');
        
        const state = game.getState();
        expect(state.match.state).toBe('finished');
        expect(state.match.winnerId).toBeNull();
      });
    });
  });

  describe('rowBests', () => {
    it('computes best results for each row', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
        const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
        
        // Target APPLE
        // BERRY: E is present (1 yellow)
        // GRAPE: P and E are present (2 yellows), A is correct (1 green)
        const words = new Set(['APPLE', 'BERRY', 'GRAPE']);
        const game = createGame({ playerStore: store, validWords: words, answerWords: ['APPLE'] });
        
        game.startRound(0);
        
        // Both guess on row 0
        game.submitWord(alice, 'BERRY'); // E present = 1 yellow
        game.submitWord(bob, 'GRAPE');   // A correct, P present, E present = 1 green, 2 yellow
        
        const state = game.getState();
        expect(state.match.rowBests.length).toBe(1);
        expect(state.match.rowBests[0].greenCount).toBe(1);
        expect(state.match.rowBests[0].yellowCount).toBe(2);
      });
    });

    it('returns empty array when no guesses', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        game.startRound(0);
        
        const state = game.getState();
        expect(state.match.rowBests).toEqual([]);
      });
    });
  });

  describe('endGame', () => {
    it('ends active game', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        game.startRound(0);
        
        const result = game.endGame();
        expect(result.ok).toBe(true);
        expect(game.getPhase()).toBe('finished');
      });
    });

    it('fails when game not active', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        
        const result = game.endGame();
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('not_active');
      });
    });
  });

  describe('getState', () => {
    it('hides target word during active game', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        const game = createGame({ playerStore: store, validWords: createTestWords(), answerWords: createTestAnswers() });
        game.startRound(0);
        
        const state = game.getState();
        expect(state.match.targetWord).toBeNull();
      });
    });

    it('reveals target word when game finished', async () => {
      await withFakeTimers(() => {
        const store = createPlayerStore();
        store.joinPlayer({ name: 'Alice' });
        const words = new Set(['APPLE']);
        const answers = ['APPLE'];
        const game = createGame({ playerStore: store, validWords: words, answerWords: answers });
        
        const originalRandom = Math.random;
        Math.random = () => 0;
        game.startRound(0);
        Math.random = originalRandom;
        
        game.endGame();
        
        const state = game.getState();
        expect(state.match.targetWord).toBe('APPLE');
      });
    });
  });
});
