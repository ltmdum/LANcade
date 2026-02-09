import crypto from 'crypto';
import type { PlayerInfo, JoinPlayerResult } from '@lancade/shared';

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
}

export interface JoinPlayerPayload {
  name?: string;
  playerId?: string;
}

export interface PlayerStore {
  listPlayers(): PlayerInfo[];
  getPlayerName(playerId: string): string;
  hasPlayer(playerId: string): boolean;
  getPlayerIds(): string[];
  joinPlayer(payload: JoinPlayerPayload): JoinPlayerResult;
  removePlayer(playerId: string): boolean;
}

/**
 * Create an in-memory player store for tracking joined players.
 * @returns Player store instance.
 */
export function createPlayerStore(): PlayerStore {
  const players = new Map<string, Player>();

  /**
   * List players sorted by name for display.
   * @returns Player info list.
   */
  function listPlayers(): PlayerInfo[] {
    return Array.from(players.values())
      .map((player) => ({ id: player.id, name: player.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get a player's name or a fallback string.
   * @param playerId Player identifier.
   * @returns Player name or "Unknown".
   */
  function getPlayerName(playerId: string): string {
    const player = players.get(playerId);
    return player ? player.name : 'Unknown';
  }

  /**
   * Check if a player is in the store.
   * @param playerId Player identifier.
   * @returns True when the player exists.
   */
  function hasPlayer(playerId: string): boolean {
    return players.has(playerId);
  }

  /**
   * Get all player IDs in the store.
   * @returns Array of player IDs.
   */
  function getPlayerIds(): string[] {
    return Array.from(players.keys());
  }

  /**
   * Remove a player from the store.
   * @param playerId Player identifier.
   * @returns True if a player was removed.
   */
  function removePlayer(playerId: string): boolean {
    return players.delete(playerId);
  }

  /**
   * Join a player, enforcing name validation and uniqueness.
   * @param payload Join request payload.
   * @returns Result payload with IDs or errors.
   */
  function joinPlayer(payload: JoinPlayerPayload): JoinPlayerResult {
    const name = payload.name ? payload.name.trim() : '';
    if (!name) {
      return { ok: false, error: 'name_required' };
    }

    const nameTaken = Array.from(players.values()).some(
      (player) => player.name.toLowerCase() === name.toLowerCase() && player.id !== payload.playerId
    );
    if (nameTaken) {
      return { ok: false, error: 'name_taken' };
    }

    if (payload.playerId && players.has(payload.playerId)) {
      const player = players.get(payload.playerId)!;
      player.name = name;
      player.lastSeen = Date.now();
      return { ok: true, playerId: player.id, name: player.name };
    }

    const playerId = crypto.randomBytes(8).toString('hex');
    const player: Player = {
      id: playerId,
      name,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };
    players.set(playerId, player);
    return { ok: true, playerId, name };
  }

  return {
    listPlayers,
    getPlayerName,
    hasPlayer,
    getPlayerIds,
    joinPlayer,
    removePlayer,
  };
}
