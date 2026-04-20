#!/usr/bin/env node

/**
 * Validates games.config.json at build time.
 * 
 * This script checks that:
 * 1. The config file exists and is valid JSON
 * 2. All game IDs in the config match registered games
 * 3. At least one game is enabled
 * 
 * Exit codes:
 * 0 = success
 * 1 = validation error
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known game IDs - must be kept in sync with actual game registrations
const KNOWN_GAMES = new Set([
  'quickfire',
  'multicat',
  'lastwordstanding',
  'fiveletterword',
  'mindmatch',
  'alphabetrace',
  'undercoveragent',
  'tradingexchange',
]);

function validateConfig() {
  const configPath = path.join(__dirname, '..', 'games.config.json');
  
  // Check file exists
  if (!fs.existsSync(configPath)) {
    console.error('Error: games.config.json not found in project root.');
    console.error('Create this file with a "games" array listing enabled game IDs.');
    process.exit(1);
  }

  // Read and parse
  let configText;
  try {
    configText = fs.readFileSync(configPath, 'utf-8');
  } catch (err) {
    console.error(`Error reading games.config.json: ${err.message}`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(configText);
  } catch (err) {
    console.error(`Error: Invalid JSON in games.config.json: ${err.message}`);
    process.exit(1);
  }

  // Validate structure
  if (!config || typeof config !== 'object') {
    console.error('Error: games.config.json must be an object.');
    process.exit(1);
  }

  if (!Array.isArray(config.games)) {
    console.error('Error: games.config.json must have a "games" array.');
    process.exit(1);
  }

  // Validate game IDs
  const invalidIds = [];
  for (const gameId of config.games) {
    if (typeof gameId !== 'string') {
      console.error(`Error: Invalid game entry: ${JSON.stringify(gameId)} (must be a string)`);
      process.exit(1);
    }
    if (!KNOWN_GAMES.has(gameId)) {
      invalidIds.push(gameId);
    }
  }

  if (invalidIds.length > 0) {
    console.error(`Error: Unknown game ID(s) in games.config.json: ${invalidIds.join(', ')}`);
    console.error(`Available games: ${Array.from(KNOWN_GAMES).join(', ')}`);
    process.exit(1);
  }

  // Check at least one game
  if (config.games.length === 0) {
    console.error('Error: No games enabled in games.config.json.');
    console.error('Add at least one game ID to the "games" array.');
    process.exit(1);
  }

  // Check for duplicates
  const seen = new Set();
  for (const gameId of config.games) {
    if (seen.has(gameId)) {
      console.error(`Error: Duplicate game ID in games.config.json: ${gameId}`);
      process.exit(1);
    }
    seen.add(gameId);
  }

  console.log(`✓ games.config.json is valid (${config.games.length} game(s) enabled)`);
  console.log(`  Enabled: ${config.games.join(', ')}`);
}

validateConfig();
