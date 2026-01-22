# Music Combinators - Backend Architecture Plan

## Product Overview

Music Combinators (MC) is a discovery-first platform for underrated and early-stage musicians. Think "YC for musicians + Spotify uploads + Instagram Reels feed."

**Core Value Proposition:**
- Emerging artists get a fair platform to showcase their work
- Listeners discover new talent through an unbiased, chronological feed
- No algorithmic manipulation or big player dominance

**MVP Goal:** Validate product-market fit, not scale. Prove that artists want to post and listeners enjoy discovering new talent.

## MVP Scope Definition

### ✅ What's Included
- **Access Control**: Waitlist system with admin batch approval
- **User Management**: Three roles (listener/creator/admin) with proper state transitions
- **Feed System**: Chronological reel feed with client-side randomization
- **Music Library**: Basic upload/play/search functionality for tracks
- **Profile System**: Differentiated listener vs creator profiles  
- **Creator Applications**: Manual approval workflow for role elevation
- **Admin Panel**: Core moderation and user management tools
- **Search**: Basic text search for users and tracks
- **Traction Metrics**: Basic follower counts, view/play counts, like counts

### ❌ What's Excluded (No Feature Creep)
- Comments system
- Algorithmic recommendations
- Playlists or albums
- Analytics dashboards
- Advanced search filters
- Listen time tracking / detailed analytics
- Content moderation AI
- Push notifications
- Mobile apps (backend only)
- Performance metrics/monitoring dashboards
- Email campaigns beyond approval notifications

## User Roles & State Machine

### Roles
- **Listener**: Browse, search, like content
- **Creator**: Everything listener can do + upload tracks/reels
- **Admin**: Full system control

### States
- **Waitlisted**: New signups, limited access
- **Active**: Full access based on role
- **Banned**: No access (admin action)

### Flow Diagram
```
New User Signup → Listener + Waitlisted
      ↓
Admin Approval → Listener + Active
      ↓
Creator Application → Pending Review
      ↓
Admin Approval → Creator + Active
```

## Architecture Overview

### High-Level Design
```
Frontend (React) → Node.js API → Supabase (Postgres + Auth + Storage)
```

**Architecture Principles:**
- Monolithic backend (single Node.js service)
- SQL-first database design (normalized, relational)
- RESTful API design
- Clean separation: Routes → Controllers → Services → Database
- Supabase handles auth, we handle authorization
- Media files in Supabase Storage (URLs only in DB)

### Authentication Flow
1. Frontend uses Supabase Auth (email/password)
2. Supabase returns JWT token
3. Backend middleware validates JWT + checks user role/status
4. Routes protected by authorization middleware

## Database Schema Summary

### Core Tables

**users** (extends auth.users)
- `id` (uuid, FK to auth.users.id)  
- `role` (listener|creator|admin, default: listener)
- `status` (waitlisted|active|banned, default: waitlisted)
- `approved_at` (timestamptz, nullable)
- `created_at` (timestamptz)

**profiles** (user display data)
- `id` (uuid, FK to users.id)
- `username` (unique, required)
- `display_name` (optional)
- `bio` (text)
- `avatar_url` (text)
- `artist_name` (nullable, creators only)
- `created_at` (timestamptz)

**creator_applications** (role elevation requests)
- `id` (uuid)
- `user_id` (FK to users.id)
- `artist_name` (required)
- `bio` (required) 
- `spotify_url` (optional)
- `instagram_url` (optional)
- `status` (pending|approved|rejected, default: pending)
- `created_at` (timestamptz)
- `reviewed_at` (timestamptz, nullable)

**tracks** (music uploads)
- `id` (uuid)
- `user_id` (FK to users.id)
- `title` (required)
- `audio_url` (required, Supabase Storage)
- `cover_url` (optional, Supabase Storage)
- `duration` (integer, seconds)
- `play_count` (integer, default: 0)
- `like_count` (integer, default: 0)
- `is_active` (boolean, default: true)
- `created_at` (timestamptz)

**reels** (video uploads)
- `id` (uuid)
- `user_id` (FK to users.id)
- `caption` (text)
- `video_url` (required, Supabase Storage)
- `view_count` (integer, default: 0)
- `like_count` (integer, default: 0)
- `is_active` (boolean, default: true)
- `created_at` (timestamptz)

**likes** (engagement data)
- `id` (uuid)
- `user_id` (FK to users.id)
- `content_type` (track|reel)
- `content_id` (uuid)
- `created_at` (timestamptz)
- UNIQUE(user_id, content_type, content_id)

**follows** (user-to-user relationships)
- `id` (uuid)
- `follower_id` (FK to users.id) - user who follows
- `following_id` (FK to users.id) - user being followed
- `created_at` (timestamptz)
- UNIQUE(follower_id, following_id)

**settings** (admin configuration)
- `key` (text, PK)
- `value` (text)

### Required Indexes
- `profiles.username` (unique searches)
- `profiles.artist_name` (creator searches)  
- `tracks.title` (text searches)
- `likes.user_id, likes.content_type, likes.content_id` (composite for engagement queries)
- `follows.follower_id` (get users I follow)
- `follows.following_id` (get my followers)

## API Surface Overview

### Authentication Routes
- `POST /auth/callback` - Handle Supabase auth callback
- `POST /auth/refresh` - Refresh JWT token

### User Management
- `GET /users/me` - Get current user profile
- `PUT /users/me/profile` - Update profile
- `POST /users/creator-application` - Apply for creator status
- `GET /users/search` - Search users by username/artist_name
- `GET /users/:id` - Get user profile by ID (public view)
- `POST /users/:id/follow` - Follow a user
- `DELETE /users/:id/follow` - Unfollow a user
- `GET /users/:id/followers` - Get user's followers (paginated)
- `GET /users/:id/following` - Get users that user follows (paginated)

### Content Routes (Creators Only)
- `POST /tracks` - Upload new track
- `GET /tracks` - List all tracks (paginated)
- `GET /tracks/:id` - Get track details with counts
- `GET /tracks/search` - Search tracks by title
- `POST /tracks/:id/play` - Increment play count
- `POST /tracks/:id/like` - Toggle like on track
- `DELETE /tracks/:id/like` - Remove like from track

- `POST /reels` - Upload new reel  
- `GET /reels/feed` - Get chronological feed
- `GET /reels/:id` - Get reel details with counts
- `POST /reels/:id/view` - Increment view count
- `POST /reels/:id/like` - Toggle like on reel
- `DELETE /reels/:id/like` - Remove like from reel

### Admin Routes
- `GET /admin/users/waitlist` - Get waitlisted users
- `POST /admin/users/approve` - Approve users (batch or individual)
- `GET /admin/creator-applications` - Get pending applications
- `POST /admin/creator-applications/:id/approve` - Approve creator application
- `POST /admin/creator-applications/:id/reject` - Reject creator application
- `GET /admin/settings` - Get system settings
- `PUT /admin/settings` - Update system settings
- `DELETE /admin/tracks/:id` - Remove track
- `DELETE /admin/reels/:id` - Remove reel

### File Upload Routes
- `POST /upload/audio` - Upload MP3 file
- `POST /upload/video` - Upload MP4 file  
- `POST /upload/image` - Upload JPG/PNG/WebP file

## Project Structure

```
music-combinators-backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Supabase client setup
│   │   ├── auth.js              # Auth configuration
│   │   └── storage.js           # File storage config
│   ├── middleware/
│   │   ├── auth.js              # JWT validation
│   │   ├── authorization.js     # Role/status checks
│   │   ├── validation.js        # Request validation
│   │   └── fileUpload.js        # File upload validation
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User management
│   │   ├── tracks.js            # Music functionality
│   │   ├── reels.js             # Video functionality  
│   │   ├── admin.js             # Admin panel routes
│   │   └── upload.js            # File upload routes
│   ├── controllers/
│   │   ├── userController.js    # User business logic
│   │   ├── trackController.js   # Track business logic
│   │   ├── reelController.js    # Reel business logic
│   │   ├── adminController.js   # Admin business logic
│   │   └── uploadController.js  # File upload logic
│   ├── services/
│   │   ├── userService.js       # User data operations
│   │   ├── trackService.js      # Track data operations
│   │   ├── reelService.js       # Reel data operations
│   │   ├── likeService.js       # Like data operations
│   │   ├── emailService.js      # Email notifications
│   │   └── storageService.js    # File storage operations
│   ├── utils/
│   │   ├── validation.js        # Input validation helpers
│   │   ├── errors.js            # Custom error classes
│   │   └── constants.js         # App constants
│   └── app.js                   # Express app setup
├── tests/
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
├── scripts/
│   └── setup-db.sql            # Database setup script
├── .env.example                 # Environment variables template
├── .gitignore                  
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── package.json
└── README.md
```

## Development Phases

### Phase 1: Foundation (Week 1) ✅ COMPLETE
- [x] Project setup with tooling (ESLint, Prettier, Husky)
- [x] Supabase project setup and database schema
- [x] Express app structure with middleware
- [x] Authentication middleware (JWT validation)
- [x] Authorization middleware (role/status checks)
- [x] Basic error handling and logging

**🔐 SECURITY REMINDERS:** 
- Make storage bucket `music-combinators-uploads` PRIVATE after file upload system is implemented
- **Re-enable email confirmation** in Supabase Auth settings before production (currently disabled for testing)

### Phase 2: User Management ✅ COMPLETE
- [x] Supabase integration and real credentials setup
- [x] Database schema applied to live Supabase instance
- [x] User authentication with JWT validation working
- [x] User profile system (get/update) implemented
- [x] User search functionality (public endpoint)
- [x] Role-based authorization middleware complete
- [x] Creator application workflow (submit/review/approve)
- [x] Admin review endpoints with auto role upgrade
- [x] Email notification service integration points
- [x] Database triggers for auto-profile creation
- [x] Foreign key relationships properly configured

**✅ Completed Features:**  
- Authentication system (signup/signin via Supabase Auth)
- User profile management with proper RLS policies
- Creator application workflow (submit → admin review → auto upgrade)
- Authorization middleware (role-based and status-based)
- User search with pagination
- Admin approval system working end-to-end

**⚠️ Production Checklist:**
- Re-enable email confirmation in Supabase Auth settings
- Set storage bucket to PRIVATE when file upload is implemented
- Remove remaining debug logs if any
- Run security audit on RLS policies

### Phase 3: Content Management (Week 3) ✅ COMPLETE
- [x] File upload service (Supabase Storage)
- [x] Track upload/management system
- [x] Reel upload/management system  
- [x] Like/unlike functionality
- [x] Follow/unfollow system
- [x] View/play count tracking
- [x] Basic search implementation
- [x] User profile public view with follower counts

**✅ Completed Features:**
- File upload system with validation (audio/video/image)
- Track CRUD with play count tracking
- Reel CRUD with view count tracking
- Like/unlike for tracks and reels with auto-count updates
- Follow/unfollow users with follower/following lists
- Public user profiles with follower/following counts
- Search tracks by title
- Chronological reel feed
- Database functions for efficient count increments
- Storage integration with Supabase Storage

**🧪 Tested End-to-End:**
- User signup → approval → track/reel upload
- Follow system with count updates
- File uploads (audio, video) working correctly
- Authorization protecting creator-only routes

### Phase 4: Admin Panel & Polish (Week 4) ✅ COMPLETE
- [x] Admin routes and controllers
- [x] **Waitlist approval endpoints**
  - [x] Approve single user by ID (POST /admin/users/:id/approve)
  - [x] Batch approve X users (POST /admin/users/batch-approve) - First come first serve
  - [x] Get waitlisted users list with pagination
- [x] Content moderation (remove tracks/reels)
- [x] User moderation (ban/unban)
- [x] Creator application approval/rejection
- [x] Platform statistics dashboard endpoint

**✅ Completed Features:**
- Admin service with full waitlist management (FIFO batch approval)
- Creator application approval/rejection with reasons
- Content moderation (delete any track/reel)
- User ban/unban with reason tracking
- Platform statistics endpoint (user counts, content counts, pending applications)
- All routes protected with admin role requirement
- Database schema updates for ban tracking
- **Waitlisted users can apply for creator status** (removed requireActive from application route)

**🔧 Database Changes:**
- Added `ban_reason` and `banned_at` columns to users table
- Added `rejection_reason` column to creator_applications table
- Created indexes for performance

**🧪 Server Status:**
- Server running successfully on port 3000
- No ESLint errors
- All routes wired correctly

### Phase 5: Testing & Deployment Prep (Week 5)
- [ ] Unit test suite (core business logic)
- [ ] Integration tests (API endpoints)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deployment configuration
- [ ] Documentation completion

## Tooling & Code Quality Plan

### Development Tools
- **ESLint**: Catch common JavaScript errors and enforce consistent coding style
- **Prettier**: Automatic code formatting to eliminate style debates
- **Husky**: Pre-commit hooks to prevent bad code from entering repository
- **lint-staged**: Run linters only on staged files for faster commits

### Type Safety
- **TypeScript**: Consider for Phase 2+ if team is comfortable (not required for MVP)
- **JSDoc**: Document function signatures and complex business logic

### Testing Strategy
- **Jest**: Unit testing framework for services and utilities
- **Supertest**: Integration testing for API endpoints
- **Test Coverage**: Aim for >80% coverage on business logic (services)

### Why Each Tool Exists
- **ESLint**: Prevents runtime errors, enforces consistent patterns
- **Prettier**: Eliminates code style discussions, saves review time
- **Husky**: Prevents broken code from reaching main branch
- **lint-staged**: Keeps commit hooks fast by only checking changed files

### Git Workflow
- Feature branches from `main`
- Pull request reviews required
- Automated testing in CI
- No direct pushes to `main`

## Engineering Principles

### Code Quality Standards
1. **Single Responsibility**: Each function/module has one clear purpose
2. **DRY Principle**: No duplicate logic across services
3. **Clear Naming**: Variables and functions should be self-documenting
4. **Error Handling**: Every external call should handle failure cases
5. **Input Validation**: Validate all user inputs at API boundary

### Architecture Guidelines  
1. **Separation of Concerns**: Routes → Controllers → Services → Database
2. **Dependency Injection**: Services should be testable in isolation
3. **Configuration Management**: All environment-specific values in config files
4. **Logging Strategy**: Structured logging for debugging and monitoring
5. **Security First**: Input sanitization, SQL injection prevention, rate limiting

### Performance Considerations
1. **Database Indexes**: All frequently queried fields should be indexed
2. **Pagination**: All list endpoints must support pagination
3. **File Size Limits**: Enforce upload limits to prevent abuse
4. **Connection Pooling**: Reuse database connections efficiently

## File Upload Specifications

### Audio Files (Tracks)
- **Format**: MP3 only
- **Size Limit**: 15MB maximum
- **Validation**: MIME type check + file extension
- **Storage**: Supabase Storage bucket with public read access

### Video Files (Reels)  
- **Format**: MP4 only
- **Size Limit**: 50MB maximum
- **Duration Limit**: 60 seconds maximum
- **Validation**: MIME type + file extension + basic metadata check

### Image Files (Covers/Avatars)
- **Formats**: JPG, PNG, WebP
- **Size Limit**: 5MB maximum  
- **Validation**: MIME type + file extension
- **Processing**: No resizing/optimization for MVP (store original)

## Success Metrics for MVP

### Technical Success Metrics
- [ ] All API endpoints respond within 500ms under normal load
- [ ] File uploads complete successfully >95% of the time
- [ ] Zero critical security vulnerabilities
- [ ] Database queries execute efficiently (no N+1 problems)
- [ ] Test coverage >80% on business logic

### Product Success Metrics (External)
- [ ] 10+ creators successfully upload content
- [ ] 50+ listeners actively browse and like content
- [ ] Admin can manage user onboarding effectively
- [ ] Search functionality returns relevant results
- [ ] No major user-reported bugs in core flows

### Operational Success Metrics
- [ ] Deployment process is automated and reliable
- [ ] Monitoring alerts fire appropriately for errors
- [ ] Database backups are working and tested
- [ ] File storage is properly configured and secure
- [ ] Environment secrets are managed securely

## Risk Mitigation

### Technical Risks
- **Supabase Service Limits**: Monitor usage against free tier limits
- **File Storage Costs**: Implement cleanup policies for inactive content  
- **Database Performance**: Index all frequently queried columns
- **Authentication Issues**: Thoroughly test JWT validation logic

### Product Risks
- **Spam Content**: Admin moderation tools ready from day one
- **Abuse Prevention**: Rate limiting on uploads and user creation
- **Legal Compliance**: Clear terms of service for user-generated content

## Next Steps

1. **Environment Setup**: Create Supabase project and configure local development
2. **Schema Implementation**: Run database migrations and seed initial data
3. **Project Initialization**: Set up Node.js project with all tooling configured
4. **Start Phase 1**: Begin with foundation layer (auth, middleware, basic routes)

This plan serves as the single source of truth for the entire backend development process. Any changes should be documented and reviewed before implementation.