const request = require('supertest');
const app = require('../../src/app');

describe('Health Check Endpoints', () => {
  test('GET /health should return healthy status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: 'test',
    });
  });

  test('GET /nonexistent should return 404', async () => {
    const response = await request(app).get('/nonexistent').expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        message: 'Route /nonexistent not found',
      },
    });
  });
});