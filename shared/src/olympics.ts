export interface MedalCounts {
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export type MedalTally = Record<string, MedalCounts>;

/**
 * Player names keyed by their player ID for display.
 */
export interface PlayersById {
  [playerId: string]: string;
}

/**
 * Award medals from a podium.
 *
 * The podium is an array of groups, where each group contains tied player names.
 * Group 0 = 1st place, Group 1 = 2nd place, Group 2 = 3rd place.
 *
 * Tie rules (Olympic-style):
 *   - 2-way tie for 1st: gold to both, skip silver, bronze to 3rd-place group (if 3+ players)
 *   - 3+ tie for 1st: gold to all, no silver or bronze
 *   - 1 winner + tie for 2nd: gold to winner, silver to tied group, no bronze
 *   - 1 winner + 1 runner-up + tie for 3rd: gold/silver/bronze as normal
 *   - Player count < 2: no silver or bronze
 *   - Player count < 3: no bronze
 */
export function awardMedals(podium: string[][], playerCount: number): MedalTally {
  const tally: MedalTally = {};

  const goldGroup = podium[0];
  const silverGroup = podium[1];
  const bronzeGroup = podium[2];

  if (!goldGroup) return tally;

  // Gold always goes to group 0
  for (const name of goldGroup) {
    tally[name] = { gold: 1, silver: 0, bronze: 0, total: 1 };
  }

  const goldCount = goldGroup.length;

  if (goldCount >= 3) {
    // 3+ tied for 1st: no silver or bronze
    return tally;
  }

  if (goldCount === 2) {
    // 2 tied for 1st: skip silver, award bronze to 3rd-place group (if eligible)
    if (playerCount >= 3 && silverGroup) {
      for (const name of silverGroup) {
        if (!tally[name]) tally[name] = { gold: 0, silver: 0, bronze: 0, total: 0 };
        tally[name].bronze += 1;
        tally[name].total += 1;
      }
    }
    return tally;
  }

  // Exactly 1 winner
  if (playerCount >= 2 && silverGroup) {
    if (silverGroup.length >= 2) {
      // Tie for 2nd: silver to all, no bronze
      for (const name of silverGroup) {
        if (!tally[name]) tally[name] = { gold: 0, silver: 0, bronze: 0, total: 0 };
        tally[name].silver += 1;
        tally[name].total += 1;
      }
    } else {
      // Single silver
      for (const name of silverGroup) {
        if (!tally[name]) tally[name] = { gold: 0, silver: 0, bronze: 0, total: 0 };
        tally[name].silver += 1;
        tally[name].total += 1;
      }
      // Bronze to 3rd-place group (if eligible)
      if (playerCount >= 3 && bronzeGroup) {
        for (const name of bronzeGroup) {
          if (!tally[name]) tally[name] = { gold: 0, silver: 0, bronze: 0, total: 0 };
          tally[name].bronze += 1;
          tally[name].total += 1;
        }
      }
    }
  }

  return tally;
}

/**
 * Merge multiple medal tallies into a single cumulative tally.
 */
export function mergeMedalTallies(...tallies: MedalTally[]): MedalTally {
  const merged: MedalTally = {};
  for (const tally of tallies) {
    for (const [name, medals] of Object.entries(tally)) {
      if (!merged[name]) merged[name] = { gold: 0, silver: 0, bronze: 0, total: 0 };
      merged[name].gold += medals.gold;
      merged[name].silver += medals.silver;
      merged[name].bronze += medals.bronze;
      merged[name].total += medals.total;
    }
  }
  return merged;
}

/**
 * Build grouped podium from a list of [name, score] pairs.
 *
 * Ties (same score) are grouped together.
 * Returns at most 3 groups (gold/silver/bronze).
 */
export function buildPodiumFromScores(
  scored: [string, number][]
): { podium: string[][]; playerCount: number } {
  scored.sort((a, b) => b[1] - a[1]);

  const podium: string[][] = [];
  let currentGroup: string[] = [];
  let currentScore: number | null = null;

  for (const [name, score] of scored) {
    if (currentScore === null || score === currentScore) {
      currentGroup.push(name);
    } else {
      podium.push(currentGroup);
      if (podium.length >= 3) break;
      currentGroup = [name];
    }
    currentScore = score;
  }

  if (currentGroup.length > 0 && podium.length < 3) {
    podium.push(currentGroup);
  }

  return { podium, playerCount: scored.length };
}

/**
 * Return the medal emoji for a player given a grouped podium and player count.
 *
 * Uses awardMedals internally so Olympic tie rules are applied:
 *   - 2-way tie for 1st: gold to both, skip silver, bronze to 3rd-place group
 *   - 3+ tie for 1st: gold to all, no silver or bronze
 *   - 1 winner + tie for 2nd: gold to winner, silver to tied group, no bronze
 *
 * @param podium Grouped podium (max 3 groups).
 * @param playerCount Total number of scoring players (used for medal eligibility).
 * @param playerName Player name to look up.
 * @returns Medal emoji string or empty string.
 */
export function medalEmojiForPodium(podium: string[][], playerCount: number, playerName: string): string {
  const tally = awardMedals(podium, playerCount);
  const m = tally[playerName];
  if (!m) return '';
  if (m.gold > 0) return '🥇';
  if (m.silver > 0) return '🥈';
  if (m.bronze > 0) return '🥉';
  return '';
}
