import { describe, it, expect } from 'vitest';
import { gameRegistry } from '../games.js';
import { normalizeEntry, getEnabledGameIds } from '../config.js';

describe('Game Plugins', () => {
  it('should have all games registered', () => {
    const registeredIds = gameRegistry.getAllRegisteredIds();
    expect(registeredIds).toContain('quickfire');
    expect(registeredIds).toContain('multicat');
    expect(registeredIds).toContain('lastwordstanding');
  });

  it('should have correct metadata for quickfire', () => {
    // Enable the game first
    gameRegistry.setEnabledGames(['quickfire']);
    const game = gameRegistry.getGame('quickfire');
    
    expect(game).toBeDefined();
    expect(game!.id).toBe('quickfire');
    expect(game!.name).toBe('Category Clash: Quick Fire');
    expect(typeof game!.factory).toBe('function');
  });

  it('should have correct metadata for multicat', () => {
    gameRegistry.setEnabledGames(['multicat']);
    const game = gameRegistry.getGame('multicat');
    
    expect(game).toBeDefined();
    expect(game!.id).toBe('multicat');
    expect(game!.name).toBe('Category Clash: Multicat');
    expect(typeof game!.factory).toBe('function');
  });

  it('should have correct metadata for lastwordstanding', () => {
    gameRegistry.setEnabledGames(['lastwordstanding']);
    const game = gameRegistry.getGame('lastwordstanding');
    
    expect(game).toBeDefined();
    expect(game!.id).toBe('lastwordstanding');
    expect(game!.name).toBe('Last Word Standing');
    expect(typeof game!.factory).toBe('function');
  });

  it('should create working game instances', () => {
    gameRegistry.setEnabledGames(['quickfire', 'lastwordstanding']);
    
    const categoryclash = gameRegistry.getGame('quickfire');
    const wordrush = gameRegistry.getGame('lastwordstanding');
    
    const categoryclashInstance = categoryclash!.factory({
      clientGraceMs: 5000,
      onStateChange: () => {},
      playerStore: {
        joinPlayer: () => ({ ok: true, playerId: '123', name: 'Test' }),
        hasPlayer: () => false,
        getPlayerIds: () => [],
        getPlayerName: () => 'Test',
        listPlayers: () => [],
        removePlayer: () => {},
      },
    });
    
    const wordrushInstance = wordrush!.factory({
      clientGraceMs: 5000,
      onStateChange: () => {},
      playerStore: {
        joinPlayer: () => ({ ok: true, playerId: '123', name: 'Test' }),
        hasPlayer: () => false,
        getPlayerIds: () => [],
        getPlayerName: () => 'Test',
        listPlayers: () => [],
        removePlayer: () => {},
      },
    });
    
    expect(categoryclashInstance.getState).toBeDefined();
    expect(wordrushInstance.getState).toBeDefined();
  });

  describe('normalizeEntry', () => {
    it('accepts valid object with id only', () => {
      expect(normalizeEntry({ id: 'quickfire' })).toEqual({ id: 'quickfire' });
    });

    it('accepts valid object with id and displayName', () => {
      expect(normalizeEntry({ id: 'quickfire', displayName: 'Quick Fire' }))
        .toEqual({ id: 'quickfire', displayName: 'Quick Fire' });
    });

    it('rejects plain string', () => {
      expect(() => normalizeEntry('quickfire')).toThrow('must be an object');
    });

    it('rejects null', () => {
      expect(() => normalizeEntry(null)).toThrow('must be an object');
    });

    it('rejects missing id field', () => {
      expect(() => normalizeEntry({ displayName: 'Quick Fire' })).toThrow('missing or invalid "id"');
    });

    it('rejects non-string id field', () => {
      expect(() => normalizeEntry({ id: 123 })).toThrow('missing or invalid "id"');
    });
  });

  describe('getEnabledGameIds', () => {
    it('returns IDs from config', () => {
      const config = { games: [{ id: 'a' }, { id: 'b' }] };
      expect(getEnabledGameIds(config)).toEqual(['a', 'b']);
    });

    it('returns empty array for empty config', () => {
      const config = { games: [] };
      expect(getEnabledGameIds(config)).toEqual([]);
    });
  });
});
