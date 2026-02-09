import type { GamePlugin, GamePluginConfig } from './types';

/**
 * Registry for frontend game plugins.
 */
class GamePluginRegistry {
  private plugins: Map<string, GamePlugin> = new Map();

  /**
   * Register a game plugin.
   */
  register(plugin: GamePlugin): void {
    if (this.plugins.has(plugin.config.id)) {
      throw new Error(`Game plugin "${plugin.config.id}" is already registered`);
    }
    this.plugins.set(plugin.config.id, plugin);
  }

  /**
   * Get a plugin by game ID.
   */
  getPlugin(gameId: string): GamePlugin | undefined {
    return this.plugins.get(gameId);
  }

  /**
   * Get the plugin configuration for a game.
   */
  getConfig(gameId: string): GamePluginConfig | undefined {
    return this.plugins.get(gameId)?.config;
  }

  /**
   * Find a plugin that can render the given state.
   */
  findPluginForState(serverState: unknown, gameId: string): GamePlugin | undefined {
    const plugin = this.plugins.get(gameId);
    if (plugin && plugin.canRender(serverState, gameId)) {
      return plugin;
    }
    return undefined;
  }

  /**
   * Get all registered plugin IDs.
   */
  getAllIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Clear all registrations (useful for testing).
   */
  clear(): void {
    this.plugins.clear();
  }
}

// Singleton instance
export const gamePluginRegistry = new GamePluginRegistry();
