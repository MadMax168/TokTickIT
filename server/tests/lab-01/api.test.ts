import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app.js';

describe('GET /api/health', () => {
  it('returns 200', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
  });

  it('returns the TokTickIT API health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'TokTickIT API',
    });
  });
});
