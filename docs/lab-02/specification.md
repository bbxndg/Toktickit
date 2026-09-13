# Lab 2 Sprint Engineering Specification

**Product:** TokTickIT IT Service Desk  
**Sprint:** Lab 2 — Requester Ticketing MVP with UI Foundation  
**Status:** Approved Specification  

---

## 1. Sprint Goal

Deliver a responsive, user-friendly Requester MVP for TokTickIT using the Zen Green design language. The increment enables end-user Requesters (simulated via a temporary Development Requester selection mechanism) to create IT support tickets with permitted attachments, view their submitted tickets in a paginated and filterable list with strict cross-requester ownership isolation, view ticket details in read-only mode, and manage attachments with soft-removal rules.

---

## 2. Stakeholder Request Interpretation

The IT Department needs an operational MVP for end-users (Requesters) to log support tickets with attachments and track their progress. To deliver value before full authentication is implemented in Lab 3, a Development Requester selector will simulate multi-user sessions for testing data ownership. The solution must enforce strict data boundaries (users can only see and manage their own tickets), provide seamless search/filter/pagination capabilities, handle file attachment policies (types, sizes, soft removal with reasons), and establish a reusable Zen Green design system across all screens and device sizes.

---

## 3. Scope

### 3.1. Included
- **Development Requester Context**:
  - Seeded active and inactive Requesters in PostgreSQL.
  - Dropdown selector interface displaying only active Requesters.
  - Global application state and shell indicating the current active Requester.
  - Seamless "Change Requester" action allowing session switching.
- **Ticket Creation (Create Mode)**:
  - System-generated unique Ticket Number (`TKT-YYYY-XXXXXX`).
  - Read-only Requester and Ticket Date fields.
  - Category, Related System, Requested Priority dropdowns.
  - Summary and Description input fields with character constraints and trimming.
  - Initial file attachment picker (max 5 files, ≤ 5MB each, JPEG/PNG/WEBP/PDF).
  - Validation messages beneath affected inputs and busy state during submission.
- **My Tickets (List Mode)**:
  - Paginated list showing only tickets owned by the current Requester.
  - Real-time search across Ticket Number and Summary.
  - Filtering by Category, Requested Priority, and Status.
  - Multi-column sorting (default: Created Date descending).
  - Clear Filters action, Empty State (no tickets ever created), and No-Results State (filters matched 0).
  - Responsive layout: clean table on Desktop (≥992px) and cards/compact layout on Mobile (<768px).
- **Requester Ticket Detail (View Mode)**:
  - Read-only display of all ticket header fields with Zen Green read-only styling.
  - Attachment section showing active and soft-removed attachments.
  - Download link for active attachments.
  - Add attachment button (disabled if 5 active attachments reached).
  - Soft-removal modal requiring a removal reason; removed files retain metadata but cannot be downloaded.
  - Backend ownership enforcement preventing unauthorized access to other users' tickets.

### 3.2. Explicitly Excluded
- Real authentication, passwords, tokens, JWT, session cookies, and RBAC (deferred to Lab 3).
- IT Staff dashboard, queue management, claiming/assigning tickets, and changing IT Priority.
- Ticket collaboration features: Public Comments, Internal Notes, and Actions Taken.
- Ticket status transitions beyond initial `New` state (no resolving, closing, reopening, or canceling).
- Administrative functions (managing categories, systems, users).

---

## 4. Functional Requirements

- **FR-01**: The system shall provide a Development Requester selector listing all active Requesters from the database to establish session context.
- **FR-02**: The application shell shall display the active Requester name and a "Change Requester" action across all pages.
- **FR-03**: The system shall allow a Requester to create a ticket by selecting Category, Related System, Requested Priority, and inputting Summary and Description.
- **FR-04**: The system shall automatically generate a unique official Ticket Number (`TKT-YYYY-XXXXXX`) and set initial status to `New`.
- **FR-05**: The system shall allow uploading up to 5 attachments during or after ticket creation, restricted to JPG/JPEG, PNG, WEBP, and PDF under 5 MB per file.
- **FR-06**: The system shall list all tickets belonging exclusively to the currently selected Requester in "My Tickets".
- **FR-07**: The system shall support keyword search, category filtering, priority filtering, status filtering, and column sorting in "My Tickets".
- **FR-08**: The system shall provide pagination controls (Page size default 8, next/previous and page numbers) with total count indicators.
- **FR-09**: The system shall display ticket details in read-only mode for the ticket owner.
- **FR-10**: The system shall allow ticket owners to add permitted attachments to an existing ticket up to the active limit of 5.
- **FR-11**: The system shall allow ticket owners to soft-remove an attachment by providing a mandatory removal reason.
- **FR-12**: The system shall allow downloading active attachments while preventing the download or preview of soft-removed attachments.

---

## 5. Business Rules

- **BR-01 (Ticket Number Generation)**: Official Ticket Numbers are generated by the backend upon creation in the format `TKT-YYYY-XXXXXX` (e.g., `TKT-2026-000001`), guaranteed unique.
- **BR-02 (Initial Status)**: Every newly created ticket begins with Current Status `New`.
- **BR-03 (Testing Context)**: Development Requester Selection is strictly a test fixture for Lab 2 and does not constitute secure authentication.
- **BR-04 (Ownership Isolation)**: A Requester can only view, search, open, and modify tickets where `requesterId` matches their active session context. Accessing another user's ticket directly returns HTTP 403 Forbidden or 404 Not Found.
- **BR-05 (Inactive Requesters)**: Inactive Requesters (`isActive = false`) must never appear in the Requester selector dropdown.
- **BR-06 (Attachment Constraints)**:
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Maximum size per file: 5,242,880 bytes (5 MB).
  - Maximum active attachments per ticket: 5.
- **BR-07 (Soft Removal)**: Attachments are never deleted from storage or database rows. When removed, `isRemoved` is set to `true`, `removedAt` is stamped, and a non-empty `removalReason` must be recorded.
- **BR-08 (Download Restrictions)**: Soft-removed attachments cannot be downloaded or previewed. The download API must reject requests with HTTP 410 Gone or 404 Not Found.
- **BR-09 (Metadata Preservation)**: Soft-removed attachments remain listed in the Ticket Detail attachment history displaying their original filename, upload date, removed timestamp, and removal reason.
- **BR-10 (Field Validation & Trimming)**:
  - Summary: Required, trimmed string, min 5 characters, max 100 characters.
  - Description: Required, trimmed string, min 10 characters, max 2,000 characters.
  - Category & Related System: Required, must exist and be active in database.
  - Requested Priority: Required, enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **BR-11 (Duplicate Submission Prevention)**: The submit button must enter a busy state and be disabled immediately upon submission to prevent multiple clicks.
- **BR-12 (Error State Data Preservation)**: If submission or network request fails, entered form values must remain intact in the form fields.
- **BR-13 (Context Switching Reset)**: Switching the active Development Requester reloads all user-specific data and redirects back to the main view if current ticket does not belong to the new user.
- **BR-14 (Default Sorting)**: My Tickets default sort order is `createdAt` descending. Secondary sort is `ticketNumber` descending.

---

## 6. UI Specification Summary

The interface conforms strictly to the **Zen Green Theme**:
- **Primary Green (`#006B3C`)**: Application header navbar, primary call-to-action buttons, active badges.
- **Secondary Green (`#0B7A46`)**: Hover states, active tabs, focus rings, link accents.
- **Pale Green (`#EAF6EF`)**: Selected items, subtle card backgrounds, success alert banners.
- **Page Background (`#F5F7F6`)**: Subtle neutral canvas.
- **Surface / Cards**: Pure white (`#FFFFFF`) with border `#D1D5DB` and soft box-shadow.
- **Text**: Dark charcoal-green (`#1A2E26`) for high readability.
- **Read-only Fields**: Background `#E8EFEA` with neutral border `#CBD5E1`.
- **Error States**: Dark red text (`#B91C1C`) with border `#DC2626`, displayed directly below invalid inputs.
- **Responsive Layout**:
  - Desktop (≥992px): Multi-column grid, full data table.
  - Tablet (768-991px): Two-column forms, scrollable or condensed table.
  - Mobile (<768px): Single-column stacked layout, ticket cards instead of wide table, touch-friendly touch targets (min 44px height).

---

## 7. Data Changes (Prisma Schema & PostgreSQL)

### 7.1. Prisma Models
- **`RequesterUser`**:
  - `id`: Int (Primary Key, autoincrement)
  - `name`: String
  - `email`: String (Unique)
  - `department`: String
  - `isActive`: Boolean (Default `true`)
  - `tickets`: Relation `Ticket[]`
- **`Category`**:
  - `id`: Int (Primary Key, autoincrement)
  - `name`: String (Unique)
  - `isActive`: Boolean (Default `true`)
  - `tickets`: Relation `Ticket[]`
- **`RelatedSystem`**:
  - `id`: Int (Primary Key, autoincrement)
  - `name`: String (Unique)
  - `isActive`: Boolean (Default `true`)
  - `tickets`: Relation `Ticket[]`
- **`Ticket`**:
  - `id`: Int (Primary Key, autoincrement)
  - `ticketNumber`: String (Unique, Indexed)
  - `summary`: String
  - `description`: String (Text)
  - `requestedPriority`: Priority (Enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `itPriority`: Priority? (Nullable)
  - `status`: TicketStatus (Enum: `NEW`, `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, Default `NEW`)
  - `requesterId`: Int (FK to RequesterUser)
  - `categoryId`: Int (FK to Category)
  - `relatedSystemId`: Int (FK to RelatedSystem)
  - `createdAt`: DateTime (Default `now()`)
  - `updatedAt`: DateTime (Updated on change)
  - `attachments`: Relation `Attachment[]`
- **`Attachment`**:
  - `id`: Int (Primary Key, autoincrement)
  - `ticketId`: Int (FK to Ticket, Indexed)
  - `filename`: String (Stored disk filename/UUID)
  - `originalName`: String
  - `mimeType`: String
  - `sizeBytes`: Int
  - `isRemoved`: Boolean (Default `false`, Indexed)
  - `removedAt`: DateTime? (Nullable)
  - `removalReason`: String? (Nullable)
  - `createdAt`: DateTime (Default `now()`)

### 7.2. Database Design Decisions & Justification
- **Soft-Removal Pattern**: Attachments use `isRemoved`, `removedAt`, and `removalReason` flags instead of physical deletion to comply with IT audit logging requirements and stakeholder retention rules.
- **Compound Index on Ticket**: Index on `[requesterId, createdAt]` optimizes the primary query in "My Tickets" which filters by requester and sorts by creation date.
- **Separate RequesterUser Model**: Modeled cleanly so that Lab 3 can replace this table with an authentic `User` / `Account` schema with minimal foreign key disruption.

### 7.3. Seed Requirements
- 4 Categories: `Account and Access`, `Hardware`, `Software`, `Network`.
- 7 Related Systems: `Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`.
- 4+ Active Requesters: Jennifer Anderson, Michael Brown, Sarah Johnson, David Lee.
- 1+ Inactive Requester: John Doe (Inactive).
- Seed execution must be idempotent via `upsert`.

---

## 8. API Contract Summary

*(Full endpoint schemas, headers, and payloads defined in `docs/lab-02/api-spec.md`)*
- `GET /api/requesters`: List active Development Requesters.
- `GET /api/categories`: List active categories.
- `GET /api/related-systems`: List active related systems.
- `POST /api/tickets`: Create ticket with optional attachments (returns 201).
- `GET /api/tickets`: Paginated ticket query for current requester (`?requesterId=X&page=1&pageSize=8&search=...`).
- `GET /api/tickets/:id`: Retrieve single ticket detail (enforces `requesterId` ownership).
- `POST /api/tickets/:id/attachments`: Upload attachment to ticket.
- `GET /api/attachments/:id/download`: Download active attachment file.
- `PATCH /api/attachments/:id/remove`: Soft-remove attachment with reason.

---

## 9. Acceptance Criteria (Given-When-Then)

- **AC-01 (Create Valid Ticket)**:
  - **Given** a valid Requester is selected,
  - **When** the Requester fills all required fields with valid data and submits,
  - **Then** the ticket is saved with status `New`, an official Ticket Number (`TKT-YYYY-XXXXXX`) is returned, and the user is redirected or shown success feedback.
- **AC-02 (Validation Errors on Submit)**:
  - **Given** invalid or empty fields (e.g. Summary < 5 characters),
  - **When** the Requester submits the form,
  - **Then** the API returns HTTP 400, no ticket is created, and specific error messages appear immediately below the invalid fields.
- **AC-03 (Attachment Size and Type Validation)**:
  - **Given** an attachment file > 5 MB or of disallowed type (e.g., `.exe`, `.zip`),
  - **When** the file is selected or uploaded,
  - **Then** the client/server rejects the file with an explicit validation error message.
- **AC-04 (Maximum 5 Active Attachments)**:
  - **Given** a ticket with 5 active attachments,
  - **When** the Requester attempts to add a 6th attachment,
  - **Then** the add action is disabled or returns an error indicating the 5 active attachments limit.
- **AC-05 (Requester Isolation in My Tickets)**:
  - **Given** Requester A has tickets and Requester B has tickets,
  - **When** Requester A views "My Tickets",
  - **Then** only Requester A's tickets appear. When switching context to Requester B, Requester A's tickets disappear and Requester B's tickets appear.
- **AC-06 (Ticket Detail Ownership Protection)**:
  - **Given** Ticket 101 belongs to Requester A,
  - **When** Requester B attempts to access `GET /api/tickets/101?requesterId=B`,
  - **Then** the server responds with HTTP 403 or 404, returning no ticket details.
- **AC-07 (Soft Removal of Attachment)**:
  - **Given** an active attachment on an owned ticket,
  - **When** the Requester provides a removal reason and confirms removal,
  - **Then** `isRemoved` becomes `true`, the attachment cannot be downloaded, and its metadata is shown in the removed history.
- **AC-08 (Download Blocked for Removed File)**:
  - **Given** a soft-removed attachment,
  - **When** a user attempts to call `GET /api/attachments/:id/download`,
  - **Then** the server returns HTTP 410 Gone or 404 Not Found.
- **AC-09 (Search and Filtering in My Tickets)**:
  - **Given** a list of owned tickets,
  - **When** a search term or category filter is applied,
  - **Then** only matching tickets are displayed in the list.
- **AC-10 (Inactive Requester Hidden)**:
  - **Given** seeded active and inactive Requesters,
  - **When** opening the Requester selection dropdown,
  - **Then** only active Requesters are shown in the dropdown.

---

## 10. Definition of Done (DoD)

- [ ] All specified functional requirements (`FR-01` to `FR-12`) and business rules (`BR-01` to `BR-14`) implemented.
- [ ] Database schema migrated and seeded idempotently with required categories, systems, and requesters.
- [ ] UI implemented in Zen Green styling matching desktop, tablet, and mobile responsiveness specifications.
- [ ] All planned automated unit, API, and UI tests pass 100% on the `main` branch.
- [ ] End-to-end user flow verified using Playwright.
- [ ] Screenshots captured in 3 viewports for Create Ticket, My Tickets, and Ticket Detail.
- [ ] Peer reviews documented with PR links, comments, and approvals in `reviewer.md`.
- [ ] AI prompts and reflection documented in `ai-use.md`.
- [ ] All feature branches merged via Pull Requests into `lab2-staging` before final release PR into `main`.

---

## 11. Assumptions and Decisions

1. **Storage of Uploaded Files**: Files will be saved in `server/uploads/attachments/` on the local filesystem with unique UUID-based filenames to avoid collision, while preserving `originalName` in PostgreSQL.
2. **Ticket Number Format**: Sequential increment per year formatted as `TKT-{YYYY}-{000001}` generated inside a database transaction to prevent duplicate collision.
3. **Session Simulation**: Requester selection is saved in browser LocalStorage (`toktickit_requester_id`) for seamless page refreshes during evaluation.

