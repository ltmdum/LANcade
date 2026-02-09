import { describe, it, expect, beforeEach } from 'vitest';
import { gameRegistry } from '../registry.js';
import type { GamePlugin } from '../types.js';

/**
 * Build a mock plugin definition for tests.
 * @param id Game id.
 * @param name Game display name.
 * @returns Mock game plugin.
 */
function createMockPlugin(id: string, name: string): GamePlugin {
  return {
    definition: {
      id,
      name,
      factory: () => ({
        getState: () => ({}),
        joinPlayer: () => ({ ok: true, playerId: '123', name: 'Test' }),
        submitWord: () => ({ ok: true }),
        submitVotes: () => ({ ok: true }),
        startRound: () => ({ ok: true }),
      }),
    },
  };
}

describe('GameRegistry', () => {
  beforeEach(() => {
    gameRegistry.clear();
  });

  it('should register a game plugin', () => {
    const plugin = createMockPlugin('testgame', 'Test Game');
    gameRegistry.register(plugin);
    expect(gameRegistry.getAllRegisteredIds()).toContain('testgame');
  });

  it('should throw when registering duplicate game', () => {
    const plugin = createMockPlugin('testgame', 'Test Game');
    gameRegistry.register(plugin);
    expect(() => gameRegistry.register(plugin)).toThrow('already registered');
  });

  it('should enable games from config', () => {
    gameRegistry.register(createMockPlugin('game1', 'Game 1'));
    gameRegistry.register(createMockPlugin('game2', 'Game 2'));
    
    const invalidIds = gameRegistry.setEnabledGames(['game1']);
    
    expect(invalidIds).toHaveLength(0);
    expect(gameRegistry.isEnabled('game1')).toBe(true);
    expect(gameRegistry.isEnabled('game2')).toBe(false);
  });

  it('should return invalid game IDs', () => {
    gameRegistry.register(createMockPlugin('game1', 'Game 1'));
    
    const invalidIds = gameRegistry.setEnabledGames(['game1', 'nonexistent']);
    
    expect(invalidIds).toContain('nonexistent');
    expect(gameRegistry.isEnabled('game1')).toBe(true);
  });

  it('should get game only if enabled', () => {
    gameRegistry.register(createMockPlugin('game1', 'Game 1'));
    gameRegistry.setEnabledGames([]);
    
    expect(gameRegistry.getGame('game1')).toBeUndefined();
    
    gameRegistry.setEnabledGames(['game1']);
    expect(gameRegistry.getGame('game1')).toBeDefined();
  });

  it('should list enabled games', () => {
    gameRegistry.register(createMockPlugin('game1', 'Game 1'));
    gameRegistry.register(createMockPlugin('game2', 'Game 2'));
    gameRegistry.setEnabledGames(['game1', 'game2']);
    
    const list = gameRegistry.listEnabledGames();
    
    expect(list).toHaveLength(2);
    expect(list.map(g => g.id)).toContain('game1');
    expect(list.map(g => g.id)).toContain('game2');
  });

  it('should return default game ID', () => {
    gameRegistry.register(createMockPlugin('game1', 'Game 1'));
    gameRegistry.register(createMockPlugin('game2', 'Game 2'));
    gameRegistry.setEnabledGames(['game2', 'game1']);
    
    // Should return the first enabled game
    expect(gameRegistry.getDefaultGameId()).toBe('game2');
  });

  it('should return undefined when no games enabled', () => {
    gameRegistry.register(createMockPlugin('game1', 'Game 1'));
    gameRegistry.setEnabledGames([]);
    
    expect(gameRegistry.getDefaultGameId()).toBeUndefined();
  });
});
