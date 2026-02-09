import { describe, it, expect } from 'vitest';
import { gameRegistry } from '../games.js';

describe('Game Plugins', () => {
  it('should have all games registered', () => {
    const registeredIds = gameRegistry.getAllRegisteredIds();
    expect(registeredIds).toContain('categoryclash1');
    expect(registeredIds).toContain('categoryclash2');
    expect(registeredIds).toContain('wordrush');
  });

  it('should have correct metadata for categoryclash1', () => {
    // Enable the game first
    gameRegistry.setEnabledGames(['categoryclash1']);
    const game = gameRegistry.getGame('categoryclash1');
    
    expect(game).toBeDefined();
    expect(game!.id).toBe('categoryclash1');
    expect(game!.name).toBe('Category Clash v1.0');
    expect(typeof game!.factory).toBe('function');
  });

  it('should have correct metadata for categoryclash2', () => {
    gameRegistry.setEnabledGames(['categoryclash2']);
    const game = gameRegistry.getGame('categoryclash2');
    
    expect(game).toBeDefined();
    expect(game!.id).toBe('categoryclash2');
    expect(game!.name).toBe('Category Clash v2.0');
    expect(typeof game!.factory).toBe('function');
  });

  it('should have correct metadata for wordrush', () => {
    gameRegistry.setEnabledGames(['wordrush']);
    const game = gameRegistry.getGame('wordrush');
    
    expect(game).toBeDefined();
    expect(game!.id).toBe('wordrush');
    expect(game!.name).toBe('WordRush');
    expect(typeof game!.factory).toBe('function');
  });

  it('should create working game instances', () => {
    gameRegistry.setEnabledGames(['categoryclash1', 'wordrush']);
    
    const categoryclash = gameRegistry.getGame('categoryclash1');
    const wordrush = gameRegistry.getGame('wordrush');
    
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
});
