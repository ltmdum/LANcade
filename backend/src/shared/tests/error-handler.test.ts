import { describe, it, expect } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

/**
 * Create a minimal Express app with a route that throws and the same
 * global error handler pattern used in the main server.
 */
function createAppWithErrorHandler() {
  const app = express();

  app.get('/explode', (_req: Request, _res: Response) => {
    throw new Error('something broke internally');
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}

describe('global error handler', () => {
  it('returns 500 with generic JSON error', async () => {
    const res = await request(createAppWithErrorHandler()).get('/explode');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal_error' });
  });

  it('does not leak stack traces in the response', async () => {
    const res = await request(createAppWithErrorHandler()).get('/explode');
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('Error');
    expect(text).not.toContain('stack');
    expect(text).not.toContain('.ts');
    expect(text).not.toContain('.js');
  });

  it('returns JSON content type', async () => {
    const res = await request(createAppWithErrorHandler()).get('/explode');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
