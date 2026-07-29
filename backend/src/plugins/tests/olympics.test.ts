import { describe, it, expect } from 'vitest';
import { createPlayerStore } from '../../shared/stores/player-store.js';
import { withFakeTimers } from '../../shared/tests/helpers.js';
import { awardMedals, mergeMedalTallies } from '@lancade/shared';
import type { BaseGame } from '../types.js';
import type { SessionStore } from '../../shared/stores/session-store.js';
import { plugin as mindMatchPlugin } from '../../mindMatch/plugin.js';
import { plugin as flwPlugin } from '../../fiveLetterWord/plugin.js';
import { plugin as quickFirePlugin } from '../../quickFire/plugin.js';
import { plugin as lastWordPlugin } from '../../lastWordStanding/plugin.js';
import { plugin as undercoverPlugin } from '../../undercoverAgent/plugin.js';
import { plugin as tradingPlugin } from '../../tradingExchange/plugin.js';

function createMockSessionStore(): SessionStore {
  const data = new Map<string, unknown>();
  return {
    get: <T>(key: string) => data.get(key) as T | undefined,
    set: <T>(key: string, value: T) => { data.set(key, value); },
    keys: () => Array.from(data.keys()),
  };
}

interface FactoryOptions {
  clientGraceMs: number;
  onStateChange: () => void;
  playerStore: ReturnType<typeof createPlayerStore>;
  sessionStore: SessionStore;
}

function createBaseOptions(): FactoryOptions {
  return {
    clientGraceMs: 5000,
    onStateChange: () => {},
    playerStore: createPlayerStore(),
    sessionStore: createMockSessionStore(),
  };
}

describe('awardMedals edge cases', () => {
  it('awardMedals and mergeMedalTallies work end-to-end', () => {
    const game1 = awardMedals([['Alice'], ['Bob'], ['Charlie']], 3);
    // game2: Bob wins gold (1st), Charlie silver (2nd)
    const game2 = awardMedals([['Bob'], ['Charlie']], 2);
    const merged = mergeMedalTallies(game1, game2);
    expect(merged.Alice).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    // Bob: gold from game2 + silver from game1
    expect(merged.Bob).toEqual({ gold: 1, silver: 1, bronze: 0, total: 2 });
    // Charlie: silver from game2 + bronze from game1
    expect(merged.Charlie).toEqual({ gold: 0, silver: 1, bronze: 1, total: 2 });
  });

  it('accumulates across multiple games for the same player', () => {
    const g1 = awardMedals([['Alice'], ['Bob']], 2);
    const g2 = awardMedals([['Alice']], 3);
    const g3 = awardMedals([['Alice'], ['Bob'], ['Charlie']], 3);
    const merged = mergeMedalTallies(g1, g2, g3);
    expect(merged.Alice).toEqual({ gold: 3, silver: 0, bronze: 0, total: 3 });
    expect(merged.Bob).toEqual({ gold: 0, silver: 2, bronze: 0, total: 2 });
    expect(merged.Charlie).toEqual({ gold: 0, silver: 0, bronze: 1, total: 1 });
  });
});

describe('MindMatch olympics', () => {
  it('getOlympicsResult returns null before finish', async () => {
    await withFakeTimers(() => {
      const opts = createBaseOptions();
      const game: BaseGame = mindMatchPlugin.definition.factory(opts);
      expect(game.getOlympicsResult?.()).toBeNull();
    });
  });

  it('getOlympicsResult returns podium with gold for top scorers', async () => {
    await withFakeTimers(() => {
      const opts = createBaseOptions();
      const store = opts.playerStore;
      const game: BaseGame = mindMatchPlugin.definition.factory(opts);

      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
      const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

      game.updateSettings?.({ winningScore: 10 });
      for (let i = 0; i < 4; i++) {
        game.startRound(1000);
        game.submitWord(alice, 'match');
        game.submitWord(bob, 'match');
        game.submitWord(charlie, 'other');
      }

      const result = game.getOlympicsResult?.();
      expect(result).not.toBeNull();
      expect(result!.podium[0]).toEqual(['Alice', 'Bob']);
      expect(result!.playerCount).toBe(3);
    });
  });

  it('includes zero-score players in olympics', async () => {
    await withFakeTimers(() => {
      const opts = createBaseOptions();
      const store = opts.playerStore;
      const game: BaseGame = mindMatchPlugin.definition.factory(opts);

      const alice = store.joinPlayer({ name: 'Alice' }).playerId!;
      const bob = store.joinPlayer({ name: 'Bob' }).playerId!;
      const charlie = store.joinPlayer({ name: 'Charlie' }).playerId!;

      game.updateSettings?.({ winningScore: 10 });
      // Alice and Bob match (3 pts), Charlie is unique (0 pts)
      for (let i = 0; i < 4; i++) {
        game.startRound(1000);
        game.submitWord(alice, 'match');
        game.submitWord(bob, 'match');
        game.submitWord(charlie, 'unique');
      }

      const result = game.getOlympicsResult?.();
      expect(result).not.toBeNull();
      expect(result!.playerCount).toBe(3);
      expect(result!.podium[0]).toEqual(['Alice', 'Bob']);
      expect(result!.podium[1]).toEqual(['Charlie']);
    });
  });
});

describe('FiveLetterWord olympics', () => {
  it('getOlympicsResult returns null before finished', async () => {
    await withFakeTimers(() => {
      const opts = createBaseOptions();
      opts.playerStore.joinPlayer({ name: 'Alice' });
      const game: BaseGame = flwPlugin.definition.factory(opts);
      game.startRound(60000);
      expect(game.getOlympicsResult?.()).toBeNull();
    });
  });
});

describe('QuickFire olympics', () => {
  it('getOlympicsResult returns null before results', () => {
    const opts = createBaseOptions();
    const game: BaseGame = quickFirePlugin.definition.factory(opts);
    expect(game.getOlympicsResult?.()).toBeNull();
  });
});

describe('LastWordStanding olympics', () => {
  it('getOlympicsResult returns null before finished', async () => {
    await withFakeTimers(() => {
      const opts = createBaseOptions();
      const game: BaseGame = lastWordPlugin.definition.factory(opts);
      expect(game.getOlympicsResult?.()).toBeNull();
    });
  });
});

describe('UndercoverAgent olympics', () => {
  it('getOlympicsResult returns null before finish', async () => {
    await withFakeTimers(() => {
      const opts = createBaseOptions();
      const game: BaseGame = undercoverPlugin.definition.factory(opts);
      expect(game.getOlympicsResult?.()).toBeNull();
    });
  });
});

describe('TradingExchange olympics', () => {
  it('getOlympicsResult returns null before finish', async () => {
    await withFakeTimers(() => {
      const opts = createBaseOptions();
      const game: BaseGame = tradingPlugin.definition.factory(opts);
      expect(game.getOlympicsResult?.()).toBeNull();
    });
  });
});
