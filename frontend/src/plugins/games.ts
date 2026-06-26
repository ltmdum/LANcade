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
import { plugin as quickFirePlugin } from '../quickFire/plugin';
import { plugin as multicatPlugin } from '../multicat/plugin';
import { plugin as lastWordStandingPlugin } from '../lastWordStanding/plugin';
import { plugin as fiveLetterWordPlugin } from '../fiveLetterWord/plugin';
import { plugin as mindMatchPlugin } from '../mindMatch/plugin';
import { plugin as alphabetRacePlugin } from '../alphabetRace/plugin';
import { plugin as undercoverAgentPlugin } from '../undercoverAgent/plugin';
import { plugin as tradingExchangePlugin } from '../tradingExchange/plugin';
import { plugin as gridlockPlugin } from '../gridlock/plugin';

// Register all available game plugins
gamePluginRegistry.register(quickFirePlugin);
gamePluginRegistry.register(multicatPlugin);
gamePluginRegistry.register(lastWordStandingPlugin);
gamePluginRegistry.register(fiveLetterWordPlugin);
gamePluginRegistry.register(mindMatchPlugin);
gamePluginRegistry.register(alphabetRacePlugin);
gamePluginRegistry.register(undercoverAgentPlugin);
gamePluginRegistry.register(tradingExchangePlugin);
gamePluginRegistry.register(gridlockPlugin);

export { gamePluginRegistry };
