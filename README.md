# TokTickIT — IT Service Desk Portal

A production-ready full-stack IT Service Desk ticketing application built with **React 19**, **TypeScript**, **Vite**, **Bootstrap 5**, **Node.js (Express v5)**, **Prisma ORM**, and **PostgreSQL**.

---

## 🚀 Lab 2 Release — Requester Ticketing MVP (Zen Green Foundation)

This increment delivers the complete end-user Requester ticketing journey conforming to the **Zen Green Design System**:
1. **Development Requester Simulation**: Multi-user session picker (`RequesterSelector`) with global context and strict data ownership isolation (`BR-04`).
2. **Ticket Creation Flow**: Sequential collision-free Ticket Number generation (`TKT-YYYY-XXXXXX`), category/system/priority assignment, character validation, and multi-file attachments (`JPG/PNG/WEBP/PDF <= 5 MB`, max 5 files).
3. **My Tickets Dashboard**: Paginated list with 300ms debounced search, multi-field filtering (Category, Priority, Status), multi-column sorting, and responsive layout (Full Desktop Table $\ge 992px$, Mobile Cards $< 768px$).
4. **Ticket Detail & Attachment Lifecycle**: Read-only metadata view, direct active attachment binary downloads, soft-removal modal requiring non-empty removal reasons (`BR-07`, `BR-09`), and `410 Gone` download rejection for removed files (`BR-08`).
5. **Comprehensive Verification**: 53 automated tests across Unit, Integration, UI Component, and End-to-End User Journey suites (100% pass rate).

---

## 📁 Project Structure

```
Toktickit/
├── client/                     # React + TypeScript + Vite + Bootstrap frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, etc.)
│   │   ├── context/            # React Context (RequesterContext)
│   │   ├── pages/              # Screens (CreateTicket, MyTickets, TicketDetail, RequesterSelector)
│   │   ├── styles/             # Zen Green design system tokens (zen-green.css)
│   │   ├── App.tsx             # Root application navigation shell
│   │   └── main.tsx            # Entry point
│   ├── tests/
│   │   ├── lab-01/             # Lab 1 baseline tests
│   │   └── lab-02/             # Lab 2 UI Component & E2E Journey test suites
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js + Express v5 + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (RequesterUser, Category, RelatedSystem, Ticket, Attachment)
│   │   └── seed.ts             # Idempotent database seed script
│   ├── src/
│   │   ├── routes/             # REST API routes (tickets, ticketDetail, categories, requesters, systems)
│   │   ├── utils/              # Sequential ticket number generator & Multer file upload filters
│   │   └── index.ts            # Server entry point & Express application
│   ├── tests/
│   │   ├── lab-01/             # Lab 1 API tests
│   │   └── lab-02/             # Lab 2 Supertest integration suites
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # Project documentation & Lab reports
│   ├── lab-01/                 # Lab 1 specs, review logs, and reflection
│   └── lab-02/                 # Lab 2 Master Specifications:
│       ├── specification.md    # Functional requirements & business rules (FR-01..12, BR-01..14)
│       ├── api-spec.md         # REST API schema documentation (10 endpoints)
│       ├── ui-spec.md          # Zen Green UI specification & responsive breakdown
│       ├── tests.md            # Master Test Plan & Traceability Matrix (100% passed)
│       ├── reviewer.md         # Peer Review records & refactoring audit logs
│       └── ai_use.md           # AI collaboration, prompt engineering, and reflection
├── .gitignore
├── .env.example
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js**: v20+
- **npm**: v9+
- **PostgreSQL**: Running instance on `localhost:5432`

---

## 🛠️ Getting Started & Setup

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
Ensure `server/.env` contains your PostgreSQL connection:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit?schema=public"
PORT=4000
```

### 3. Install Dependencies
```bash
# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

---

## 🗄️ Database Setup & Migrations

From the `server/` directory:
```bash
cd server

# 1. Run database migrations
npx prisma migrate dev

# 2. Seed active requesters, categories, and related systems
npx prisma db seed
```

---

## 💻 Running Development Servers

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

## 🧪 Automated Testing

Both suites run via **Vitest** with deterministic sequential database isolation:

### Run Backend API Integration Tests:
```bash
cd server
npm test
```
*7 test files | 30 tests passed ✅*

### Run Frontend Component & E2E Journey Tests:
```bash
cd client
npm test
```
*6 test files | 23 tests passed ✅*

### Test Results Summary:
| Suite | Test Files | Total Tests | Passed | Pass Rate |
| :--- | :---: | :---: | :---: | :---: |
| **Server Tests** | 7 | 30 | 30 | **100%** |
| **Client & E2E Tests** | 6 | 23 | 23 | **100%** |
| **Total** | **13** | **53** | **53** | **100%** |

---

## 🏗️ Building for Production

```bash
# Build backend
cd server && npm run build

# Build frontend
cd client && npm run build
```
