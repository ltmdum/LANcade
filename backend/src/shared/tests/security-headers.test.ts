import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Create a minimal Express app with the same security headers middleware
 * used in the main server, for isolated testing.
 */
function createAppWithHeaders(httpsRequired = false) {
  const app = express();
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    if (httpsRequired) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.get('/test', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('security headers', () => {
  it('sets X-Content-Type-Options on responses', async () => {
    const res = await request(createAppWithHeaders()).get('/test');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options on responses', async () => {
    const res = await request(createAppWithHeaders()).get('/test');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets X-XSS-Protection on responses', async () => {
    const res = await request(createAppWithHeaders()).get('/test');
    expect(res.headers['x-xss-protection']).toBe('0');
  });

  it('does not set HSTS when HTTPS is not required', async () => {
    const res = await request(createAppWithHeaders(false)).get('/test');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('sets HSTS when HTTPS is required', async () => {
    const res = await request(createAppWithHeaders(true)).get('/test');
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
  });
});
