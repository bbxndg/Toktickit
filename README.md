# TokTickIT — IT Request & Service Portal

A full-stack starter application for TokTickIT built with React, Vite, Bootstrap, Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL.

---

## Project Structure

```
Toktickit/
├── client/                     # React + TypeScript + Vite + Bootstrap frontend
│   ├── src/
│   │   ├── components/         # React UI components
│   │   ├── App.tsx             # Root application component
│   │   └── main.tsx            # React entry point with Bootstrap imports
│   ├── tests/                  # Frontend tests (Vitest + React Testing Library)
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js + Express + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma ORM schema
│   │   └── seed.ts             # Database seed script
│   ├── src/
│   │   ├── routes/             # Express API route handlers
│   │   └── index.ts            # Server entry point
│   ├── tests/                  # Backend tests (Vitest + Supertest)
│   │   └── lab-01/
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # Project documentation & Lab reports
├── .gitignore
├── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js**: v18+ (or v20+)
- **npm**: v9+
- **PostgreSQL**: Local database instance running on port 5432

---

## Getting Started & Setup

### 1. Clone the Repository

```bash
git clone <REPOSITORY_URL>
cd Toktickit
```

### 2. Environment Configuration

Copy `.env.example` to `server/.env` and configure your PostgreSQL database credentials:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your actual PostgreSQL connection string:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit?schema=public"
PORT=4000
```

### 3. Install Dependencies

#### Install Client Dependencies:
```bash
cd client
npm install
cd ..
```

#### Install Server Dependencies:
```bash
cd server
npm install
cd ..
```

---

## Database Setup & Migrations

From the `server/` directory:

```bash
cd server

# 1. Run database migrations
npx prisma migrate dev --name init

# 2. Seed initial categories
npx prisma db seed
```

---

## Running Development Servers

### Start Backend API Server
```bash
cd server
npm run dev
```
The API server will run on `http://localhost:4000`.

### Start Frontend Client
```bash
cd client
npm run dev
```
The client Vite application will run on `http://localhost:5173`.

---

## Running Automated Tests

### Run Backend Tests (Vitest + Supertest)
```bash
cd server
npm test
```

### Run Frontend Tests (Vitest + React Testing Library)
```bash
cd client
npm test
```

---

## Building for Production

```bash
# Build backend
cd server && npm run build

# Build frontend
cd client && npm run build
```
