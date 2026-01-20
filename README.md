# Music Combinators Backend API

Backend API for Music Combinators - Discovery platform for underrated musicians.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

The server will run on http://localhost:3000

## Testing the API with Postman

### Phase 1 - Basic Health Check (Available Now)

**Health Check**
- **GET** `http://localhost:3000/health`
- **Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-20T18:20:12.345Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### Phase 1 - Route Placeholders (Available Now)

All routes below return placeholder messages until fully implemented:

**Authentication Routes**
- **POST** `http://localhost:3000/api/auth/callback`
- **POST** `http://localhost:3000/api/auth/refresh`

**User Management Routes**
- **GET** `http://localhost:3000/api/users/me`
- **PUT** `http://localhost:3000/api/users/me/profile`
- **POST** `http://localhost:3000/api/users/creator-application`
- **GET** `http://localhost:3000/api/users/search`

**Track Routes**
- **POST** `http://localhost:3000/api/tracks`
- **GET** `http://localhost:3000/api/tracks`
- **GET** `http://localhost:3000/api/tracks/search`
- **POST** `http://localhost:3000/api/tracks/:id/like`
- **DELETE** `http://localhost:3000/api/tracks/:id/like`

**Reel Routes**
- **POST** `http://localhost:3000/api/reels`
- **GET** `http://localhost:3000/api/reels/feed`
- **POST** `http://localhost:3000/api/reels/:id/like`
- **DELETE** `http://localhost:3000/api/reels/:id/like`

**Admin Routes**
- **GET** `http://localhost:3000/api/admin/users/waitlist`
- **POST** `http://localhost:3000/api/admin/users/approve`
- **GET** `http://localhost:3000/api/admin/creator-applications`
- **POST** `http://localhost:3000/api/admin/creator-applications/:id/approve`
- **POST** `http://localhost:3000/api/admin/creator-applications/:id/reject`
- **GET** `http://localhost:3000/api/admin/settings`
- **PUT** `http://localhost:3000/api/admin/settings`
- **DELETE** `http://localhost:3000/api/admin/tracks/:id`
- **DELETE** `http://localhost:3000/api/admin/reels/:id`

**Upload Routes**
- **POST** `http://localhost:3000/api/upload/audio`
- **POST** `http://localhost:3000/api/upload/video`
- **POST** `http://localhost:3000/api/upload/image`

### Error Testing

**404 Test**
- **GET** `http://localhost:3000/nonexistent-route`
- **Expected Response:**
```json
{
  "success": false,
  "error": {
    "message": "Route /nonexistent-route not found"
  }
}
```

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check

# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Architecture

```
src/
├── config/         # Database, auth, storage configuration
├── middleware/     # Express middleware (auth, validation, etc.)
├── routes/         # Express route definitions
├── controllers/    # Business logic handlers
├── services/       # Data access layer
└── utils/          # Utility functions and constants
```

## Next Steps

1. ✅ **Phase 1**: Foundation setup (complete)
2. **Phase 2**: Supabase setup and authentication
3. **Phase 3**: User management and profiles
4. **Phase 4**: Content management (tracks/reels)
5. **Phase 5**: Admin panel and testing

## Environment Variables

Copy `.env.example` to `.env` and update with your actual values:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `JWT_SECRET`: JWT secret from Supabase settings

## Code Quality

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting  
- **Husky** for pre-commit hooks
- **lint-staged** for staged file processing

All commits are automatically linted and formatted.
