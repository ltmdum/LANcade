#!/usr/bin/env node

/**
 * Generates backend/src/gridlock/nine-letter-words.json from the open-source
 * `word-list` package (an MIT-licensed, SCOWL-derived English word list).
 *
 * Every entry is a unique, uppercase, nine-letter alphabetic word. The output
 * is committed so the runtime has no dependency on the source package; re-run
 * this script (`node scripts/generate-nine-letter-words.js`) to refresh it.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const wordListExport = require('word-list');
const wordListPath = wordListExport.default || wordListExport;
const outputPath = path.join(__dirname, '..', 'backend', 'src', 'gridlock', 'nine-letter-words.json');

const words = fs
  .readFileSync(wordListPath, 'utf-8')
  .split('\n')
  .filter((word) => /^[a-z]{9}$/.test(word))
  .map((word) => word.toUpperCase());

const unique = Array.from(new Set(words)).sort();

fs.writeFileSync(outputPath, `${JSON.stringify(unique)}\n`);
console.log(`✓ Wrote ${unique.length} nine-letter words to ${path.relative(path.join(__dirname, '..'), outputPath)}`);
