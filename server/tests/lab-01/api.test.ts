import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';

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

describe('API-03: Category list', () => {
  it('returns 200', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
  });

  it('returns array of 4 items', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.body).toHaveLength(4);
  });

  it('first item name is Account and Access', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.body[0].name).toBe('Account and Access');
  });
});
