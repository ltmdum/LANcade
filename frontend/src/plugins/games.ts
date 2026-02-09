/**
 * This file registers all available frontend game plugins.
 * Each game must be imported and registered here to be available.
 * 
 * To add a new game:
 * 1. Create a plugin.tsx file in your game directory
 * 2. Import and register it below
 * 3. Add the game ID to games.config.json (in project root)
 */

import { gamePluginRegistry } from './registry';
import { plugin as categoryclash1Plugin } from '../categoryclash1/plugin';
import { plugin as categoryclash2Plugin } from '../categoryclash2/plugin';
import { plugin as wordrushPlugin } from '../wordRush/plugin';
import { plugin as wordSprintPlugin } from '../wordSprint/plugin';
import { plugin as blankSlatePlugin } from '../blankSlate/plugin';

// Register all available game plugins
gamePluginRegistry.register(categoryclash1Plugin);
gamePluginRegistry.register(categoryclash2Plugin);
gamePluginRegistry.register(wordrushPlugin);
gamePluginRegistry.register(wordSprintPlugin);
gamePluginRegistry.register(blankSlatePlugin);

export { gamePluginRegistry };
