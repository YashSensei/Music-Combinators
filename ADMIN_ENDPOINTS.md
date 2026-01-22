# Admin API Endpoints

All admin endpoints require:
- **Authentication**: Bearer token in Authorization header
- **Role**: Admin role required
- **Base URL**: `http://localhost:3000/api/admin`

---

## Platform Statistics

### Get Platform Stats
```http
GET /api/admin/stats
Authorization: Bearer <ADMIN_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 25,
      "waitlisted": 10,
      "active": 14,
      "banned": 1,
      "listeners": 20,
      "creators": 4,
      "admins": 1
    },
    "content": {
      "tracks": 15,
      "reels": 8
    },
    "pending": {
      "creator_applications": 3
    }
  }
}
```

---

## Waitlist Management

### Get Waitlisted Users
```http
GET /api/admin/waitlist?page=1&limit=50
Authorization: Bearer <ADMIN_TOKEN>
```

**Query Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Results per page, default 50

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "role": "listener",
        "status": "waitlisted",
        "created_at": "2026-01-20T10:30:00Z",
        "username": "user123",
        "display_name": "John Doe",
        "bio": "Music lover",
        "avatar_url": "https://..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### Approve Single User by Email
```http
POST /api/admin/users/approve
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "listener",
    "status": "active",
    "approved_at": "2026-01-22T16:00:00Z",
    "username": "user123",
    "display_name": "John Doe"
  }
}
```

**Note:** Only changes status to `active`, role remains `listener`

### Batch Approve Users (FIFO)
```http
POST /api/admin/users/batch-approve
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "count": 10
}
```

**Request Body:**
- `count` (required): Number of users to approve (min: 1, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "approved": [
      {
        "id": "uuid",
        "role": "listener",
        "status": "active",
        "approved_at": "2026-01-22T16:00:00Z",
        "username": "user1",
        "display_name": "User One"
      }
    ],
    "count": 10,
    "message": "Successfully approved 10 user(s)"
  }
}
```

**Note:** Approves oldest waitlisted users first (first-come-first-served)

---

## User Moderation

### Ban User
```http
POST /api/admin/users/:userId/ban
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "reason": "Violation of community guidelines"
}
```

**URL Parameters:**
- `userId` (required): UUID of user to ban

**Request Body:**
- `reason` (optional): Reason for banning

**Response:**
```json
{
  "success": true,
  "message": "User banned successfully",
  "data": {
    "id": "uuid",
    "status": "banned",
    "username": "user123"
  }
}
```

**Note:** Admin cannot ban themselves

### Unban User
```http
POST /api/admin/users/:userId/unban
Authorization: Bearer <ADMIN_TOKEN>
```

**URL Parameters:**
- `userId` (required): UUID of user to unban

**Response:**
```json
{
  "success": true,
  "message": "User unbanned successfully",
  "data": {
    "id": "uuid",
    "status": "active",
    "username": "user123"
  }
}
```

---

## Creator Applications

### Get Pending Creator Applications
```http
GET /api/admin/creator-applications?page=1&limit=20
Authorization: Bearer <ADMIN_TOKEN>
```

**Query Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Results per page, default 20

**Response:**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "artist_name": "DJ Artist",
        "genre": "Electronic",
        "bio": "Producer and DJ...",
        "sample_work_url": "https://soundcloud.com/...",
        "status": "pending",
        "created_at": "2026-01-21T10:00:00Z",
        "user": {
          "username": "user123",
          "display_name": "John Doe",
          "avatar_url": "https://..."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

### Approve Creator Application
```http
POST /api/admin/creator-applications/:applicationId/approve
Authorization: Bearer <ADMIN_TOKEN>
```

**URL Parameters:**
- `applicationId` (required): UUID of application to approve

**Response:**
```json
{
  "success": true,
  "data": {
    "application_id": "uuid",
    "user": {
      "id": "uuid",
      "role": "creator",
      "username": "user123",
      "display_name": "John Doe"
    },
    "message": "Creator application approved successfully"
  }
}
```

**Note:** Only changes role to `creator`, status remains unchanged (waitlisted/active)

### Reject Creator Application
```http
POST /api/admin/creator-applications/:applicationId/reject
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "reason": "Insufficient portfolio samples"
}
```

**URL Parameters:**
- `applicationId` (required): UUID of application to reject

**Request Body:**
- `reason` (optional): Reason for rejection

**Response:**
```json
{
  "success": true,
  "data": {
    "application_id": "uuid",
    "user_id": "uuid",
    "status": "rejected",
    "message": "Creator application rejected"
  }
}
```

---

## Content Moderation

### Delete Track
```http
DELETE /api/admin/tracks/:trackId
Authorization: Bearer <ADMIN_TOKEN>
```

**URL Parameters:**
- `trackId` (required): UUID of track to delete

**Response:**
```json
{
  "success": true,
  "message": "Track deleted successfully"
}
```

**Note:** 
- Admin can delete ANY track (bypasses ownership check)
- Deletes from database and removes files from storage

### Delete Reel
```http
DELETE /api/admin/reels/:reelId
Authorization: Bearer <ADMIN_TOKEN>
```

**URL Parameters:**
- `reelId` (required): UUID of reel to delete

**Response:**
```json
{
  "success": true,
  "message": "Reel deleted successfully"
}
```

**Note:** 
- Admin can delete ANY reel (bypasses ownership check)
- Deletes from database and removes files from storage

---

## Error Responses

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "message": "Admin role required"
  }
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "message": "Email is required"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "User not found or already approved"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "Internal server error"
  }
}
```

---

## Summary

**Total Endpoints: 11**

| Category | Count |
|----------|-------|
| Platform Stats | 1 |
| Waitlist Management | 3 |
| User Moderation | 2 |
| Creator Applications | 3 |
| Content Moderation | 2 |
