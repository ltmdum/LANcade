import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gameRegistry } from './games.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GamesConfig {
  games: string[];
}

/**
 * Find the config file by checking multiple possible locations.
 * Works both in development (src/) and production (dist/).
 */
function findConfigPath(): string {
  // Allow override via environment variable (used by mobile builds)
  if (process.env.GAMES_CONFIG_PATH) {
    const envPath = process.env.GAMES_CONFIG_PATH;
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    console.warn(`GAMES_CONFIG_PATH set but file not found: ${envPath}`);
  }

  // Possible locations relative to this file
  const candidates = [
    // From src/plugins/ -> root (development via tsx)
    path.join(__dirname, '..', '..', '..', 'games.config.json'),
    // From dist/plugins/ -> root (production)
    path.join(__dirname, '..', '..', '..', '..', 'games.config.json'),
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  
  // Return the expected path for error message
  return path.join(__dirname, '..', '..', '..', 'games.config.json');
}

/**
 * Load and validate the games configuration file.
 * Throws an error if the config is invalid or contains unknown game IDs.
 */
export function loadGamesConfig(): GamesConfig {
  const configPath = findConfigPath();
  
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Games config file not found at ${configPath}. ` +
      'Please create games.config.json in the project root.'
    );
  }

  let configText: string;
  try {
    configText = fs.readFileSync(configPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read games config: ${err}`);
  }

  let config: unknown;
  try {
    config = JSON.parse(configText);
  } catch (err) {
    throw new Error(`Invalid JSON in games.config.json: ${err}`);
  }

  if (!config || typeof config !== 'object') {
    throw new Error('games.config.json must be an object');
  }

  const configObj = config as Record<string, unknown>;
  if (!Array.isArray(configObj.games)) {
    throw new Error('games.config.json must have a "games" array');
  }

  const games = configObj.games;
  for (const game of games) {
    if (typeof game !== 'string') {
      throw new Error(`Invalid game entry in config: ${JSON.stringify(game)} (must be a string)`);
    }
  }

  return { games: games as string[] };
}

/**
 * Initialize the game registry with the configuration.
 * This validates that all configured games exist.
 */
export function initializeGames(): void {
  const config = loadGamesConfig();
  const invalidIds = gameRegistry.setEnabledGames(config.games);
  
  if (invalidIds.length > 0) {
    const availableGames = gameRegistry.getAllRegisteredIds();
    throw new Error(
      `Unknown game(s) in games.config.json: ${invalidIds.join(', ')}. ` +
      `Available games: ${availableGames.join(', ')}`
    );
  }

  if (config.games.length === 0) {
    throw new Error('No games enabled in games.config.json. Add at least one game.');
  }
}
