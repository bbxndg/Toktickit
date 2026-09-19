# Lab 3 AI Use and Reflection

## AI Agent and Model

- **Agent / Environment:** Antigravity (Google DeepMind Advanced Agentic Coding Assistant)
- **Models:** Anthropic Claude 3.7 Sonnet (Thinking) & Google Gemini 3.7 Flash
- **Workflow:** Pair programming with Spec-Driven Development (Spec DD) and Test-Driven Development (TDD), interactive terminal execution, file inspection, automated test validation, code refactoring based on peer review feedback, and atomic Git commit management.

---

## Selected Key Prompts

| # | Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|---|
| 1 | **Sprint 3 Spec & Master Architecture** | "Create 4 core spec files in `docs/lab-03/` (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) defining the multi-role RBAC architecture (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), password complexity rules, IT staff ticket triage matrix, public comments vs confidential internal notes, and administrative safety rules (BR-17, BR-18)." | Spec-Driven Development established unambiguous system constraints before implementation. Laying out all 18 Business Rules, 10 Functional Requirements, and 22 API endpoints upfront ensured strict adherence to security and role-isolation boundaries throughout the sprint. |
| 2 | **Authentication & First-Login Password Change (Issue 1)** | "Implement `server/src/routes/auth.ts` with bcrypt password hashing, JWT sessions, `POST /login`, `POST /change-password`, `GET /me`, mandatory first-login password change modal, and `Login.tsx` form with busy state." | Building the authentication layer with strict password complexity regex and server-enforced `isPasswordChangeRequired` flags ensured robust session security. Blocking application navigation until password compliance is met fulfilled BR-02 seamlessly. |
| 3 | **Peer Review Refactoring: Form Clearance & Security Feedback** | "Refactor auth and modal components based on PR 1 peer review: 1) Clear sensitive state on logout in `AuthContext.tsx`. 2) Provide dynamic password complexity requirement checklist feedback in `ChangePasswordModal.tsx`." | Addressing review feedback improved both security hygiene and user experience. Dynamic requirement checklist indicators gave users immediate visual confirmation of compliant password criteria. |
| 4 | **IT Staff Ticket Queue & Triage Matrix (Issue 2)** | "Implement `GET /api/staff/tickets` with search, category/priority/status/owner filters, pagination, `PATCH /claim`, `PATCH /priority`, `PATCH /status` (enforcing status transition matrix), `StaffTicketQueue.tsx` with desktop table/mobile cards, and `StaffTicketDetail.tsx`." | Enforcing the permitted status transition matrix (`BR-10`) at the API layer prevented invalid ticket lifecycle jumps (e.g. `NEW` to `CLOSED`). Creating responsive desktop table and mobile card layouts provided a streamlined triage experience across all screen sizes. |
| 5 | **Administrator User Management & Safety Guards (Issue 3)** | "Implement `GET/POST /api/admin/users`, `PUT /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`, preventing self-deactivation (BR-17), preventing deactivation of the last active administrator (BR-18), and `UserManagement.tsx`." | The AI successfully implemented critical safety rules that protect the system from accidental administrative lockout. Both backend middleware guards and frontend UI state locks were synchronized to ensure foolproof administrative operations. |
| 6 | **Peer Review Refactoring: Role Tooltips & Safety Alerts** | "Enhance User Management UI based on PR 3 review comments: Add descriptive role tooltips to badges and emphasize safety warnings when editing administrative accounts, without altering existing authentication flow." | Applying code review suggestions polished the administrative UI. Adding role description tooltips and safety banners clarified system privileges without destabilizing underlying authentication logic. |
| 7 | **Collaboration: Comments & Confidential Notes (Issue 4)** | "Implement append-only Public Comments (`GET/POST /api/tickets/:id/comments`), confidential Internal Notes (`GET/POST /api/tickets/:id/notes`) strictly restricted to IT Staff and Admin (returning HTTP 403 to Requesters), and Requester Resolution action (`PATCH /api/tickets/:id/indicate-resolved`)." | Strict role isolation was enforced for confidential notes, ensuring requesters can never view or query internal IT discussions. The append-only design maintained complete audit trail integrity for all ticket communications. |
| 8 | **Collaboration UI & Requester Resolution Flow** | "Integrate Public Comments and amber Internal Notes tabs into `StaffTicketDetail.tsx`, add Public Comments and 'Problem Appears Resolved' button with confirmation modal in `TicketDetail.tsx`, ensuring Internal Notes are strictly excluded from Requester DOM." | Designing distinct visual themes (green for public conversation, amber with lock icons for internal notes) made operational context instantly recognizable. Adding the resolution modal allowed requesters to confirm ticket completion intuitively. |
| 9 | **End-to-End User Journeys (E2E-01, E2E-02, E2E-03)** | "Create comprehensive multi-role user journey tests in `client/tests/lab-03/e2e-journey.test.tsx` covering full auth lifecycle, IT staff queue triage, and admin safety rules, achieving 100% test pass rate." | Simulating real-world multi-step user journeys verified end-to-end cohesion across all roles and screens, confirming that all acceptance criteria operate harmoniously in an integrated environment. |
| 10 | **Regression Elimination & Test Mock Alignment** | "Diagnose test failures in legacy Lab 2 test suites and align mock handlers in Vitest to achieve 100% green test passes across all 27 test files." | The AI diagnosed subtle test mock collisions where newly added comment fetching interfered with legacy Lab 2 test mocks. Guarding comment queries with auth token presence ensured zero regressions across all 53 Lab 2 tests while supporting all Lab 3 features. |

---

## Overall Reflection

### How I Used the AI Agent
Throughout Lab 3, I utilized **Antigravity (Claude 3.7 Sonnet & Gemini 3.7 Flash)** as an active, human-directed pair programming partner:
1. **Spec-Driven Architecture:** Before writing code, I guided the AI to draft comprehensive specification documents (`docs/lab-03/`) defining role boundaries, security policies, and test matrices.
2. **Test-Driven Development (TDD):** Every feature was accompanied by automated API tests (Supertest), UI component tests (Vitest + Testing Library), and full E2E user journeys.
3. **Rigorous Code Review & Refactoring:** I established a structured GitHub PR workflow where constructive feedback from peer reviews was analyzed and implemented through clean, atomic commits.
4. **Zero-Regression Assurance:** We maintained continuous backward compatibility, verifying that all Lab 1 and Lab 2 test suites remained 100% green without side effects.

### Key Learnings & Effective Prompting Strategies
* **Unambiguous Constraint Specification:** Providing clear business rules and expected HTTP status codes (e.g. `403 Forbidden` for notes, `422 Unprocessable Entity` for invalid status transitions) allowed the AI to implement robust error handling on the first attempt.
* **Granular Atomic Commits:** Structuring work into incremental commits (`feat(server)`, `feat(client)`, `test`, `docs`) ensured a clear git history and simplified code reviews.
* **Targeted Test Execution for Fast Feedback:** Running individual test cases with `npx vitest run <file> -t "<name>"` enabled rapid debugging of edge cases before running full regression suites.

### Human Verification and Control
I maintained strict oversight and verification across all stages of development:
- **Design & Security Approval:** Reviewed and validated all RBAC authorization rules, password complexity requirements, and safety guards.
- **Database Schema Validation:** Inspected Prisma models and verified that cascade rules and foreign key relations preserved data integrity.
- **Peer Review Coordination:** Managed PRs on GitHub, coordinated code reviews with peers, and approved all refactoring diffs.
- **Interactive Manual Testing:** Verified the live web application in the browser (`http://localhost:5173`), testing login flows, queue sorting/filtering, claiming/reassigning tickets, posting comments/notes, and admin user management.
- **Full Test Suite Verification:** Confirmed that all 27 test files and 129 automated tests (80 server + 49 client/E2E) passed with 0 errors and zero regressions.

> [!NOTE]
> **Documentation Note:** The content in the Reflection section represents my genuine assessment of the engineering process. I utilized the AI Assistant to structure the Markdown tables and refine the phrasing for maximum clarity and professional presentation.

