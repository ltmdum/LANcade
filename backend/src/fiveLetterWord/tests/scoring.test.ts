import { describe, it, expect } from 'vitest';
import { evaluateGuess } from '../scoring.js';

describe('evaluateGuess', () => {
  it('marks all correct letters when guess matches target', () => {
    const result = evaluateGuess('APPLE', 'APPLE');
    expect(result.letters).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
    expect(result.correctCount).toBe(5);
    expect(result.presentCount).toBe(0);
  });

  it('marks letters as absent when not in target', () => {
    const result = evaluateGuess('ABCDE', 'FGHIJ');
    expect(result.letters).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
    expect(result.correctCount).toBe(0);
    expect(result.presentCount).toBe(0);
  });

  it('marks letters as present when in wrong position', () => {
    const result = evaluateGuess('BEARS', 'SABER');
    // B is in position 0, but in SABER it's at position 2 -> present
    // E is in position 1, but in SABER it's at position 3 -> present
    // A is in position 2, but in SABER it's at position 1 -> present
    // R is in position 3, but in SABER it's at position 4 -> present
    // S is in position 4, but in SABER it's at position 0 -> present
    expect(result.letters).toEqual(['present', 'present', 'present', 'present', 'present']);
    expect(result.correctCount).toBe(0);
    expect(result.presentCount).toBe(5);
  });

  it('handles mix of correct, present, and absent', () => {
    const result = evaluateGuess('WORLD', 'WORDY');
    // W = correct (pos 0)
    // O = correct (pos 1)
    // R = correct (pos 2)
    // L = absent (L is not in WORDY)
    // D = present (D is at pos 3 in WORDY, guessed at pos 4)
    expect(result.letters).toEqual(['correct', 'correct', 'correct', 'absent', 'present']);
    expect(result.correctCount).toBe(3);
    expect(result.presentCount).toBe(1);
  });

  it('handles duplicate letters correctly', () => {
    const result = evaluateGuess('SPEED', 'ABIDE');
    // S = absent
    // P = absent
    // E = present (E is at pos 4 in ABIDE)
    // E = absent (only one E in target, already matched)
    // D = present (D is at pos 3 in ABIDE)
    expect(result.letters).toEqual(['absent', 'absent', 'present', 'absent', 'present']);
    expect(result.correctCount).toBe(0);
    expect(result.presentCount).toBe(2);
  });

  it('prioritizes correct over present for duplicates', () => {
    const result = evaluateGuess('EERIE', 'MERGE');
    // MERGE = M(0) E(1) R(2) G(3) E(4)
    // EERIE = E(0) E(1) R(2) I(3) E(4)
    // 
    // First pass (correct matches):
    // E at pos 1 -> E at pos 1 in MERGE -> correct (pos 1 marked used)
    // R at pos 2 -> R at pos 2 in MERGE -> correct (pos 2 marked used)
    // E at pos 4 -> E at pos 4 in MERGE -> correct (pos 4 marked used)
    //
    // Second pass (present matches):
    // E at pos 0 -> no unused E positions in MERGE -> absent
    // I at pos 3 -> not in MERGE -> absent
    expect(result.letters).toEqual(['absent', 'correct', 'correct', 'absent', 'correct']);
    expect(result.correctCount).toBe(3);
    expect(result.presentCount).toBe(0);
  });
});


