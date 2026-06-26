import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { endGame } from '../../utils/api';

describe('endGame', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the end game API with key in body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    const accessKey = 'test-session-123';
    await endGame(accessKey);

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key: 'test-session-123' }),
    });
  });

  it('returns response and data on success', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await endGame('session-id');

    expect(result.response.ok).toBe(true);
    expect(result.data.ok).toBe(true);
  });

  it('returns response and error data on failure', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: () => Promise.resolve({ ok: false, reason: 'not_active' }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await endGame('session-id');

    expect(result.response.ok).toBe(false);
    expect(result.data.reason).toBe('not_active');
  });

  it('returns 401 when unauthorized', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await endGame('invalid-session');

    expect(result.response.status).toBe(401);
    expect(result.data.error).toBe('unauthorized');
  });
});
