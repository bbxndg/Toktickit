# TokTickIT — IT Service Desk Portal

A production-ready full-stack IT Service Desk ticketing application built with **React 19**, **TypeScript**, **Vite**, **Bootstrap 5**, **Node.js (Express v5)**, **Prisma ORM**, and **PostgreSQL**.

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

## Project Structure

```
Toktickit/
├── client/                     # React 19 + TypeScript + Vite + Bootstrap frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/ChangePasswordModal.tsx
│   │   │   └── layout/Navbar.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx           # Authentication session & JWT state
│   │   │   └── RequesterContext.tsx      # Legacy Requester session adapter
│   │   ├── pages/
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
│   │   └── lab-03/                       # Lab 3 Auth, Queue, Staff Detail, Admin & E2E
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js + Express v5 + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma                 # Schema: User, Ticket, Attachment, PublicComment, InternalNote
│   │   └── seed.ts                       # Idempotent seed script (Requesters, Staff, Admins, Tickets)
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts                   # authenticate & requireRole RBAC guards
│   │   ├── routes/
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
│   │   └── lab-03/                       # Lab 3 Auth, RBAC, Queue, Triage, Admin API tests
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # Specifications, test plans, and peer reviews
│   ├── lab-01/
│   ├── lab-02/
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

- **Node.js**: v20+
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

Both suites run via **Vitest** with deterministic sequential database isolation:

### Run Backend API Tests (Lab 3):
```bash
cd server
npm test -- --reporter=verbose tests/lab-03
```
*6 test files | 47 tests passed ✅*

### Run Frontend Component Tests (Lab 3):
```bash
cd client
npm test -- --reporter=verbose tests/lab-03
```
*7 test files | 26 tests passed ✅*

### Run Multi-Role End-to-End User Journeys (E2E):
```bash
cd client
npx vitest run --reporter=verbose tests/lab-03/e2e-journey.test.tsx
```
*3 journeys passed (E2E-01: Auth & Password Change, E2E-02: Staff Queue & Note, E2E-03: Admin Safety) ✅*

### Full Regression Suite:
```bash
# Run all server tests (Lab 1 + Lab 2 + Lab 3)
cd server && npm test

# Run all client tests (Lab 1 + Lab 2 + Lab 3)
cd ../client && npm test && npm run build
```

### Test Results Summary:
| Suite | Test Files | Total Tests | Passed | Pass Rate |
| :--- | :---: | :---: | :---: | :---: |
| **Server Integration & API Tests** | 14 | 80 | 80 | **100%** |
| **Client Component & E2E Journeys** | 13 | 49 | 49 | **100%** |
| **Total Test Suite Health** | **27** | **129** | **129** | **100%** |

---

## Building for Production

```bash
# Build backend
cd server && npm run build

# Build frontend
cd client && npm run build
```
