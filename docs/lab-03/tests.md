# Lab 3 Test Plan and Traceability Matrix

**Product:** TokTickIT IT Service Desk  
**Sprint:** Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Status:** Approved Test Plan  

---

## 1. Test Strategy & Structure

Testing adheres strictly to **Test-Driven Development (TDD)** and **Spec-Driven Development (Spec DD)** across unit, integration, UI component, and end-to-end layers:

```
TokTickIT Test Suites
├── server/tests/lab-03/
│   ├── auth.api.test.ts             # Login, logout, /me, password policy, first-login flag
│   ├── authorization.api.test.ts    # Role-based endpoint guards (Requester, Staff, Admin)
│   ├── staff-queue.api.test.ts      # Queue search, category/priority/status/owner filters, pagination
│   ├── staff-ticket-detail.api.test.ts # Claim ownership, reassign, IT priority, status transition matrix
│   ├── comments-notes.api.test.ts   # Public comments vs confidential internal notes permissions
│   └── users-admin.api.test.ts      # Admin CRUD, role assignment, self-deactivation & last-admin guards
├── client/tests/lab-03/
│   ├── Login.test.tsx               # Login form, busy state, invalid credential feedback
│   ├── ChangePassword.test.tsx      # Mandatory password change gate, validation checklist
│   ├── StaffTicketQueue.test.tsx    # Queue table, mobile card switch, filter toolbar, pagination
│   ├── StaffTicketDetail.test.tsx   # Operational controls, tabbed comments/notes/attachments
│   └── UserManagement.test.tsx      # User directory, Create/Edit modals, safety protection alerts
└── e2e/lab-03/
    ├── authentication.spec.ts       # Full login -> first-login password change -> app shell
    ├── staff-ticket-flow.spec.ts    # Queue -> Claim ticket -> Change priority & status -> Add note & comment
    └── user-administration.spec.ts  # Admin creates user -> Edits account -> Validates safety rules
```

---

## 2. Test Execution Matrix

| Test ID | Layer | Requirement / AC | What It Tests | Expected Result | Target Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-01, BR-01 | Valid user login | HTTP 200; returns JWT token and safe user profile | `server/tests/lab-03/auth.api.test.ts` | Passed ✅ |
| **API-02** | API | AC-01, BR-01 | Login with incorrect password | HTTP 401 Unauthorized; generic error message | `server/tests/lab-03/auth.api.test.ts` | Passed ✅ |
| **API-03** | API | AC-01, BR-01 | Login with inactive user account | HTTP 401 Unauthorized; account blocked | `server/tests/lab-03/auth.api.test.ts` | Passed ✅ |
| **API-04** | API | AC-02, BR-02 | First-login password change | HTTP 200; updates password, sets `isPasswordChangeRequired = false` | `server/tests/lab-03/auth.api.test.ts` | Passed ✅ |
| **API-05** | API | AC-02, BR-03 | Password change failing complexity | HTTP 400 Bad Request; validation details returned | `server/tests/lab-03/auth.api.test.ts` | Passed ✅ |
| **API-06** | API | AC-03, BR-06 | Requester queries tickets | HTTP 200; only owned tickets returned; client requesterId ignored | `server/tests/lab-03/authorization.api.test.ts` | Planned 📋 |
| **API-07** | API | AC-03, BR-06 | Requester accesses other's ticket | HTTP 404 Not Found; access denied without leaking existence | `server/tests/lab-03/authorization.api.test.ts` | Planned 📋 |
| **API-08** | API | AC-04, BR-13 | Requester accesses Internal Notes API | HTTP 403 Forbidden; note content not exposed | `server/tests/lab-03/comments-notes.api.test.ts` | Planned 📋 |
| **API-09** | API | AC-05, FR-09 | IT Staff queries Ticket Queue | HTTP 200; returns multi-requester tickets with pagination & counts | `server/tests/lab-03/staff-queue.api.test.ts` | Planned 📋 |
| **API-10** | API | AC-05, FR-09 | Queue search and filtering | HTTP 200; correctly matches keyword, category, status, and owner | `server/tests/lab-03/staff-queue.api.test.ts` | Planned 📋 |
| **API-11** | API | AC-06, BR-08 | IT Staff claims unassigned ticket | HTTP 200; `ownerId` set to authenticated staff user | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned 📋 |
| **API-12** | API | AC-06, BR-08 | IT Staff reassigns ticket to another staff | HTTP 200; `ownerId` updated to target active staff user | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned 📋 |
| **API-13** | API | AC-06, BR-08 | Reassign ticket to inactive user or requester | HTTP 400 Bad Request; assignment rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned 📋 |
| **API-14** | API | AC-07, BR-10 | Valid status transition (`OPEN` ➔ `IN_PROGRESS`) | HTTP 200; status updated and timestamp recorded | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned 📋 |
| **API-15** | API | AC-07, BR-10 | Invalid status transition (`NEW` ➔ `CLOSED`) | HTTP 422 Unprocessable Entity; transition rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned 📋 |
| **API-16** | API | AC-08, BR-12 | Post Public Comment on ticket | HTTP 201 Created; saved with author ID and visible to all roles | `server/tests/lab-03/comments-notes.api.test.ts` | Planned 📋 |
| **API-17** | API | AC-04, BR-13 | Post Internal Note as IT Staff | HTTP 201 Created; note recorded, visible only to Staff/Admin | `server/tests/lab-03/comments-notes.api.test.ts` | Planned 📋 |
| **API-18** | API | AC-09, BR-16 | Administrator creates new user account | HTTP 201 Created; user persisted with designated role & initial password | `server/tests/lab-03/users-admin.api.test.ts` | Passed ✅ |
| **API-19** | API | AC-09, BR-16 | Create user with duplicate email | HTTP 409 Conflict; duplicate email rejected | `server/tests/lab-03/users-admin.api.test.ts` | Passed ✅ |
| **API-20** | API | AC-10, BR-17 | Administrator deactivates own account | HTTP 400 Bad Request; self-deactivation blocked | `server/tests/lab-03/users-admin.api.test.ts` | Passed ✅ |
| **API-21** | API | AC-11, BR-18 | Deactivate the last active Administrator | HTTP 400 Bad Request; operation rejected | `server/tests/lab-03/users-admin.api.test.ts` | Passed ✅ |
| **API-22** | API | AC-11, BR-18 | Non-Administrator accesses admin endpoints | HTTP 403 Forbidden; access denied | `server/tests/lab-03/users-admin.api.test.ts` | Passed ✅ |
| **UI-01** | UI | AC-01, FR-01 | Login screen validation and busy state | Form validates email format; button disables while submitting | `client/tests/lab-03/Login.test.tsx` | Passed ✅ |
| **UI-02** | UI | AC-02, BR-02 | Mandatory password change blocks navigation | Modal blocks backdrop; renders password rule checklist | `client/tests/lab-03/ChangePassword.test.tsx` | Passed ✅ |
| **UI-03** | UI | AC-05, FR-09 | Queue renders responsive table and mobile cards | Renders table on desktop (≥768px), cards on mobile (<768px) | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned 📋 |
| **UI-04** | UI | AC-06, AC-07 | Staff detail operational controls | Dropdowns for Claim/Assign, IT Priority, and Status transitions work | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned 📋 |
| **UI-05** | UI | AC-04, AC-08 | Tabbed comments and internal notes | Public comments and amber internal notes render with distinct styling | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned 📋 |
| **UI-06** | UI | AC-09, AC-10 | User management modals & safety prompts | Create/Edit modals open; self-deactivate toggle is disabled with alert | `client/tests/lab-03/UserManagement.test.tsx` | Passed ✅ |
| **E2E-01** | E2E | AC-01, AC-02 | Full auth flow: Temp password ➔ Change ➔ Shell | User signs in, sets new password, enters role landing view | `e2e/lab-03/authentication.spec.ts` | Planned 📋 |
| **E2E-02** | E2E | AC-05, AC-06 | Staff ticket flow: Queue ➔ Claim ➔ Progress ➔ Note | Staff claims ticket from queue, sets in-progress, writes internal note | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned 📋 |
| **E2E-03** | E2E | AC-09, AC-10 | Admin flow: Create user ➔ Edit role ➔ Safety alert | Admin creates user, attempts self-deactivation, receives blocked notice | `e2e/lab-03/user-administration.spec.ts` | Planned 📋 |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Description | Mapped Tests | Verification Layer |
| :--- | :--- | :--- | :--- |
| **AC-01** | User authentication and session establishment | `API-01`, `API-02`, `API-03`, `UI-01`, `E2E-01` | API, Unit, E2E |
| **AC-02** | Mandatory password change enforcement on first login | `API-04`, `API-05`, `UI-02`, `E2E-01` | API, UI, E2E |
| **AC-03** | Requester data isolation and server-side identity binding | `API-06`, `API-07` | API, Authorization |
| **AC-04** | Internal Notes strictly protected from Requester access | `API-08`, `API-17`, `UI-05` | API, UI, Auth |
| **AC-05** | IT Staff Ticket Queue with search, filters, pagination | `API-09`, `API-10`, `UI-03`, `E2E-02` | API, UI, E2E |
| **AC-06** | Ticket claim and reassign ownership operations | `API-11`, `API-12`, `API-13`, `UI-04`, `E2E-02` | API, UI, E2E |
| **AC-07** | Permitted status transition matrix enforcement | `API-14`, `API-15`, `UI-04`, `E2E-02` | API, Workflow |
| **AC-08** | Public Comments creation and multi-role visibility | `API-16`, `UI-05`, `E2E-02` | API, UI, E2E |
| **AC-09** | Administrator user creation with initial password | `API-18`, `API-19`, `UI-06`, `E2E-03` | API, UI, E2E |
| **AC-10** | Administrator self-deactivation prevention | `API-20`, `UI-06`, `E2E-03` | API, Safety |
| **AC-11** | Protection of the final active Administrator | `API-21`, `API-22`, `UI-06` | API, Safety |
| **AC-12** | Lab 2 Requester regression continuity | Lab 2 test suite (53 tests) | Regression |

---

## 4. Test Execution Instructions

### Running Server API Tests
```bash
cd server
npm test -- server/tests/lab-03/
```

### Running Client Component Tests
```bash
cd client
npm test -- client/tests/lab-03/
```

### Running Full Regression Suite
```bash
cd server && npm test -- --run
cd ../client && npm test -- --run && npm run build
```

### Running End-to-End Tests
```bash
npx playwright test e2e/lab-03/
```

