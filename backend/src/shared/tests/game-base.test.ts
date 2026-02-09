import { describe, it, expect } from 'vitest';
import { createGameBase } from '../stores/game-base.js';
import { createPlayerStore } from '../stores/player-store.js';

describe('game base', () => {
  it('exposes shared state with players and settings', () => {
    const store = createPlayerStore();
    store.joinPlayer({ name: 'Mira' });
    const base = createGameBase({
      categories: ['One', 'Two'],
      playerStore: store,
    });
    const state = base.buildBaseState();
    expect(Array.isArray(state.players)).toBe(true);
    expect(state.players.length).toBe(1);
    expect(state.players[0].name).toBe('Mira');
    expect(state.settings.selectedCategory).toBe('One');
    expect(state.settings.categories.length).toBe(2);
    expect(state.serverTime).toBeTruthy();
  });
});
