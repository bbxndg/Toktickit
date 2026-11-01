# TokTickIT — IT Service Desk Portal

A full-stack IT Service Desk ticketing application built with **React 19**, **TypeScript**, **Vite**, **Bootstrap 5**, **Node.js (Express v5)**, **Prisma ORM**, and **PostgreSQL**.

---

## Lab 1 Release — Project Foundation & Baseline Architecture

The foundational sprint establishing the full-stack architectural baseline for TokTickIT:
1. **System Foundation & Health Monitoring**: Express v5 REST API initialization, structured logging, CORS configuration, and system health check endpoint (`/health`).
2. **Relational Database & Domain Modeling**: PostgreSQL database integration via Prisma ORM, defining initial schemas for reference data (Categories, Related Systems) with idempotent database seeding.
3. **Frontend Shell & Design Tokens**: React 19 application shell powered by Vite, incorporating baseline Bootstrap 5 layout and TokTickIT Zen Green color variables.
4. **Testing Infrastructure**: Vitest test runner configuration across both server and client layers ensuring automated continuous verification.

---

## Lab 2 Release — Requester Ticketing MVP (Zen Green Foundation)

This increment delivers the complete end-user Requester ticketing journey conforming to the **Zen Green Design System**:
1. **Development Requester Simulation**: Multi-user session picker (`RequesterSelector`) with global context and strict data ownership isolation (`BR-04`).
2. **Ticket Creation Flow**: Sequential collision-free Ticket Number generation (`TKT-YYYY-XXXXXX`), category/system/priority assignment, character validation, and multi-file attachments (`JPG/PNG/WEBP/PDF <= 5 MB`, max 5 files).
3. **My Tickets Dashboard**: Paginated list with 300ms debounced search, multi-field filtering (Category, Priority, Status), multi-column sorting, and responsive layout (Full Desktop Table $\ge 992px$, Mobile Cards $< 768px$).
4. **Ticket Detail & Attachment Lifecycle**: Read-only metadata view, direct active attachment binary downloads, soft-removal modal requiring non-empty removal reasons (`BR-07`, `BR-09`), and `410 Gone` download rejection for removed files (`BR-08`).
5. **Comprehensive Verification**: 53 automated tests across Unit, Integration, UI Component, and End-to-End User Journey suites (100% pass rate).

---

## Lab 3 Release — Multi-Role Ticketing, Auth, & Administrative Control

This release advances TokTickIT from a single-role prototype with simulated identity into an enterprise-ready, role-based IT Service Desk conforming strictly to the **Zen Green Design System** and course specifications:

1. **Role-Based Authentication & Credential Security**:
   * Secure credential-based authentication using email and hashed passwords (**bcrypt**).
   * **Mandatory First-Login Password Change Gate** (`BR-02`): Blocks all application access for initial temporary passwords until a compliant password is set.
   * Session and token management with JWT Bearer tokens and safe error responses preventing account enumeration (`BR-01`).
   * Dynamic navigation shell adapting to the authenticated user's role: **Requester**, **IT Staff**, or **Administrator**.

2. **IT Staff Operational Ticket Queue & Triage**:
   * Centralized IT Staff Queue with live status counter chips (`All`, `Unassigned`, `Open`, `In Progress`, `Waiting for Requester`).
   * 300ms debounced search across Ticket Number and Summary.
   * Multi-field filters: Category, Requested Priority, IT Priority, Status, and Ticket Owner.
   * Responsive layout: Full Desktop Table ($\ge 768$px) switching seamlessly to Mobile Touch Cards ($< 768$px).
   * Predictable fixed-window pagination with ellipsis (`‹ Previous [1] [2] [3] [4] [5] ... [41] Next ›`).

3. **Ticket Workflow & Ownership Lifecycle**:
   * Ticket ownership assignment: Claim unassigned tickets directly or reassign to any active IT Staff / Administrator (`BR-08`).
   * Independent IT Priority management adjustable by staff (`BR-09`).
   * Strict enforcement of the approved **BR-10 Permitted Status Transition Matrix** (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).
   * Terminal state confirmation modal with required cancellation reason.

4. **Multi-Role Collaboration (Comments & Internal Notes)**:
   * **Public Comments Thread**: Chronological conversation between Requester and IT Staff (2–2,000 characters, append-only).
   * **Confidential Internal Notes**: Marked with amber borders (`#D97706`), amber backgrounds (`#FEF3C7`), and lock icons; strictly restricted to IT Staff and Administrators (`BR-13`, HTTP 403 Forbidden for Requesters).
   * Requester "Problem Appears Resolved" indication action on Ticket Detail (`BR-11`).

5. **Administrator User Management & Safety Guards**:
   * Minimalist user directory with live search and role filters.
   * Create and edit accounts with designated roles (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`) and temporary initial passwords.
   * **Self-Deactivation Guard (`BR-17`)**: Prevents active Administrators from deactivating or demoting their own account.
   * **Last Administrator Protection (`BR-18`)**: Prevents deactivating or reassigning the role of the final active Administrator.
   * Soft-deactivation strategy preserving ticket authorship and audit trails (`BR-19`).

6. **Comprehensive Automated Verification & Zero-Regression**:
   * **100% Pass Rate across all 129 automated tests** (27 test files) spanning Unit, Integration, UI Component, and End-to-End User Journeys without regression to Lab 1 or Lab 2.

---

## Lab 4 — Actions Taken, Final Workflow & Role Dashboards

Lab 4 extends the earlier ticketing flows with recorded work, resolution rules, role-specific dashboards, and regression hardening. Its contracts are in [`docs/lab-04`](docs/lab-04/).

1. **Actions Taken**: Staff and Administrators can create, assign, edit, complete, or cancel work from Ticket Detail. Requesters can read actions on their own Tickets. Assignment is independent of Ticket ownership; completion automatically records the authenticated performer. Completed/cancelled actions are read-only, and historical inactive assignees retain their attribution with an explicit warning.
2. **Final Ticket Workflow**: Resolution requires a summary and no pending (`PLANNED`/`IN_PROGRESS`) actions. Cancelling a Ticket atomically cancels its pending actions. Requester resolution indication is advisory; it does not change Ticket status. Permitted transitions, resolution/closure timestamps, and paginated status history are enforced by the server.
3. **Role Dashboards**: Authenticated users land on their role's dashboard. Requesters see only their own Ticket metrics and recent Tickets; Staff and Administrators see operational counts, status/priority buckets, recent Tickets and their pending actions. Dashboard links open the matching filtered list or Ticket/action.
4. **Concurrency & Failure Recovery**: Version checks reject stale Ticket/action updates with HTTP 409. Parent-first locking protects workflow changes, and action creation retries reuse an idempotency key. Forms retain drafts after recoverable failures and require explicit review after conflicts. Comments and Internal Notes distinguish load failures from empty data and provide Retry.
5. **Security, Data Preservation & Verification**: Earlier authentication, role/ownership isolation, private notes and attachment rules remain enforced. Account safety checks validate JSON boolean flags and serialize administrator changes. Concurrent attachment uploads respect the five-active-file limit. Additive migrations and repeatable seed fixtures preserve existing work; automated recovery checks restore records and file bytes into a disposable database.

The standard development ports remain **API: 4000** and **client: 5173**. If Vite reports that 5173 is occupied, stop the existing frontend instance you own before restarting on that port.

### Lab 4 Database Upgrade

Back up both PostgreSQL and `server/uploads/attachments/` together before upgrading an existing installation. Keep IDs, ownership, authorship, attachment metadata, and file checksums for comparison after migration or restoration. A database backup alone does not contain uploaded binaries.

```bash
# Run from the repository root after configuring server/.env
cd server
npx prisma migrate deploy
npx prisma db seed
```

Use additive migrations; do not reset an existing database. Lab 4 backfills versions and indication defaults without inventing historical Actions Taken, resolution dates, or status events. Seed fixtures preserve existing records and changed credentials.

---

## Project Structure

```
Toktickit/
├── client/                     # React 19 + TypeScript + Vite + Bootstrap frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/ChangePasswordModal.tsx
│   │   │   ├── layout/Navbar.tsx
│   │   │   └── tickets/                 # Actions Taken, workflow dialogs & status history
│   │   ├── context/
│   │   │   ├── AuthContext.tsx           # Authentication session & JWT state
│   │   │   └── RequesterContext.tsx      # Legacy Requester session adapter
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx            # Requester and Staff/Admin dashboards
│   │   │   ├── Login.tsx                 # Login with busy indicator
│   │   │   ├── CreateTicket.tsx          # Ticket creation with multi-file attachments
│   │   │   ├── MyTickets.tsx             # Requester ticket dashboard
│   │   │   ├── TicketDetail.tsx          # Requester view with public comments
│   │   │   ├── StaffTicketQueue.tsx      # IT Staff Queue with fixed-window pagination
│   │   │   ├── StaffTicketDetail.tsx     # Staff triage, operational strip, comments & notes
│   │   │   ├── UserManagement.tsx        # Administrator user directory & safety guards
│   │   │   └── RequesterSelector.tsx     # Simulated selector modal
│   │   ├── styles/                       # Zen Green design tokens (zen-green.css)
│   │   ├── App.tsx                       # Role-based route dispatcher
│   │   └── main.tsx
│   ├── tests/
│   │   ├── lab-01/                       # Lab 1 baseline tests
│   │   ├── lab-02/                       # Lab 2 Requester & attachment tests
│   │   ├── lab-03/                       # Lab 3 component journeys and regression
│   │   └── lab-04/                       # Actions, workflow, dashboard and failure-state tests
│   ├── e2e/lab-04/                       # Playwright browser workflows and visual checks
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js + Express v5 + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma                 # Includes ActionTaken, TicketStatusEvent and earlier models
│   │   └── seed.ts                       # Idempotent seed script (Requesters, Staff, Admins, Tickets)
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts                   # authenticate & requireRole RBAC guards
│   │   ├── routes/
│   │   │   ├── actionsTaken.ts           # Shared actions and staff writes
│   │   │   ├── dashboard.ts              # Role-scoped summary metrics
│   │   │   ├── statusHistory.ts          # Paginated Ticket status history
│   │   │   ├── auth.ts                   # /api/auth (login, me, logout, change-password)
│   │   │   ├── staff.ts                  # /api/staff (queue, claim, assign, priority, status)
│   │   │   ├── adminUsers.ts             # /api/admin/users (CRUD, safety protections)
│   │   │   ├── commentsNotes.ts          # /api/tickets/:id (comments & internal notes)
│   │   │   ├── tickets.ts                # /api/tickets (create, list)
│   │   │   └── ticketDetail.ts           # /api/tickets/:id (detail, attachments)
│   │   ├── utils/
│   │   │   ├── auth.ts                   # Password policy & token validation
│   │   │   └── fileUpload.ts             # Multer upload restrictions
│   │   └── index.ts                      # Express app setup
│   ├── tests/
│   │   ├── lab-01/                       # Lab 1 API tests
│   │   ├── lab-02/                       # Lab 2 Integration tests
│   │   ├── lab-03/                       # Lab 3 API regression
│   │   └── lab-04/                       # Actions, workflow, security, migration, recovery & performance
│   ├── scripts/                         # Isolated API/browser runners and interruption checks
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # Specifications, test plans, and peer reviews
│   ├── lab-01/
│   ├── lab-02/
│   ├── lab-04/                          # Lab 4 specifications and test plan
│   └── lab-03/
│       ├── specification.md              # Functional requirements & business rules (FR-01..16, BR-01..19)
│       ├── api-spec.md                   # REST API contract schemas & error envelopes
│       ├── ui-spec.md                    # Zen Green UI specification & responsive breakdown
│       ├── tests.md                      # Master Test Plan & Traceability Matrix (API-01..22, UI-01..06, E2E-01..03)
│       └── reviewer.md                   # Peer review records & refactoring audit log
├── .gitignore
├── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js**: v22.12+ (or v20.19+)
- **npm**: v9+
- **PostgreSQL**: Running instance on `localhost:5432`

---

## Getting Started & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/bbxndg/Toktickit.git
cd Toktickit
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env` and update credentials:
```bash
cp server/.env.example server/.env
```

Ensure `server/.env` contains your PostgreSQL connection and JWT secret:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit?schema=public"
PORT=4000
JWT_SECRET="toktickit-super-secret-jwt-key"
```

### 3. Install Dependencies
```bash
# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

---

## Database Setup & Migrations

From the `server/` directory:
```bash
cd server

# 1. Run database migrations
npx prisma migrate dev

# 2. Seed active and inactive Requesters, IT Staff, Administrators, and realistic tickets
npx prisma db seed
```

---

## Running Development Servers

### 1. Start Backend Server (Port 4000)
```bash
cd server
npm run dev
```

### 2. Start Frontend Server (Port 5173)
```bash
cd client
npm run dev
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

## Automated Testing

### Full Regression (Labs 1–4)

Run these from the repository root:

```bash
npm --prefix server test
npm --prefix client test
npm --prefix server run build
npm --prefix client run build
npm --prefix client run lint
```

The server runner reads connection credentials from `server/.env`, switches to the dedicated `toktickit_lab4_feature2_test` database, applies migrations, seeds fixtures, and runs tests serially. It does not run tests against the application's working database. The configured PostgreSQL role needs permission to create databases and disposable schemas for migration/recovery verification. Recovery tests also require compatible PostgreSQL `pg_dump` and `pg_restore` binaries.

To run only the Lab 4 suites:

```bash
npm --prefix server test -- tests/lab-04
npm --prefix client test -- tests/lab-04
```

### Playwright Browser Tests (Lab 4)

First run the server tests above to initialize the test database. Ensure ports **4000** and **5173** are free; the isolated runner starts its own API and frontend on these ports and stops them afterward.

```bash
# Install Playwright's Chromium once
cd client
npx playwright install chromium
cd ..

npm --prefix server run test:e2e

# Verify cleanup when the runner receives SIGINT or SIGTERM
npm --prefix server run test:e2e:interrupt
```

Alternatively, use an installed Chrome executable:

```bash
CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome npm --prefix server run test:e2e
```

To test the compiled application instead of development servers, build both packages first and enable production mode:

```bash
npm --prefix server run build
npm --prefix client run build
E2E_PRODUCTION=1 CHROME_EXECUTABLE_PATH=/usr/bin/brave-browser npm --prefix server run test:e2e
```

This starts the compiled API and Vite preview on the same ports, 4000 and 5173. Set `CHROME_EXECUTABLE_PATH` to an installed compatible Chromium browser on your machine.

Browser tests create temporary accounts/Tickets only in the isolated database and clean them up, including records and uploaded files created during a journey. The interruption check also verifies this cleanup after SIGINT/SIGTERM. Screenshots are written under the operating system's temporary directory at `toktickit-lab4-playwright-results/<run-id>/`, outside the repository. They cover role dashboards, action/workflow journeys, stale updates, lost responses, responsive layouts, native 200% browser zoom in disposable profiles, and recoverable loading/failure/empty states. The expanded suite checks Unicode filename and download integrity, public/private collaboration, Administrator and first-password flows, long action fields, cancellation cascades, keyboard navigation, dialog focus, accessible control names and uncaught JavaScript errors. Earlier Lab 3 `e2e-journey.test.tsx` tests are component-level journeys; the Lab 4 Playwright suite drives a real browser.

### Latest Verification

Verified on 31 October 2026: 500 server tests across 26 files, 111 client tests across 21 files, and the 77 browser scenarios in both Chrome development mode and Brave against compiled builds. The two browser runs represent 154 executions of 77 scenarios. Lint completed with existing warnings; both builds and SIGINT/SIGTERM fixture cleanup checks passed. Historical Lab 2/3 counts in their release sections describe those earlier milestones.

| Suite | Passed |
| :--- | ---: |
| Server API/integration regression | 500 / 500 |
| Client component regression | 111 / 111 |
| Playwright — Chrome, development | 77 / 77 |
| Playwright — Brave, compiled builds | 77 / 77 |


---

## Building for Production

```bash
# Build backend
cd server && npm run build

# Build frontend
cd client && npm run build
```
