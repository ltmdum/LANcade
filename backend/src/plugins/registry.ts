import type { GameDefinition, GamePlugin } from './types.js';

/**
 * Registry of all available game plugins.
 * Games register themselves here, and the registry is filtered based on config.
 */
class GameRegistry {
  private plugins: Map<string, GameDefinition> = new Map();
  private enabledGameIds: Set<string> = new Set();

  /**
   * Register a game plugin. Called by each game module during initialization.
   */
  register(plugin: GamePlugin): void {
    const { definition } = plugin;
    if (this.plugins.has(definition.id)) {
      throw new Error(`Game "${definition.id}" is already registered`);
    }
    this.plugins.set(definition.id, definition);
  }

  /**
   * Set which games are enabled based on the config file.
   * Returns an array of any game IDs in the config that don't exist.
   */
  setEnabledGames(gameIds: string[]): string[] {
    const invalidIds: string[] = [];
    this.enabledGameIds.clear();
    
    for (const id of gameIds) {
      if (this.plugins.has(id)) {
        this.enabledGameIds.add(id);
      } else {
        invalidIds.push(id);
      }
    }
    
    return invalidIds;
  }

  /**
   * Get all registered game IDs (for validation).
   */
  getAllRegisteredIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get a game definition by ID. Returns undefined if not found or not enabled.
   */
  getGame(id: string): GameDefinition | undefined {
    if (!this.enabledGameIds.has(id)) {
      return undefined;
    }
    return this.plugins.get(id);
  }

  /**
   * Get all enabled games as a record for easy lookup.
   */
  getEnabledGames(): Record<string, GameDefinition> {
    const games: Record<string, GameDefinition> = {};
    for (const id of this.enabledGameIds) {
      const definition = this.plugins.get(id);
      if (definition) {
        games[id] = definition;
      }
    }
    return games;
  }

  /**
   * List all enabled games with their id and name (for API responses).
   */
  listEnabledGames(): { id: string; name: string }[] {
    const list: { id: string; name: string }[] = [];
    for (const id of this.enabledGameIds) {
      const definition = this.plugins.get(id);
      if (definition) {
        list.push({ id: definition.id, name: definition.name });
      }
    }
    return list;
  }

  /**
   * Get the first enabled game ID (for default selection).
   */
  getDefaultGameId(): string | undefined {
    const firstEnabled = this.enabledGameIds.values().next();
    return firstEnabled.done ? undefined : firstEnabled.value;
  }

  /**
   * Check if a game ID is enabled.
   */
  isEnabled(id: string): boolean {
    return this.enabledGameIds.has(id);
  }

  /**
   * Clear all registrations (useful for testing).
   */
  clear(): void {
    this.plugins.clear();
    this.enabledGameIds.clear();
  }
}

// Singleton instance
export const gameRegistry = new GameRegistry();
