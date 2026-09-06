# Lab 2 AI Use and Reflection

## AI Agent and Model

- **Agent / Environment:** Antigravity (Google DeepMind Advanced Agentic Coding Assistant)
- **Models:** Anthropic Claude 3.7 Sonnet (Thinking) & Google Gemini 3.7 Flash
- **Workflow:** Pair programming with Spec-Driven Development (Spec DD) and Test-Driven Development (TDD), interactive terminal execution, file inspection, automated test validation, code refactoring based on peer review feedback, and atomic Git commit management.

---

## Selected Key Prompts

| # | Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|---|
| 1 | **Sprint 2 Spec & Master Plan** | "Start Lab 2: Create 4 core spec files in `docs/lab-02/` (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) defining the Zen Green design system, Development Requester context, Ticket Number generation (`TKT-YYYY-XXXXXX`), and attachment soft-removal rules." | Spec-Driven Development laid a rock-solid foundation before writing a single line of application code. Defining all 12 Functional Requirements, 14 Business Rules, and 10 API Endpoints upfront prevented scope creep and gave the agent unambiguous specifications to follow. |
| 2 | **Database Expansion & Seeding** | "Implement Issue 2: Expand Prisma schema with `RequesterUser`, `Category`, `RelatedSystem`, `Ticket`, `Attachment`, `Priority`, `TicketStatus`. Seed 5 active requesters, 1 inactive, 4 categories, and 7 related systems." | Explicitly defining enum types and foreign key relations with `onDelete: Cascade` ensured referential integrity. Seeding both active and inactive requesters allowed us to verify business rule BR-05 (inactive requesters excluded from session picker). |
| 3 | **Zen Green Shell & Requester Context** | "Create Zen Green theme in `client/src/styles/zen-green.css` (`#006B3C`, `#0B7A46`, `#EAF6EF`, `#E8EFEA`) and React `RequesterContext` + `RequesterSelector` modal to simulate user context before Lab 3 auth." | Creating custom CSS variables and utility classes established consistent visual styling across all views. Storing the simulated user in LocalStorage ensured seamless persistence across page reloads. |
| 4 | **Create Ticket & Sequential Numbering** | "Implement Issue 3: `POST /api/tickets` with Multer file upload (max 5 files, 5MB, JPG/PNG/WEBP/PDF), unique sequential `TKT-YYYY-XXXXXX` generator in `ticketNumber.ts`, and `CreateTicket.tsx` with live validation and busy state." | Defining the sequential ticket number generator with a uniqueness collision loop guaranteed atomic, collision-free numbers even during rapid submissions. Adding live client-side validation prevented unnecessary network requests for invalid inputs. |
| 5 | **My Tickets & Server Test Concurrency** | "Implement Issue 4: `GET /api/tickets` with search, category/priority/status filters, pagination, and `MyTickets.tsx` with desktop table and mobile cards." | When running full test suites, parallel integration tests caused unique constraint collisions on sequential ticket numbers. The agent diagnosed this and configured `fileParallelism: false` in `server/vitest.config.mts` to ensure clean, isolated database test runs. |
| 6 | **Peer Review Refactoring Cycle (PR 4)** | "เพื่อนผมคอมเม้นแล้ว คุณทำการแก้ได้เลย พอเสร็จแล้ว commit ไว้ อย่าพึ่ง push เดี๋ยวผม push เอง" *(Address PR 4 review feedback on Prisma count aggregation, 300ms search debounce, and Clear Filters test.)* | The agent refactored `server/src/routes/tickets.ts` from loading all attachments into memory to using Prisma's native `_count` aggregation (`_count: { select: { attachments: { where: { isRemoved: false } } } }`), implemented 300ms debouncing in React, and added a Clear Filters test case. |
| 7 | **Ticket Detail & Soft-Removal Lifecycle** | "Implement Issue 5: `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, `PATCH /api/attachments/:id/remove` with mandatory reason, and read-only `TicketDetail.tsx`." | The agent implemented soft-removal preserving metadata (BR-07, BR-09) while strictly rejecting downloads for removed files with `HTTP 410 Gone` (BR-08) and enforcing data ownership boundaries (BR-04). |
| 8 | **Peer Review Refactoring Cycle (PR 5)** | "เพื่อนคอมเม้นเรียบร้อยแล้ว แก้ไขได้เลย" *(Address PR 5 review feedback on Express res.download, parent ticket updatedAt bump, formatFileSize helper, and validation test.)* | The agent replaced manual header manipulation with Express's native `res.download()`, wrapped attachment operations in Prisma `$transaction` to update the parent ticket's `updatedAt` timestamp, created the `formatFileSize` helper, and added client-side file validation tests. |
| 9 | **E2E User Journeys & Full Verification** | "ลุย Issue 6: Write complete E2E user journey tests in `client/tests/lab-02/e2e-journey.test.tsx` and update master test execution matrix in `docs/lab-02/tests.md`." | Simulating full end-to-end user journeys (`E2E-01` Create -> Success -> List -> Isolation, and `E2E-02` Detail -> Remove -> Audit History -> Back) verified all interconnected systems, achieving a 100% test pass rate across 53 automated tests. |
| 10 | **Verbatim Module Syntax Troubleshooting** | "มันขาว ไม่มีอะไรขึ้นมาเลย / Transform failed with errors: useRequester already declared" *(Diagnose blank white screen in browser.)* | When TypeScript v6 strict `verbatimModuleSyntax` caused type import errors and duplicate lines in `RequesterContext.tsx` and `RequesterSelector.tsx`, the agent cleanly converted them to type-only imports (`type ReactNode`, `type RequesterUser`), verified `npm run build` (0 errors), and confirmed browser rendering. |

---

## Overall Reflection

### How I Used the AI Agent
Throughout Lab 2, I used **Antigravity (Claude 3.7 Sonnet & Gemini 3.7 Flash)** in a disciplined, human-directed pair-programming model:
1. **Spec-Driven Architecture:** I began the sprint by having the AI generate complete, exhaustive specifications (`docs/lab-02/`) covering functional requirements, business rules, API schemas, and UI layout criteria before writing any production code.
2. **Strict Test-Driven Verification (TDD):** Every feature branch was accompanied by automated tests (Supertest for APIs, Vitest + RTL for React components, and E2E user journeys). All 53 tests were executed and passed before opening pull requests.
3. **Collaborative Peer Review & Continuous Refactoring:** I established a rigorous workflow where constructive feedback from peers on GitHub (such as switching to database count aggregations, native stream downloading, and UX debouncing) was addressed and implemented via clean atomic commits.
4. **Environment & Toolchain Diagnostics:** When TypeScript strict module rules or server concurrency issues arose, I leveraged the AI to diagnose root causes and apply standards-compliant fixes rather than hacky workarounds.

### Key Learnings & Effective Prompting Strategies
* **Spec-First Engineering Prevents Rework:** Having clear, pre-approved specifications (`specification.md`, `api-spec.md`, `ui-spec.md`) gave the AI exact constraints, eliminating ambiguity in error response formats, status codes (e.g. `410 Gone`), and character limits.
* **Granular Atomic Commits:** Instructing the AI to maintain atomic commits per logical layer (`feat(api)`, `feat(client)`, `test`, `refactor`) produced a clean, auditable Git history that made code review straightforward.
* **Human-in-the-Loop Quality Control:** Rather than allowing the AI to auto-push, I reviewed every diff, manually executed push commands, coordinated with peers on GitHub, and verified browser behavior locally.

### Human Verification and Control
I maintained complete ownership and oversight throughout the sprint:
- **Architectural & Design Approval:** Reviewed and approved all 4 specification documents in `docs/lab-02/`.
- **Database & Data Integrity:** Verified Prisma migrations, executed seeds, and confirmed cascade delete rules.
- **Peer Review Execution:** Coordinated PR reviews (PR 11, 14, 20, 21, 22, 23) with peers on GitHub, ensuring all requested refactorings were properly implemented.
- **Manual Verification:** Tested the live application in the browser at `http://localhost:5173`, testing ticket creation, file uploads, filters, sorting, responsive card views on mobile, and soft-removal modal dialogs.
- **Test Metric Verification:** Confirmed that all 53 automated tests (30 server + 23 client/e2e) passed with 0 failures across all suites.

> [!NOTE]
> **Documentation Note:** The content in the Reflection section represents my genuine assessment of the engineering process. I utilized the AI Assistant to structure the Markdown tables and refine the phrasing for maximum clarity and professional presentation.

