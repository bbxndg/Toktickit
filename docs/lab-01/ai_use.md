# Lab 1 AI Use and Reflection

## AI Agent and Model

- **Agent / Environment:** Antigravity (Google DeepMind AI Coding Assistant)
- **Model:** Google Gemini 3.7 Flash
- **Workflow:** Pair programming with interactive Terminal execution, file inspection, automated test validation, and atomic Git commit management.

---

## Selected Key Prompts

| # | Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|---|
| 1 | **Foundation Setup & Scaffold** | "Set up the TokTickIT project foundation for Lab 1: React + TypeScript + Vite + Bootstrap in `client/`, Node.js + Express + TypeScript + Prisma in `server/`, Vitest + Supertest configured on both sides. Add root `.gitignore`, `.env.example`, and `README.md`." | The agent scaffolded both client and server directories cleanly with the required dependencies and test setups. Requesting the exact tech stack and folder structure up front ensured that directory conventions aligned with the lab sheet right from the start. |
| 2 | **Implement API Health Check & UI** | "Implement Issue 2: Build `GET /api/health` returning HTTP 200 `{ status: 'ok', service: 'TokTickIT API' }`, add a Supertest test in `server/tests/lab-01/health.test.ts`, and create the Check System button in React with loading, online, and offline states." | Specifying the literal contract and response structure allowed the backend route and Supertest test to pass on the first attempt. On the frontend, having distinct state values (`idle`, `loading`, `online`, `offline`) made UI state transitions clear and easy to test with Vitest. |
| 3 | **Category Model & Database Seeding** | "Create Category Prisma model with `id`, unique `name`, and `createdAt`. Generate migration and create `server/prisma/seed.ts` inserting Account and Access, Hardware, Software, Network safely with upsert." | Specifying `upsert` explicitly fulfilled the idempotency acceptance criterion, allowing the seed command to be executed repeatedly without duplicate rows or primary key collisions. |
| 4 | **Prisma Client & Seed Troubleshooting** | "ของผมมันขึ้น error 2 จุดที่ไฟล์ seed.ts เป็นเพราะอะไร" *(Why am I getting 2 errors in seed.ts?)* | The agent identified that after modifying `schema.prisma`, running `npx prisma generate` was required for TypeScript to recognize the newly added `prisma.category` model. It also explained why `seed.ts` outside `rootDir: ./src` caused editor warnings and why running via `tsx` bypassed build interference. |
| 5 | **PostgreSQL Authentication & DB Setup** | "Authentication failed against database server, the provided database credentials for postgres are not valid. เกิดอะไรขึ้น / จะดูยังไงว่ารหัสผ่านของผมคืออะไร" *(What happened and how to fix DB credentials?)* | When local PostgreSQL rejected the credentials in `.env`, the agent walked me through Ubuntu peer authentication using `sudo -u postgres psql`, resetting the role password via `ALTER USER postgres WITH PASSWORD 'postgres';`, creating the `toktickit` database, and successfully running `npx prisma migrate dev`. |
| 6 | **Docker Requirement Clarification** | "อันนี้คือผมต้องไป setupไรไหม ต้อง setup docker ไหม / lab1 require ให้เซ้ท docker รึยัง" *(Do I need to set up Docker for Lab 1?)* | The agent clarified that Docker is optional for Lab 1 since local PostgreSQL suffices, but provided an architectural overview of how `docker-compose.yml` and Dockerfiles could containerize the stack after all lab requirements are completed. This kept our focus on core requirements without overcomplicating the setup. |
| 7 | **Enforcing Atomic Git Commits** | "คุณจำเรื่อง atomic commit ได้ใช่ไหม? / ตรวจสอบทุกอย่างอีกรอบ ว่าcriteria ครบยัง แล้วตอบผมมาว่า ready to push ยัง" *(Do you remember atomic commits? Check criteria and tell me if ready to push.)* | Constraining the agent to make granular, atomic commits (separating route implementation, test suites, UI changes, and documentation) produced a clean, professional Git history that made PR reviews straightforward for my peers. |
| 8 | **Categories API & Linux EMFILE Resolution** | "Implement Issue 4: `GET /api/categories` ordered by ID, Supertest test `API-02`, display categories in React on Check System click, and Vitest test `UI-02`." | When running dev servers on Linux, Node 22 hit `EMFILE: too many open files` in Vite and `ts-node-dev` configuration errors. The agent switched the dev runner to `tsx` and added `server.watch.usePolling: true` in `vite.config.ts`, resolving the file descriptor limit without requiring root system changes. |
| 9 | **UI Refinements & Peer Review Formatting** | "1. text ของคำว่า System Health & Diagnostic เป็นสีขาว ทำให้กลมกลืนกับ background กรุณาเปลี่ยนเป็นสีดำ 2. text ของประโยคว่า Click below... มันเบี้ยว ช่วยทำให้มันอยู่ตรงกลาง" *(Fix text contrast to dark and center-align description.)* | The agent applied `text-dark` and `text-center mx-auto` to ensure clear contrast and symmetrical layout. It also structured `reviewer.md` with structured tables for all PRs (1–4 and A–D) and configured `tests.md` with embedded screenshot paths. |

---

## Overall Reflection

### How I Used the AI Agent
Throughout Lab 1, I used **Antigravity (Gemini 3.7 Flash)** in an active pair-programming model. Rather than treating the AI as an autonomous code generator that writes everything blindly, I used it to:
1. **Scaffold and Implement to Exact Contracts:** Provide literal API shapes, status codes, and model definitions from `Lab1_Labsheet.pdf` to eliminate guesswork.
2. **Diagnose and Troubleshoot OS/Environment Issues:** Troubleshoot real-world Linux environment friction—such as PostgreSQL role authentication, Prisma schema synchronization, Node.js v22 compatibility issues with `ts-node-dev`, and Vite file watcher limits (`EMFILE`).
3. **Enforce Test-Driven Validation and Git Discipline:** Run Supertest and Vitest suites after every change, verify all acceptance criteria against the lab specification, and enforce atomic commit practices before creating pull requests.

### Key Learnings & Effective Prompting Strategies
* **Literal Contracts Over Paraphrasing:** Providing literal JSON payloads (`{ status: 'ok', service: 'TokTickIT API' }`) and exact string requirements in prompts prevented subtle discrepancies and eliminated review rework.
* **Environment-Specific Guidance:** When dealing with database credentials or Linux inotify limits, giving the agent exact terminal outputs allowed it to pinpoint the root cause immediately rather than guessing.
* **Granular Iteration & Atomic Commits:** Instructing the agent to commit each logical piece separately (`feat`, `test`, `docs`) ensured a clean Git log that matched the sprint flow.

### Human Verification and Control
I maintained strict human control over all critical aspects:
- Verified and manually executed database migration and seed commands against PostgreSQL.
- Inspected all generated migration SQL files to ensure correct unique constraints and column types.
- Manually reviewed, accepted, and tested each UI fix and automated test in the browser and terminal.
- Authored and approved all peer review comments and responses in `reviewer.md` across both my repository and my partner's repository.

> [!NOTE]
> **Documentation Note:** The content in the Reflection section is entirely based on my own opinions. I used an AI Agent to help refine the wording and format the Markdown (Re-formatting & Polishing) once again, in order to make the document more visually appealing, readable, and well-organized.
