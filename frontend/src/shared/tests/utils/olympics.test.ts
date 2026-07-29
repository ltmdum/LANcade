import { describe, it, expect } from 'vitest';
import { awardMedals, buildPodiumFromScores, mergeMedalTallies } from '@lancade/shared';

describe('buildPodiumFromScores', () => {
  it('returns empty podium for no scores', () => {
    const { podium, playerCount } = buildPodiumFromScores([]);
    expect(podium).toEqual([]);
    expect(playerCount).toBe(0);
  });

  it('includes players with score of 0', () => {
    const { podium, playerCount } = buildPodiumFromScores([
      ['Alice', 10],
      ['Bob', 0],
      ['Charlie', 5],
    ]);
    expect(playerCount).toBe(3);
    expect(podium).toEqual([['Alice'], ['Charlie'], ['Bob']]);
  });

  it('includes players with negative scores', () => {
    const { podium } = buildPodiumFromScores([
      ['Alice', 10],
      ['Bob', -3],
    ]);
    expect(podium).toEqual([['Alice'], ['Bob']]);
  });

  it('groups tied scores together', () => {
    const { podium } = buildPodiumFromScores([
      ['Alice', 10],
      ['Bob', 10],
      ['Charlie', 5],
    ]);
    expect(podium).toEqual([['Alice', 'Bob'], ['Charlie']]);
  });

  it('returns at most 3 groups', () => {
    const { podium } = buildPodiumFromScores([
      ['Alice', 30],
      ['Bob', 20],
      ['Charlie', 20],
      ['Dave', 10],
      ['Eve', 5],
    ]);
    expect(podium.length).toBe(3);
    expect(podium[0]).toEqual(['Alice']);
    expect(podium[1]).toEqual(['Bob', 'Charlie']);
    expect(podium[2]).toEqual(['Dave']);
  });

  it('handles single player', () => {
    const { podium, playerCount } = buildPodiumFromScores([['Alice', 10]]);
    expect(podium).toEqual([['Alice']]);
    expect(playerCount).toBe(1);
  });

  it('handles all tied scores', () => {
    const { podium } = buildPodiumFromScores([
      ['Alice', 5],
      ['Bob', 5],
      ['Charlie', 5],
    ]);
    expect(podium).toEqual([['Alice', 'Bob', 'Charlie']]);
  });
});

describe('awardMedals', () => {
  it('awards gold for 1 player', () => {
    const result = awardMedals([['Alice']], 1);
    expect(result).toEqual({ Alice: { gold: 1, silver: 0, bronze: 0, total: 1 } });
  });

  it('awards gold + silver for 2 players', () => {
    const result = awardMedals([['Alice'], ['Bob']], 2);
    expect(result).toEqual({
      Alice: { gold: 1, silver: 0, bronze: 0, total: 1 },
      Bob: { gold: 0, silver: 1, bronze: 0, total: 1 },
    });
  });

  it('awards gold + silver + bronze for 3 players', () => {
    const result = awardMedals([['Alice'], ['Bob'], ['Charlie']], 3);
    expect(result.Alice).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(result.Bob).toEqual({ gold: 0, silver: 1, bronze: 0, total: 1 });
    expect(result.Charlie).toEqual({ gold: 0, silver: 0, bronze: 1, total: 1 });
  });

  it('does not award silver with 1 player even if podium has 2 groups', () => {
    const result = awardMedals([['Alice'], ['Bob']], 1);
    expect(result.Alice).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(result.Bob).toBeUndefined();
  });

  it('does not award bronze with 2 players', () => {
    const result = awardMedals([['Alice'], ['Bob'], ['Charlie']], 2);
    expect(result.Alice).toBeDefined();
    expect(result.Bob).toBeDefined();
    expect(result.Charlie).toBeUndefined();
  });

  it('handles tied gold: both get gold, next gets bronze (no silver)', () => {
    const result = awardMedals([['Alice', 'Bob'], ['Charlie']], 3);
    expect(result.Alice).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(result.Bob).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(result.Charlie).toEqual({ gold: 0, silver: 0, bronze: 1, total: 1 });
  });

  it('handles tied silver: both get silver, no bronze', () => {
    const result = awardMedals([['Alice'], ['Bob', 'Charlie']], 3);
    expect(result.Alice).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(result.Bob).toEqual({ gold: 0, silver: 1, bronze: 0, total: 1 });
    expect(result.Charlie).toEqual({ gold: 0, silver: 1, bronze: 0, total: 1 });
  });

  it('handles three-way tie for gold: all get gold, no silver or bronze', () => {
    const result = awardMedals([['Alice', 'Bob', 'Charlie']], 3);
    expect(result.Alice).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(result.Bob).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(result.Charlie).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('handles 1-player session', () => {
    const result = awardMedals([['Alice']], 1);
    expect(result.Alice).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
  });

  it('handles 2-player session: only gold + silver', () => {
    const result = awardMedals([['Alice'], ['Bob']], 2);
    expect(result.Alice.gold).toBe(1);
    expect(result.Bob.silver).toBe(1);
    expect(result.Alice.total).toBe(1);
    expect(result.Bob.total).toBe(1);
  });

  it('podium with only 1 group: just gold', () => {
    const result = awardMedals([['Alice']], 3);
    expect(result).toEqual({ Alice: { gold: 1, silver: 0, bronze: 0, total: 1 } });
  });

  it('podium with only 2 groups: gold + silver, no bronze', () => {
    const result = awardMedals([['Alice'], ['Bob']], 3);
    expect(result.Alice.gold).toBe(1);
    expect(result.Bob.silver).toBe(1);
  });
});

describe('mergeMedalTallies', () => {
  it('merges empty tallies', () => {
    const result = mergeMedalTallies({}, {});
    expect(result).toEqual({});
  });

  it('combines medals for the same player', () => {
    const a = { Alice: { gold: 1, silver: 0, bronze: 0, total: 1 } };
    const b = { Alice: { gold: 0, silver: 1, bronze: 0, total: 1 } };
    const result = mergeMedalTallies(a, b);
    expect(result.Alice).toEqual({ gold: 1, silver: 1, bronze: 0, total: 2 });
  });

  it('combines medals for different players', () => {
    const a = { Alice: { gold: 1, silver: 0, bronze: 0, total: 1 } };
    const b = { Bob: { gold: 0, silver: 1, bronze: 0, total: 1 } };
    const result = mergeMedalTallies(a, b);
    expect(result.Alice).toEqual({ gold: 1, silver: 0, bronze: 0, total: 1 });
    expect(result.Bob).toEqual({ gold: 0, silver: 1, bronze: 0, total: 1 });
  });

  it('merges three tallies', () => {
    const a = { Alice: { gold: 1, silver: 0, bronze: 0, total: 1 } };
    const b = { Alice: { gold: 0, silver: 1, bronze: 0, total: 1 } };
    const c = { Alice: { gold: 0, silver: 0, bronze: 1, total: 1 } };
    const result = mergeMedalTallies(a, b, c);
    expect(result.Alice).toEqual({ gold: 1, silver: 1, bronze: 1, total: 3 });
  });
});
