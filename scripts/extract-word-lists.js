#!/usr/bin/env node

/**
 * Extracts words of specific lengths from the `word-list` package and writes
 * each length to a JSON file in backend/src/shared/data/.
 *
 * Usage: node scripts/extract-word-lists.js [--length 5] [--length 9]
 * Defaults to lengths 5 and 9 if none specified.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const wordListExport = require('word-list');
const wordListPath = wordListExport.default || wordListExport;

const args = process.argv.slice(2);
const lengthFlags = args.filter((a, i) => a === '--length' && i + 1 < args.length).map((_, i) => Number(args[args.indexOf('--length', i) + 1]));
const lengths = lengthFlags.length > 0 ? lengthFlags : [5, 9];

const allWords = fs.readFileSync(wordListPath, 'utf-8').split('\n');
const dataDir = path.join(__dirname, '..', 'backend', 'src', 'shared', 'data');

for (const length of lengths) {
  const pattern = new RegExp(`^[a-z]{${length}}$`);
  const filtered = allWords
    .filter((w) => pattern.test(w))
    .map((w) => w.toUpperCase());
  const outputPath = path.join(dataDir, `words-${length}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(filtered)}\n`);
  console.log(`✓ Wrote ${filtered.length} ${length}-letter words to ${path.relative(path.join(__dirname, '..'), outputPath)}`);
}
