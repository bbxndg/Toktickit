# Lab 3 REST API Specification

**Product:** TokTickIT IT Service Desk  
**Sprint:** Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Base URL:** `http://localhost:4000/api` (or relative `/api`)  

---

## 1. Overview & General Conventions

- **Data Exchange Format:** JSON (`application/json`) for standard endpoints; `multipart/form-data` for file uploads.
- **Authentication Scheme:** HTTP Bearer Token (`Authorization: Bearer <jwt_token>`) or HttpOnly session cookie.
- **Timestamp Format:** ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Standard Error Response Shape:**
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED | FORBIDDEN | VALIDATION_ERROR | NOT_FOUND | CONFLICT | UNPROCESSABLE_ENTITY | INTERNAL_ERROR",
      "message": "Human-readable description of error",
      "details": [
        { "field": "password", "message": "Password must contain at least one special character" }
      ]
    }
  }
  ```
- **Standard Pagination Response Shape:**
  ```json
  {
    "data": [],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 42,
      "totalPages": 5
    }
  }
  ```

---

## 2. Authentication & Session Endpoints

### `POST /api/auth/login`
Authenticates a user with email and password.

- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "jennifer.anderson@toktickit.local",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@toktickit.local",
      "role": "REQUESTER",
      "isPasswordChangeRequired": false,
      "isActive": true
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Invalid credentials or inactive account (`isActive = false`).
  - `400 Bad Request`: Missing email or password.

---

### `POST /api/auth/logout`
Invalidates the client session token.

- **Access:** Authenticated (Any role)
- **Response (200 OK):**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

---

### `GET /api/auth/me`
Retrieves profile of the currently authenticated user.

- **Access:** Authenticated (Any role)
- **Response (200 OK):**
  ```json
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@toktickit.local",
    "role": "REQUESTER",
    "isPasswordChangeRequired": false,
    "isActive": true
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Token missing, invalid, or expired.

---

### `POST /api/auth/change-password`
Changes the user's password. Required for users flagged with `isPasswordChangeRequired = true`.

- **Access:** Authenticated (Any role)
- **Request Body:**
  ```json
  {
    "currentPassword": "InitialPassword123!",
    "newPassword": "NewSecurePassword456!",
    "confirmPassword": "NewSecurePassword456!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Password updated successfully",
    "isPasswordChangeRequired": false
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: New password does not meet complexity rules (min 8 chars, uppercase, lowercase, digit, special char) or confirmation mismatch.
  - `401 Unauthorized`: Incorrect current password.

---

## 3. Requester Ticket APIs (Lab 2 Continuation)

*Note: All Requester endpoints now strictly derive identity from the verified session token (`req.user.id`). Client-provided `requesterId` parameters are discarded.*

### `POST /api/tickets`
Creates a new ticket owned by the authenticated Requester.

- **Access:** Role: `REQUESTER`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `summary` (string, 5–100 chars, required)
  - `description` (string, 10–2000 chars, required)
  - `categoryId` (int, required)
  - `relatedSystemId` (int, required)
  - `requestedPriority` (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`, required)
  - `attachments` (file array, max 5 files, ≤ 5 MB each, JPG/PNG/WEBP/PDF)
- **Response (201 Created):**
  ```json
  {
    "id": 105,
    "ticketNumber": "TKT-2026-000105",
    "summary": "Network disconnects in room 302",
    "status": "NEW",
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "createdAt": "2026-09-17T10:00:00.000Z"
  }
  ```

---

### `GET /api/tickets`
Lists tickets belonging exclusively to the authenticated Requester.

- **Access:** Role: `REQUESTER`
- **Query Parameters:** `search`, `categoryId`, `requestedPriority`, `status`, `page`, `pageSize`
- **Response (200 OK):** Standard pagination object with Requester's tickets.

---

### `GET /api/tickets/:id`
Retrieves ticket details for the ticket owner.

- **Access:** Role: `REQUESTER` (Must own ticket)
- **Response (200 OK):** Ticket details including active and removed attachment history.
- **Error Responses:**
  - `404 Not Found`: Ticket does not exist or belongs to another user (prevents enumeration).

---

### `PATCH /api/tickets/:id/indicate-resolved`
Allows the Requester to indicate that their issue appears resolved.

- **Access:** Role: `REQUESTER` (Must own ticket)
- **Response (200 OK):**
  ```json
  {
    "id": 105,
    "status": "RESOLVED",
    "requesterResolvedIndication": true,
    "updatedAt": "2026-09-17T11:00:00.000Z"
  }
  ```

---

## 4. IT Staff Ticket Queue & Workflow APIs

### `GET /api/staff/tickets`
Retrieves the centralized IT Staff Ticket Queue with search, filters, sorting, and pagination.

- **Access:** Role: `IT_STAFF`, `ADMINISTRATOR`
- **Query Parameters:**
  - `search` (string): Searches ticketNumber and summary.
  - `categoryId` (int): Filters by category.
  - `requestedPriority` (string): `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`.
  - `itPriority` (string): `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`.
  - `status` (string): `NEW` | `OPEN` | `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | `RESOLVED` | `CLOSED` | `REOPENED` | `CANCELLED`.
  - `ownerId` (int | 'unassigned'): Filters by assigned owner or unassigned tickets.
  - `sortBy` (string): `createdAt` | `ticketNumber` | `requestedPriority` | `itPriority` | `status` (default: `createdAt`).
  - `sortOrder` (string): `asc` | `desc` (default: `desc`).
  - `page` (int, default: 1), `pageSize` (int, default: 10).
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 105,
        "ticketNumber": "TKT-2026-000105",
        "summary": "Network disconnects in room 302",
        "category": { "id": 4, "name": "Network" },
        "requestedPriority": "HIGH",
        "itPriority": "HIGH",
        "status": "OPEN",
        "owner": {
          "id": 2,
          "name": "Michael Brown",
          "email": "michael.brown@toktickit.local"
        },
        "requester": {
          "id": 1,
          "name": "Jennifer Anderson"
        },
        "createdAt": "2026-09-17T10:00:00.000Z",
        "updatedAt": "2026-09-17T10:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 1,
      "totalPages": 1
    },
    "queueCounts": {
      "total": 1,
      "unassigned": 0,
      "open": 1,
      "inProgress": 0
    }
  }
  ```

---

### `GET /api/staff/tickets/:id`
Retrieves full operational ticket details for IT Staff.

- **Access:** Role: `IT_STAFF`, `ADMINISTRATOR`
- **Response (200 OK):** Complete ticket object including owner, IT priority, category, system, requester info, attachments count, and permitted actions.

---

### `PATCH /api/staff/tickets/:id/claim`
Claims ticket ownership for the currently authenticated IT Staff member.

- **Access:** Role: `IT_STAFF`, `ADMINISTRATOR`
- **Response (200 OK):**
  ```json
  {
    "id": 105,
    "ownerId": 2,
    "owner": { "id": 2, "name": "Michael Brown" },
    "status": "OPEN",
    "updatedAt": "2026-09-17T10:30:00.000Z"
  }
  ```

---

### `PATCH /api/staff/tickets/:id/assign`
Reassigns ticket ownership to another active staff member or unassigns it.

- **Access:** Role: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "ownerId": 3
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Specified user is not an active IT Staff or Administrator.

---

### `PATCH /api/staff/tickets/:id/priority`
Updates the operational IT Priority of the ticket.

- **Access:** Role: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "itPriority": "CRITICAL"
  }
  ```

---

### `PATCH /api/staff/tickets/:id/status`
Transitions ticket status according to the permitted status transition matrix.

- **Access:** Role: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "status": "IN_PROGRESS",
    "reason": "Investigating switch port configurations"
  }
  ```
- **Error Responses:**
  - `422 Unprocessable Entity`: Status transition not permitted by workflow rules.

---

## 5. Collaboration APIs (Comments & Notes)

### `GET /api/tickets/:id/comments`
Retrieves public comments for a ticket.

- **Access:** Role: `REQUESTER` (owner), `IT_STAFF`, `ADMINISTRATOR`
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "ticketId": 105,
      "content": "Can you confirm which port you are connected to?",
      "createdAt": "2026-09-17T10:45:00.000Z",
      "author": {
        "id": 2,
        "name": "Michael Brown",
        "role": "IT_STAFF"
      }
    }
  ]
  ```

---

### `POST /api/tickets/:id/comments`
Adds a public comment to the ticket thread.

- **Access:** Role: `REQUESTER` (owner), `IT_STAFF`, `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "content": "Connected to port 3B on the wall outlet."
  }
  ```
- **Response (201 Created):** Created comment object.

---

### `GET /api/tickets/:id/notes`
Retrieves confidential internal notes for a ticket.

- **Access:** Role: `IT_STAFF`, `ADMINISTRATOR` (Blocked for `REQUESTER`)
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "ticketId": 105,
      "content": "Upstream switch Cisco 2960 flapping periodically.",
      "createdAt": "2026-09-17T10:50:00.000Z",
      "author": {
        "id": 2,
        "name": "Michael Brown",
        "role": "IT_STAFF"
      }
    }
  ]
  ```
- **Error Responses:**
  - `403 Forbidden`: Requester attempted to access internal notes.

---

### `POST /api/tickets/:id/notes`
Appends an internal note to the ticket.

- **Access:** Role: `IT_STAFF`, `ADMINISTRATOR` (Blocked for `REQUESTER`)
- **Request Body:**
  ```json
  {
    "content": "Escalated to network infrastructure team."
  }
  ```
- **Response (201 Created):** Created note object.

---

## 6. Administrator User Management APIs

### `GET /api/admin/users`
Lists all user accounts with search and role filtering.

- **Access:** Role: `ADMINISTRATOR`
- **Query Parameters:**
  - `search` (string): Matches name or email.
  - `role` (string): `REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`.
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@toktickit.local",
      "role": "REQUESTER",
      "isActive": true,
      "isPasswordChangeRequired": false,
      "createdAt": "2026-09-01T08:00:00.000Z"
    }
  ]
  ```

---

### `POST /api/admin/users`
Creates a new user account with an initial password.

- **Access:** Role: `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.local",
    "role": "IT_STAFF",
    "initialPassword": "InitialPassword123!",
    "isActive": true
  }
  ```
- **Response (201 Created):** Created user profile without password hash.
- **Error Responses:**
  - `409 Conflict`: Email already exists.
  - `400 Bad Request`: Validation failure.

---

### `PATCH /api/admin/users/:id`
Updates an existing user account's name, email, role, or active status.

- **Access:** Role: `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.local",
    "role": "IT_STAFF",
    "isActive": false
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Attempting to deactivate own administrator account (BR-17) or deactivating the last active administrator (BR-18).
  - `409 Conflict`: Email taken by another user.

---

### `POST /api/admin/users/:id/reset-password`
Sets a new initial password for a user account, requiring a password change on their next login.

- **Access:** Role: `ADMINISTRATOR`
- **Request Body:**
  ```json
  {
    "initialPassword": "TempPassword999!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Initial password set successfully; user must change password upon next login"
  }
  ```

---

## 7. Reference Data APIs

### `GET /api/categories`
Retrieves active ticket categories (`id`, `name`).

### `GET /api/related-systems`
Retrieves active related systems (`id`, `name`).

### `GET /api/staff/members`
Retrieves active IT Staff and Administrator users for ticket assignment dropdowns (`id`, `name`, `email`, `role`).

