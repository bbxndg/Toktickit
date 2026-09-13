# Lab 2 REST API Specification

**Product:** TokTickIT IT Service Desk  
**Sprint:** Lab 2 — Requester Ticketing MVP  
**Base URL:** `http://localhost:5000/api` (or relative `/api`)  

---

## 1. Overview & General Conventions

- **Data Exchange Format:** JSON (`application/json`) for standard endpoints; `multipart/form-data` for file uploads.
- **Timestamp Format:** ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Standard Error Response Shape:**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR | FORBIDDEN | NOT_FOUND | GONE | INTERNAL_ERROR",
      "message": "Human-readable description of error",
      "details": [
        { "field": "summary", "message": "Summary must be at least 5 characters" }
      ]
    }
  }
  ```

---

## 2. Endpoints

### 2.1. Reference Data & Requester Endpoints

#### `GET /api/requesters`
Retrieves all active Development Requesters for the simulated session picker. Inactive requesters (`isActive = false`) are excluded.

- **Request:** None
- **Response (200 OK):**
  ```json
  [
    {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.anderson@example.com",
      "department": "Human Resources",
      "isActive": true
    },
    {
      "id": 2,
      "name": "Michael Brown",
      "email": "michael.brown@example.com",
      "department": "Engineering",
      "isActive": true
    }
  ]
  ```

#### `GET /api/categories`
Retrieves all active ticket categories.

- **Request:** None
- **Response (200 OK):**
  ```json
  [
    { "id": 1, "name": "Account and Access", "isActive": true },
    { "id": 2, "name": "Hardware", "isActive": true },
    { "id": 3, "name": "Software", "isActive": true },
    { "id": 4, "name": "Network", "isActive": true }
  ]
  ```

#### `GET /api/related-systems`
Retrieves all active related systems.

- **Request:** None
- **Response (200 OK):**
  ```json
  [
    { "id": 1, "name": "Corporate Laptop", "isActive": true },
    { "id": 2, "name": "Email", "isActive": true },
    { "id": 3, "name": "Campus Wi-Fi", "isActive": true },
    { "id": 4, "name": "VPN", "isActive": true },
    { "id": 5, "name": "LEB2 App", "isActive": true },
    { "id": 6, "name": "Grade Submission App", "isActive": true },
    { "id": 7, "name": "Printer", "isActive": true }
  ]
  ```

---

### 2.2. Ticket Management Endpoints

#### `POST /api/tickets`
Creates a new support ticket under the active Development Requester. Supports optional initial attachments uploaded via `multipart/form-data`.

- **Headers:** `Content-Type: multipart/form-data`
- **Request Fields:**
  - `requesterId` (number, required): ID of active requester.
  - `categoryId` (number, required): Valid category ID.
  - `relatedSystemId` (number, required): Valid system ID.
  - `requestedPriority` (string, required): `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
  - `summary` (string, required): 5–100 characters, trimmed.
  - `description` (string, required): 10–2000 characters, trimmed.
  - `attachments` (files, optional): Up to 5 files (max 5 MB each; JPG, PNG, WEBP, PDF).
- **Response (201 Created):**
  ```json
  {
    "id": 101,
    "ticketNumber": "TKT-2026-000001",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery drains much faster than usual even when idle.",
    "requestedPriority": "MEDIUM",
    "itPriority": null,
    "status": "NEW",
    "requesterId": 1,
    "categoryId": 2,
    "relatedSystemId": 1,
    "createdAt": "2026-09-04T08:30:00.000Z",
    "updatedAt": "2026-09-04T08:30:00.000Z",
    "requester": { "id": 1, "name": "Jennifer Anderson" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 1, "name": "Corporate Laptop" },
    "attachments": [
      {
        "id": 1,
        "originalName": "battery_report.pdf",
        "sizeBytes": 204800,
        "mimeType": "application/pdf",
        "isRemoved": false,
        "createdAt": "2026-09-04T08:30:00.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure (missing required fields, summary length < 5, invalid file type, file size > 5 MB, or > 5 files).

---

#### `GET /api/tickets`
Retrieves a paginated list of tickets owned by the requesting user. Enforces strict requester isolation (`requesterId` filter is mandatory).

- **Query Parameters:**
  - `requesterId` (number, **required**): Context requester ID.
  - `search` (string, optional): Search keyword against `ticketNumber` and `summary`.
  - `categoryId` (number, optional): Filter by category.
  - `requestedPriority` (string, optional): Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - `status` (string, optional): Filter by status (`NEW`, `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
  - `sortBy` (string, optional, default: `createdAt`): `createdAt`, `ticketNumber`, `summary`, `status`.
  - `sortOrder` (string, optional, default: `desc`): `asc`, `desc`.
  - `page` (number, optional, default: 1): Page number (1-indexed).
  - `pageSize` (number, optional, default: 8): Items per page (max: 50).
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000001",
        "summary": "Laptop battery drains quickly",
        "requestedPriority": "MEDIUM",
        "itPriority": "MEDIUM",
        "status": "NEW",
        "createdAt": "2026-09-04T08:30:00.000Z",
        "updatedAt": "2026-09-04T08:30:00.000Z",
        "category": { "id": 2, "name": "Hardware" },
        "relatedSystem": { "id": 1, "name": "Corporate Laptop" },
        "activeAttachmentsCount": 1
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 8,
      "totalItems": 1,
      "totalPages": 1
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing `requesterId` or invalid pagination numbers.

---

#### `GET /api/tickets/:id`
Retrieves detailed information for a single ticket, including all attachment metadata.

- **Query Parameters:**
  - `requesterId` (number, **required**): For ownership verification.
- **Response (200 OK):**
  ```json
  {
    "id": 101,
    "ticketNumber": "TKT-2026-000001",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery drains much faster than usual even when the system is idle.",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "status": "NEW",
    "requesterId": 1,
    "categoryId": 2,
    "relatedSystemId": 1,
    "createdAt": "2026-09-04T08:30:00.000Z",
    "updatedAt": "2026-09-04T08:30:00.000Z",
    "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 1, "name": "Corporate Laptop" },
    "attachments": [
      {
        "id": 1,
        "originalName": "battery_report.pdf",
        "sizeBytes": 204800,
        "mimeType": "application/pdf",
        "isRemoved": false,
        "removedAt": null,
        "removalReason": null,
        "createdAt": "2026-09-04T08:30:00.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - `403 Forbidden` or `404 Not Found`: Ticket belongs to a different requester or does not exist.

---

### 2.3. Attachment Lifecycle Endpoints

#### `POST /api/tickets/:id/attachments`
Uploads an additional attachment to an existing ticket owned by the requester.

- **Headers:** `Content-Type: multipart/form-data`
- **Form Fields:**
  - `requesterId` (number, required): Owner verification.
  - `file` (file, required): JPG, PNG, WEBP, or PDF ≤ 5 MB.
- **Validation Rules:**
  - Must own ticket (`ticket.requesterId == requesterId`).
  - Active attachment count on this ticket must currently be < 5.
- **Response (201 Created):**
  ```json
  {
    "id": 2,
    "ticketId": 101,
    "originalName": "error_screen.png",
    "sizeBytes": 512000,
    "mimeType": "image/png",
    "isRemoved": false,
    "createdAt": "2026-09-04T09:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Disallowed MIME type, size > 5 MB, or active attachments limit (5) exceeded.
  - `403 Forbidden`: Requester does not own this ticket.
  - `404 Not Found`: Ticket not found.

---

#### `GET /api/attachments/:id/download`
Downloads the binary content of an active attachment file.

- **Query Parameters:**
  - `requesterId` (number, **required**): For ownership verification.
- **Response (200 OK):**
  - Binary file stream with headers:
    - `Content-Disposition: attachment; filename="battery_report.pdf"`
    - `Content-Type: application/pdf`
- **Error Responses:**
  - `410 Gone` or `404 Not Found`: If `isRemoved == true` (removed files cannot be downloaded).
  - `403 Forbidden`: If the attachment belongs to a ticket owned by another requester.

---

#### `PATCH /api/attachments/:id/remove`
Performs a soft-removal of an attachment, logging a required removal reason.

- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "requesterId": 1,
    "removalReason": "Uploaded incorrect log file containing private information."
  }
  ```
- **Validation Rules:**
  - `removalReason` must be a non-empty string (min 3 characters).
  - Requester must own the ticket associated with this attachment.
  - Attachment must not already be removed.
- **Response (200 OK):**
  ```json
  {
    "id": 1,
    "ticketId": 101,
    "originalName": "battery_report.pdf",
    "isRemoved": true,
    "removedAt": "2026-09-04T09:15:00.000Z",
    "removalReason": "Uploaded incorrect log file containing private information."
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing or empty `removalReason`.
  - `403 Forbidden`: Unauthorized requester.
  - `404 Not Found`: Attachment not found.

