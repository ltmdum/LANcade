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
  'ninedash',
  'telepathy',
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

  const entries = config.games.map((entry, i) => {
    if (entry && typeof entry === 'object' && typeof entry.id === 'string') {
      return { id: entry.id };
    }
    console.error(`Error: Invalid game entry at index ${i}: ${JSON.stringify(entry)} (must be an object with "id" field)`);
    process.exit(1);
  });

  const invalidIds = [];
  for (const { id } of entries) {
    if (!KNOWN_GAMES.has(id)) {
      invalidIds.push(id);
    }
  }

  if (invalidIds.length > 0) {
    console.error(`Error: Unknown game ID(s) in games.config.json: ${invalidIds.join(', ')}`);
    console.error(`Available games: ${Array.from(KNOWN_GAMES).join(', ')}`);
    process.exit(1);
  }

  // Check at least one game
  if (entries.length === 0) {
    console.error('Error: No games enabled in games.config.json.');
    console.error('Add at least one game ID to the "games" array.');
    process.exit(1);
  }

  // Check for duplicates
  const seen = new Set();
  for (const { id } of entries) {
    if (seen.has(id)) {
      console.error(`Error: Duplicate game ID in games.config.json: ${id}`);
      process.exit(1);
    }
    seen.add(id);
  }

  const enabledIds = entries.map((e) => e.id);
  console.log(`✓ games.config.json is valid (${entries.length} game(s) enabled)`);
  console.log(`  Enabled: ${enabledIds.join(', ')}`);
}

validateConfig();
