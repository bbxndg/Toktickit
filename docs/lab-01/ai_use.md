# AI Use Log — Lab 1

- **Tool / Agent**: Antigravity (Google DeepMind)
- **Model**: Gemini 3.7 Flash

## Prompts and Reflection Table

| # | Task / Issue | Prompt Summary | Reflection / Outcome |
|---|---|---|---|
| 1 | Issue 1: Foundation | Start Issue 1 setup based on Lab 1 specification | Initialized React+Vite+Bootstrap client, Express+TypeScript+Prisma backend, Vitest configs, root `.gitignore`, `.env.example`, and `README.md`. |
| 2 | Issue 2: Health Check | Implement API health check endpoint and Check System UI | Built `/api/health` Express route with Supertest test (API-01), implemented Check System button in React with loading, online, and offline error states, and added UI tests. |
| 3 | Issue 3: Category Seed | Create Category Prisma model and idempotent seed script | Defined Category model (`id`, `name`, `createdAt`), generated Prisma migration, wrote idempotent seeding script using `upsert` for 4 IT categories, and configured seed execution. |
