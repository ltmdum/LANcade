import { describe, it, expect } from 'vitest';
import { createPlayerStore } from '../stores/player-store.js';

describe('player store', () => {
  it('requires a name', () => {
    const store = createPlayerStore();
    const result = store.joinPlayer({ name: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('name_required');
  });

  it('returns players sorted by name', () => {
    const store = createPlayerStore();
    const zoe = store.joinPlayer({ name: 'Zoe' });
    const alex = store.joinPlayer({ name: 'Alex' });
    expect(zoe.ok).toBe(true);
    expect(alex.ok).toBe(true);
    const list = store.listPlayers();
    expect(list.map((player) => player.name)).toEqual(['Alex', 'Zoe']);
  });

  it('keeps IDs and updates names', () => {
    const store = createPlayerStore();
    const result = store.joinPlayer({ name: 'Sam' });
    const renamed = store.joinPlayer({ name: 'Sammy', playerId: result.playerId });
    expect(result.playerId).toBe(renamed.playerId);
    expect(renamed.name).toBe('Sammy');
    expect(store.getPlayerName(result.playerId!)).toBe('Sammy');
  });

  it('prevents duplicate names (case-insensitive)', () => {
    const store = createPlayerStore();
    const first = store.joinPlayer({ name: 'Alex' });
    const second = store.joinPlayer({ name: 'alex' });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.error).toBe('name_taken');
  });

  it('removes a player', () => {
    const store = createPlayerStore();
    const result = store.joinPlayer({ name: 'Alex' });
    expect(result.ok).toBe(true);
    expect(store.hasPlayer(result.playerId!)).toBe(true);

    const removed = store.removePlayer(result.playerId!);
    expect(removed).toBe(true);
    expect(store.hasPlayer(result.playerId!)).toBe(false);
    expect(store.listPlayers()).toHaveLength(0);

    // Removing non-existent player returns false
    const removedAgain = store.removePlayer(result.playerId!);
    expect(removedAgain).toBe(false);
  });

  it('allows reusing a name after player is removed', () => {
    const store = createPlayerStore();
    const first = store.joinPlayer({ name: 'Alex' });
    expect(first.ok).toBe(true);

    store.removePlayer(first.playerId!);

    const second = store.joinPlayer({ name: 'Alex' });
    expect(second.ok).toBe(true);
    expect(second.playerId).not.toBe(first.playerId);
  });
});
