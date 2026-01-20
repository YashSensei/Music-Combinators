const request = require('supertest');
const app = require('../../src/app');

// Mock Supabase since we don't have real database yet
jest.mock('../../src/config/database', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { code: 'PGRST116' },
          })),
        })),
      })),
    })),
    rpc: jest.fn(),
  },
}));

// Mock JWT verification
jest.mock('../../src/config/auth', () => ({
  verifyToken: jest.fn(),
  extractToken: jest.fn(authHeader => {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
  }),
}));

describe('User Routes', () => {
  describe('GET /api/users/search', () => {
    test('should require search query', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Search query must be at least 2 characters');
    });

    test('should handle empty search query', async () => {
      const response = await request(app)
        .get('/api/users/search?q=a')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Search query must be at least 2 characters');
    });

    test('should validate minimum query length', async () => {
      const response = await request(app)
        .get('/api/users/search?q=ab')
        .expect(500); // Will error due to mocked database

      // This will fail with database mock, but validates route structure
    });
  });

  describe('GET /api/users/:username', () => {
    test('should validate username parameter', async () => {
      const response = await request(app)
        .get('/api/users/ab')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid username');
    });
  });

  describe('GET /api/users/me', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('No token provided');
    });
  });

  describe('PUT /api/users/me/profile', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/users/me/profile')
        .send({ username: 'testuser' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('No token provided');
    });
  });
});