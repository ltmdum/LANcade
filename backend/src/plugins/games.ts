/**
 * This file registers all available game plugins.
 * Each game must be imported and registered here to be available.
 * 
 * To add a new game:
 * 1. Create a plugin.ts file in your game directory
 * 2. Import and register it below
 * 3. Add the game ID to games.config.json
 */

import { gameRegistry } from './registry.js';
import { plugin as quickFirePlugin } from '../quickFire/plugin.js';
import { plugin as multicatPlugin } from '../multicat/plugin.js';
import { plugin as lastWordStandingPlugin } from '../lastWordStanding/plugin.js';
import { plugin as fiveLetterWordPlugin } from '../fiveLetterWord/plugin.js';
import { plugin as mindMatchPlugin } from '../mindMatch/plugin.js';
import { plugin as alphabetRacePlugin } from '../alphabetRace/plugin.js';
import { plugin as undercoverAgentPlugin } from '../undercoverAgent/plugin.js';

// Register all available games
gameRegistry.register(quickFirePlugin);
gameRegistry.register(multicatPlugin);
gameRegistry.register(lastWordStandingPlugin);
gameRegistry.register(fiveLetterWordPlugin);
gameRegistry.register(mindMatchPlugin);
gameRegistry.register(alphabetRacePlugin);
gameRegistry.register(undercoverAgentPlugin);

export { gameRegistry };
