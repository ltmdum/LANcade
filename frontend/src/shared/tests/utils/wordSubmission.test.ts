import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateWordForSubmit, handleWordSubmission } from '../../utils/wordSubmission';

// Replace the api module so handleWordSubmission sees our stub via its own import
vi.mock('../../utils/api', () => ({
  submitWord: vi.fn(),
}));
import { submitWord as mockSubmitWord } from '../../utils/api';

describe('validateWordForSubmit', () => {
  it('returns valid result when word starts with correct letter', () => {
    const result = validateWordForSubmit('Apple', 'A');
    expect(result.valid).toBe(true);
    expect(result.trimmedWord).toBe('Apple');
    expect(result.errorMessage).toBeUndefined();
  });

  it('is case-insensitive for letter matching', () => {
    const result = validateWordForSubmit('apple', 'A');
    expect(result.valid).toBe(true);
    expect(result.trimmedWord).toBe('apple');
  });

  it('trims whitespace from word', () => {
    const result = validateWordForSubmit('  Apple  ', 'A');
    expect(result.valid).toBe(true);
    expect(result.trimmedWord).toBe('Apple');
  });

  it('returns invalid result when word starts with wrong letter', () => {
    const result = validateWordForSubmit('Banana', 'A');
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toBe('Word must start with A.');
    expect(result.trimmedWord).toBeUndefined();
  });

  it('handles lowercase expected letter', () => {
    const result = validateWordForSubmit('Apple', 'a');
    expect(result.valid).toBe(true);
    expect(result.trimmedWord).toBe('Apple');
  });

  it('returns error message with the expected letter', () => {
    const result = validateWordForSubmit('Xylophone', 'Z');
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toBe('Word must start with Z.');
  });
});

describe('handleWordSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Wire the mocked submitWord to resolve with a given status and body.
   * @param status HTTP status code.
   * @param body Response body object.
   */
  function stubSubmitWord(status: number, body: Record<string, unknown>) {
    (mockSubmitWord as ReturnType<typeof vi.fn>).mockResolvedValue({
      response: { ok: status >= 200 && status < 300, status },
      data: body,
    });
  }

  it('formats the already_used_by_self message with the original word and category', async () => {
    stubSubmitWord(400, {
      ok: false,
      reason: 'already_used_by_self',
      blockedWord: 'Apple',
      blockedCategory: 'Foods',
    });

    const result = await handleWordSubmission('Apple', {
      playerId: 'p1',
      accessKey: 'KEY123',
      letter: 'A',
      category: 'Animals',
    });

    expect(result.success).toBe(false);
    expect(result.statusMessage).toBe(
      "Honk! You've already used Apple for Foods, you silly goose!"
    );
  });

  it('passes accessKey as the third argument to submitWord', async () => {
    stubSubmitWord(200, { ok: true });

    await handleWordSubmission('Apple', {
      playerId: 'p1',
      accessKey: 'KEY123',
      letter: 'A',
      category: 'Animals',
    });

    expect(mockSubmitWord).toHaveBeenCalledWith('p1', 'Apple', 'KEY123', 'Animals');
  });
});
