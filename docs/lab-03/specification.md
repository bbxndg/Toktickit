# Lab 3 Sprint Engineering Specification

**Product:** TokTickIT IT Service Desk  
**Sprint:** Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Status:** Approved Specification  

---

## 1. Sprint Goal

Evolve TokTickIT from a single-role prototype with simulated requester selection into a secure, role-based IT Service Desk platform. This sprint establishes real credential-based authentication with mandatory first-login password changes, role-based authorization for three distinct roles (**Requester**, **IT Staff**, and **Administrator**), an operational IT Staff Ticket Queue with ownership assignment and status workflows, collaborative Public Comments and role-restricted Internal Notes, and a minimalist Administrator User Management interface—while ensuring all Lab 2 Requester capabilities continue without regression.

---

## 2. Stakeholder Request Interpretation

The stakeholder requires replacing the temporary Development Requester selector with real authentication. Users must log in using email and password, and any user provided an initial password must be forced to set a new password before entering the application. 

The system now serves three roles with strict separation of duties:
1. **Requesters** continue logging, tracking, and viewing their own tickets and attachments, and can communicate through Public Comments and signal when a problem appears resolved.
2. **IT Staff** manage a centralized Ticket Queue, claim or reassign ticket ownership, adjust IT Priority, transition tickets through permitted workflow statuses, communicate publicly with requesters, and record private Internal Notes.
3. **Administrators** manage user accounts (create, update profile, assign role, activate/deactivate, reset initial passwords) via a minimalist interface with strict safety protections preventing self-deactivation and elimination of the last administrator.

Every screen and API endpoint must enforce role and ownership boundaries on the server; hidden client controls are visual aids, not security controls.

---

## 3. Scope

### 3.1. Included
- **Authentication & Credential Management**:
  - Secure login with email and hashed password (bcrypt).
  - Session/token management with safe error responses for invalid or inactive accounts.
  - Mandatory First-Login Password Change workflow blocking app access until a compliant password is set.
  - Logout action that invalidates authenticated access.
  - Authenticated application shell displaying current user's name, role badge, and profile/logout actions.
- **Requester Continuation & Collaboration (Role: Requester)**:
  - Removal of Development Requester selector; identity is bound strictly to the authenticated session.
  - Creation, listing, and read-only viewing of owned tickets and permitted attachments (continuing Lab 2 rules).
  - Public Comments thread on Ticket Detail with append-only capability.
  - "Problem Appears Resolved" indication action on Ticket Detail.
- **IT Staff Operational Workflow (Role: IT Staff)**:
  - Shared IT Staff Ticket Queue with search (ticket number, summary), filters (category, priority, status, owner), multi-column sorting, and pagination.
  - IT Staff Ticket Detail screen with grouped information and operational controls.
  - Ticket ownership assignment: Claim ownership or reassign to another active IT Staff / Administrator.
  - IT Priority assignment (initially defaulted to Requested Priority, adjustable by staff).
  - Permitted status transition workflow (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).
  - Public Comments (visible to Requester, IT Staff, Admin) and Internal Notes (strictly restricted to IT Staff and Admin).
- **Administrator User Management (Role: Administrator)**:
  - Minimalist user list displaying Name, Email, Role, Status, and Edit action.
  - Search by name/email and optional filter by role.
  - Create user with name, email, one permitted role, activation state, and initial password.
  - Edit user basic details (name, email, role, activation state).
  - Set new initial password requiring change upon next login.
  - Safety rules: Block self-deactivation and block deactivating/removing the last active administrator.
- **Data Model Evolution & Idempotent Seeding**:
  - Migration of `RequesterUser` to `User` with password hash, role enum, activation flag, and password-change-required flag.
  - Expansion of `Ticket` with `ownerId` and `itPriority`.
  - Addition of `PublicComment` and `InternalNote` models.
  - Seed dataset with ≥4 active Requesters, 1 inactive Requester, ≥3 active IT Staff, 1 inactive IT Staff, ≥1 active Administrator, realistic tickets, and sample comments/notes.

### 3.2. Explicitly Excluded
- Email invitations, password-reset emails, MFA, social login, and Single Sign-On (SSO).
- Self-registration and public sign-up.
- Actions Taken by IT Staff (deferred to Lab 4).
- Formal SLA calculations, escalation engines, and external notification services.
- Advanced dashboards or KPI analytics beyond basic queue counts.
- Multiple roles per user or multi-tenant customer/department hierarchies.
- User deletion, bulk operations, user import/export, and account audit logs.
- Advanced user list pagination or multi-column simultaneous sorting in Administrator screen.

---

## 4. Functional Requirements

### Authentication & Authorization
- **FR-01**: The system shall authenticate users using email and password, returning authenticated session credentials and user profile information (ID, name, email, role).
- **FR-02**: The system shall enforce a mandatory password change immediately upon login if `isPasswordChangeRequired` is true, blocking access to all normal views until a compliant password is saved.
- **FR-03**: The system shall provide a logout endpoint and UI action that terminates the authenticated session and redirects to the login screen.
- **FR-04**: The system shall enforce role-based access control (RBAC) on the backend for all API endpoints and render role-appropriate navigation in the frontend shell.

### Requester Functions
- **FR-05**: The system shall derive requester identity exclusively from the authenticated session context, ignoring client-supplied user IDs.
- **FR-06**: The system shall allow Requesters to view only tickets they submitted and manage only attachments on their own tickets.
- **FR-07**: The system shall allow Requesters to post Public Comments on their tickets and view all Public Comments posted by staff.
- **FR-08**: The system shall provide an action for Requesters to indicate that their reported issue appears resolved.

### IT Staff Operations
- **FR-09**: The system shall provide IT Staff with a Ticket Queue supporting keyword search (ticket number, summary), filters (category, requested priority, IT priority, status, owner), sorting, and pagination.
- **FR-10**: The system shall allow IT Staff to claim an unassigned ticket or reassign a ticket to any active IT Staff or Administrator.
- **FR-11**: The system shall allow IT Staff to adjust IT Priority independently of the Requester's Requested Priority.
- **FR-12**: The system shall allow IT Staff to transition ticket status according to the approved status transition matrix.
- **FR-13**: The system shall allow IT Staff to view and post Public Comments and write private Internal Notes on any ticket.

### Administrator User Management
- **FR-14**: The system shall provide Administrators with a user management interface listing all accounts with search by name/email and filtering by role.
- **FR-15**: The system shall allow Administrators to create new user accounts with a designated role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), initial password, and activation status.
- **FR-16**: The system shall allow Administrators to update user profiles, toggle active status, and issue a new initial password requiring a change on next login.

---

## 5. Business Rules

### Authentication & Passwords
- **BR-01 (Active Account Prerequisite)**: Only active accounts (`isActive = true`) with valid credentials may authenticate. Inactive accounts receive HTTP 401 Unauthorized with a generic message to avoid account enumeration.
- **BR-02 (Mandatory Password Change Gate)**: Users flagged with `isPasswordChangeRequired = true` cannot access any application endpoint or screen except the password change and logout endpoints.
- **BR-03 (Password Complexity Policy)**: New passwords must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character (`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`).
- **BR-04 (Initial Password Lifecycle)**: Initial passwords created by administrators or seed data must have `isPasswordChangeRequired = true`. Once changed by the user, the flag is set to `false`.

### Data Ownership & Authorization
- **BR-05 (Server-Side Identity Binding)**: For all Requester actions, ticket ownership is determined solely by the authenticated user ID extracted from the verified session token.
- **BR-06 (Requester Isolation)**: Requesters can only access tickets where `requesterId == req.user.id`. Direct requests for non-owned tickets return HTTP 404 Not Found to prevent data existence leakage.
- **BR-07 (Role Separation)**: Administrators manage user accounts; IT Staff manage tickets. An Administrator cannot perform IT Staff ticket workflows unless assigned the `IT_STAFF` role (or where explicit admin override is permitted by policy).

### Ticket Workflow & Ownership
- **BR-08 (Ticket Assignment)**: A ticket may be created without an owner (`ownerId = null`). Only active users with role `IT_STAFF` or `ADMINISTRATOR` may be assigned as ticket owners.
- **BR-09 (IT Priority Independence)**: `itPriority` defaults to `requestedPriority` upon creation. Subsequently, only IT Staff or Administrators may update `itPriority`.
- **BR-10 (Permitted Status Transitions Matrix)**:
  - Initial state upon creation: `NEW`.
  - From `NEW` ➔ `OPEN`, `IN_PROGRESS`, `CANCELLED`.
  - From `OPEN` ➔ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`.
  - From `IN_PROGRESS` ➔ `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`.
  - From `WAITING_FOR_REQUESTER` ➔ `IN_PROGRESS`, `RESOLVED`, `CANCELLED`.
  - From `RESOLVED` ➔ `CLOSED`, `REOPENED`.
  - From `CLOSED` ➔ (Terminal state; cannot be reopened in Lab 3).
  - From `REOPENED` ➔ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`.
  - From `CANCELLED` ➔ (Terminal state).
- **BR-11 (Requester Resolution Indication)**: When a Requester clicks "Problem Appears Resolved", the ticket records the indication and status transitions to `RESOLVED` if currently `IN_PROGRESS` or `WAITING_FOR_REQUESTER`, but formal `CLOSED` transition is reserved for IT Staff.

### Collaboration (Comments & Notes)
- **BR-12 (Public Comment Visibility)**: Public Comments are visible to the ticket's Requester, all IT Staff, and Administrators.
- **BR-13 (Internal Note Confidentiality)**: Internal Notes are strictly confidential to IT Staff and Administrators. Requesters are barred from viewing, retrieving, or posting Internal Notes (HTTP 403 Forbidden).
- **BR-14 (Append-Only Immutability)**: Comments and Notes cannot be edited or deleted once submitted. Author ID and timestamp are stamped by the server.
- **BR-15 (Content Validation)**: Comment and Note bodies must be non-empty strings between 2 and 2,000 characters after trimming.

### Administrator Safety Rules
- **BR-16 (Email Uniqueness)**: User email addresses must be unique across the system (case-insensitive). Duplicate creation or update attempts return HTTP 409 Conflict.
- **BR-17 (Self-Deactivation Prevention)**: An Administrator cannot deactivate their own account or remove their own Administrator role.
- **BR-18 (Last Administrator Protection)**: The system must prevent deactivating or reassigning the role of the final active Administrator.
- **BR-19 (Soft Deactivation)**: User accounts are deactivated (`isActive = false`) and never hard-deleted to maintain ticket authorship and audit integrity.

---

## 6. UI Specification Summary

The UI adheres strictly to the **Zen Green** design language (`#006B3C` primary, `#F5F7F6` background, clean cards, rounded badges, consistent form controls):
1. **Login & First-Login Password Change**:
   - Clean centered card with TokTickIT branding.
   - Inline feedback for invalid credentials or inactive accounts.
   - Mandatory modal for first-time password change with real-time rule checklist.
2. **Role-Based Navbar Shell**:
   - Left: TokTickIT logo.
   - Center: Contextual navigation tabs:
     - Requester: `📋 My Tickets`, `➕ Create Ticket`.
     - IT Staff: `📥 Ticket Queue`, `➕ Create Ticket`.
     - Administrator: `👥 User Management`.
   - Right: User badge `[ 👤 Name | Role ]` and `[ Sign Out ]` button.
3. **IT Staff Ticket Queue**:
   - Search bar and filter dropdowns (Category, Priority, Status, Owner).
   - Desktop table with sortable columns and status/priority pills.
   - Mobile card view with responsive touch targets.
   - Fixed-window pagination (`< 1 2 3 4 5 ... 18 >`).
4. **IT Staff Ticket Detail**:
   - Grouped read-only ticket header + editable operational bar (Owner, IT Priority, Status).
   - Tabbed container: `💬 Public Comments`, `🔒 Internal Notes`, `📎 Attachments`.
   - Clear visual differentiation: Public Comments have clean white/green styling; Internal Notes have an amber callout border with "Internal Note — Visible only to staff".
5. **Administrator User Management**:
   - User table showing Name, Email, Role pill, Status badge, and Edit button.
   - Search and role filter toolbar.
   - Create User modal with initial password assignment.
   - Edit User modal with role dropdown, active toggle, and "Set New Initial Password" button.
   - Danger prevention alerts for self-deactivation and last active admin.

---

## 7. Data Changes & Migration

### Schema Evolution (`server/prisma/schema.prisma`)
- **`RequesterUser` ➔ `User`**:
  - Add `passwordHash String`
  - Add `role UserRole @default(REQUESTER)`
  - Add `isPasswordChangeRequired Boolean @default(true)`
  - Retain `isActive Boolean @default(true)`
  - Retain relations to `Ticket` as `submittedTickets`.
- **`Ticket` Model Updates**:
  - Add `ownerId Int?` referencing `User(id)` (optional relation `assignedTickets`).
  - Add `itPriority Priority?` (defaults to `requestedPriority`).
  - Update `TicketStatus` enum to include `WAITING_FOR_REQUESTER`, `REOPENED`, `CANCELLED`.
- **New Models**:
  - `PublicComment`: `id`, `ticketId`, `authorId`, `content`, `createdAt`.
  - `InternalNote`: `id`, `ticketId`, `authorId`, `content`, `createdAt`.

### Migration Strategy
1. Evolve existing `RequesterUser` records to `User` records with role `REQUESTER`.
2. Generate secure bcrypt hashes for initial passwords for all migrated accounts (`InitialPass123!`).
3. Retain all existing Lab 2 tickets, categories, systems, and attachments without data loss.

---

## 8. Acceptance Criteria

- **AC-01 (Authentication)**: Given valid active credentials, when logging in, then the system establishes an authenticated session and returns user details and role.
- **AC-02 (Password Change Gate)**: Given an account with `isPasswordChangeRequired = true`, when authenticated, then all standard screens are blocked until a new compliant password is submitted.
- **AC-03 (Requester Data Isolation)**: Given an authenticated Requester, when querying tickets, then only tickets matching their user ID are returned, regardless of query parameters.
- **AC-04 (Internal Notes Protection)**: Given a Requester account, when accessing the internal notes endpoint, then HTTP 403 Forbidden is returned with no note contents exposed.
- **AC-05 (Staff Ticket Queue)**: Given an IT Staff member, when accessing the queue, then all tickets across all requesters are visible with search, filter, and pagination support.
- **AC-06 (Ticket Ownership Assignment)**: Given an open ticket, when an IT Staff member claims or assigns it, then `ownerId` updates and reflects in the UI.
- **AC-07 (Status Transition Rules)**: Given a ticket in `NEW` status, when attempting an invalid transition to `CLOSED`, then the API rejects the request with HTTP 422 Unprocessable Entity.
- **AC-08 (Public Comments)**: Given an existing ticket, when a Requester or Staff member posts a public comment, then it appears in the comment thread with author name and timestamp.
- **AC-09 (Admin User Creation)**: Given an Administrator, when creating a user with unique email, then the account is persisted with specified role and initial password flag.
- **AC-10 (Admin Self-Deactivation Prevention)**: Given an Administrator, when attempting to deactivate their own account, then the request is rejected with HTTP 400 Bad Request.
- **AC-11 (Last Admin Protection)**: Given only one active Administrator, when attempting to deactivate or reassign their role, then the operation is rejected.
- **AC-12 (Lab 2 Requester Regression)**: Given an authenticated Requester, ticket creation with attachments, soft removal with reasons, and filtering function exactly as approved in Lab 2.

---

## 9. Product Definition of Done (DoD)

- [ ] All database migrations applied successfully with zero data loss to Lab 2 records.
- [ ] Idempotent seed script populates active/inactive requesters, IT staff, administrators, and realistic tickets.
- [ ] All 16 Functional Requirements and 19 Business Rules implemented and verified.
- [ ] Server automated test suites in `server/tests/lab-03/` achieve 100% pass rate.
- [ ] Client automated test suites in `client/tests/lab-03/` achieve 100% pass rate.
- [ ] E2E Playwright test suites in `e2e/lab-03/` achieve 100% pass rate.
- [ ] Zero regression across all 53 Lab 2 automated tests.
- [ ] Frontend builds cleanly with zero TypeScript errors (`tsc -b`) and zero Vite bundle warnings.
- [ ] All screens conform to Zen Green UI styling on Desktop, Tablet, and Mobile.

