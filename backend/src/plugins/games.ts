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
import { plugin as categoryclash1Plugin } from '../categoryclash1/plugin.js';
import { plugin as categoryclash2Plugin } from '../categoryclash2/plugin.js';
import { plugin as wordrushPlugin } from '../wordRush/plugin.js';
import { plugin as wordSprintPlugin } from '../wordSprint/plugin.js';
import { plugin as blankSlatePlugin } from '../blankSlate/plugin.js';

// Register all available games
gameRegistry.register(categoryclash1Plugin);
gameRegistry.register(categoryclash2Plugin);
gameRegistry.register(wordrushPlugin);
gameRegistry.register(wordSprintPlugin);
gameRegistry.register(blankSlatePlugin);

export { gameRegistry };
