# Lab 4 Test Plan and Traceability Matrix

**Product:** TokTickIT IT Service Desk\
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression\
**Status:** Draft Test Plan — Product Tests Not Run

---

## 1. Test Strategy & Structure

The plan follows Spec DD, Test DD and TDD for the Lab 4 scope. For each implementation issue, write the relevant failing cases, confirm the expected failure, implement the behavior, and refactor with the checks passing.

1. **Unit (Vitest):** Field normalization, transition predicates and dashboard calculation boundaries.
2. **API/Integration (Supertest + Vitest):** Persistence, authorization, parent-child workflow, metrics, stale writes and retries.
3. **UI Component (Vitest + Testing Library):** Screen modes, form validation, busy/error feedback, navigation and read-only controls.
4. **UI Style/Responsive/Accessibility:** Semantic and state assertions plus real browser screenshots, keyboard/dialog and visual inspection.
5. **Browser E2E:** Real multi-role flows against the running client/server/database.
6. **Migration/Regression/Performance Smoke:** Existing-data preservation and recovery, repeated seeding, prior-feature continuity and bounded-query measurements.

Each test ID below names a scenario group; implement meaningful parameterized cases for the stated boundaries. Every listed new test file is a **proposed path**, not an existing executable. Replace proposed paths with actual paths if implementation changes them, keeping the mapping intact. Final status is Planned until a real run supplies its command, commit, outcome, and evidence. Failed or Blocked results must remain visible; required scenarios cannot be skipped to obtain a green summary.

API integration tests use Express/Supertest and a disposable PostgreSQL database. UI component tests use the existing Vitest/Testing Library setup. Existing `client/tests/lab-02/e2e-journey.test.tsx` and `client/tests/lab-03/e2e-journey.test.tsx` mock network behavior; they are component journeys, not real browser E2E. Issue 5 will add a browser runner and the real browser paths below. The runner choice/configuration and exact command must be recorded before execution; Playwright is the proposed choice, not an installed dependency in Issue 1.

Do not run migration, reset, destructive fixture cleanup, or restoration against the student's working database. Assert the dedicated test database name before fixture setup. Use isolated fixture keys and remove only records created by the suite. Run database-mutating API suites serially, consistent with the existing server test configuration. Freeze/inject the clock for time-boundary assertions. Never publish JWTs, passwords, connection strings, private notes, or uploaded private binaries as test evidence.

### 1.1. Fixture Design

- Requester A owns mixed Tickets; Requester B owns different Tickets; Requester Z has none. Include active staff A/B, Administrator A/B, inactive users, and a password-change-required user.
- Cover all eight Ticket statuses and all four requested/IT priorities; include null legacy IT Priority, assigned/unassigned ownership, and distinct action assignees/performers on one Ticket.
- Cover zero, one, and many actions; both pending states and both terminal states; follow-up true/false, result/reason boundaries, and retained inactive assignee history.
- Use a fixed dashboard time T and resolutions at T-7 days, one millisecond before it, T, one millisecond after it, and null. Include reopened/closed Tickets whose old resolution must not count.
- Include equal timestamps with different IDs, more than five dashboard rows, and more than fifty actions/history events to exercise bounds/pagination. Empty users must return zero buckets and arrays.
- Preserve representative Lab 3 Users, Tickets, active/removed Attachments, Public Comments, and Internal Notes for migration/recovery. Record fixture-only file checksums separately from database metadata.

---

## 2. Test Execution Matrix

All rows have final status **Planned**. Requirement IDs refer to Lab 4, not earlier labs' locally numbered rules.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Target Test File | Status |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-01 | Unit | FR-05; BR-08,09; AC-02 | Normalize action fields and conditional validation boundaries | Null/empty, whitespace, 1/2/2000/2001 characters, wrong types, enums and safe integers produce the documented validation results. | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| UNIT-02 | Unit | FR-06,07; BR-11,13-16; AC-04,07-09 | Exhaust action/Ticket matrices, gate and indication eligibility | Only approved transitions/no-ops pass; pending classification and eligible indication states are correct. | `server/tests/lab-04/workflow.unit.test.ts` | Planned |
| UNIT-03 | Unit | FR-11,12; BR-23-25; AC-15 | Calculate active set, UTC boundaries and effective priority | Inclusive rolling interval and null-priority fallback match dashboard predicates. | `server/tests/lab-04/dashboard-calculations.unit.test.ts` | Planned |
| API-01 | API | FR-01,02; BR-01,02,05,07; AC-01 | Create work as staff/Admin with default assignee | 201; one correct child, server actor/date, parent version +1; status/owner unchanged. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API | FR-05; BR-08,09; AC-02 | Submit invalid fields and conditional/merged-state failures | 400 with field errors; no action/parent partial writes. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API | FR-02; BR-02,06; AC-03,04 | Assign/reassign across staff and reject ineligible targets | Owner independent; missing/inactive/Requester rejected; reassign retained inactive assignee before completion. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API | FR-03; BR-05,07,11,12; AC-04 | Create completed, progress, complete/cancel and reject forbidden edits | Result/reason/actual actor/time correct; terminal edits/deletion and inactive-parent writes fail. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-05 | Authorization | FR-04,15; BR-03,04; AC-05,19 | Attempt missing/expired/inactive/password-gated/wrong-role/non-owned access | 401/403 as appropriate; owned reads succeed; non-owned/missing identical 404; requester writes 403 before lookup. | `server/tests/lab-04/authorization.api.test.ts` | Planned |
| API-06 | API/security | FR-04,05; BR-05,07,10,27,29; AC-06 | Forge immutable fields and inspect shared data projections | Reject actor/parent/date and create-version input; no secrets/private notes/key/hash exposure; file access remains protected. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | API | FR-01,08; BR-07,17,27; AC-10,23 | Read equal-timestamp/edited rows and pagination boundaries | Stable order; pageSize 1-50; invalid 400; beyond-last empty; accurate consistent totals/parent. | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-08 | Workflow | FR-06,08; BR-13,16-18; AC-07,10 | Exercise Ticket matrix, implicit claim, ownership and priority boundaries | Only approved transitions; claim-other-owner 409; terminal freeze; requested priority unchanged; one event per change and none for no-op. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-09 | Workflow | FR-06; BR-12,14,16; AC-08 | Resolve with pending/terminal/zero child work and close before resolve | 422 for pending or invalid close; terminal/zero-action with valid summary resolves; completion never auto-resolves. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-10 | Workflow | FR-06,08,09; BR-14,17,18; AC-08,10,11 | Cancel Ticket containing mixed child statuses | Valid reason required; pending children cancel atomically with versions/time/actor; terminal children retained; one parent update/event. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-11 | Workflow | FR-07; BR-15,16; AC-09 | Indicate as owner in eligible/ineligible states and reopen | Advisory flag/time only; fresh repeat no-op; unauthorized rejected; reopen clears current resolution fields and keeps history. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-12 | Workflow | FR-08; BR-04,17,20; AC-05,10 | Read and attempt to mutate Ticket status history | Owned/staff projections ordered; no edit/delete, fake legacy event or indication event. | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-13 | Concurrency | FR-09; BR-18; AC-11 | Race parent changes, action edits/create, resolution and cancellation | One current-version mutation wins; stale loser 409; no lost update, partial event/child writes or gate bypass. | `server/tests/lab-04/concurrency.api.test.ts` | Planned |
| API-14 | Retry | FR-10; BR-19; AC-12 | Retry identical creation concurrently/after lost response; change keyed input | One child; identical replay 200 even after parent changes; changed input 409; key scoped to creator/parent and access checked first. | `server/tests/lab-04/concurrency.api.test.ts` | Planned |
| API-15 | Dashboard | FR-11; BR-22-24,27; AC-13,15 | Query Requester dashboard with mixed/empty data and spoofed identity | Owned authoritative counts/lists only; zero/empty success and correct role/ownership failures. | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-16 | Dashboard | FR-12; BR-22-25,27; AC-14,15 | Query staff/Admin dashboards with different action assignments | All-ticket metrics, active-priority buckets, full current-user action count and stable capped lists correct. | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-17 | Dashboard | FR-11,12; BR-23-25; AC-15 | Query fixed-clock boundaries/nulls/reopened/closed and concurrent writes | Inclusive UTC/current-RESOLVED rules, legacy priority/date behavior and internally consistent snapshot. | `server/tests/lab-04/dashboard-boundaries.api.test.ts` | Planned |
| API-18 | Drill-down | FR-13; BR-24-26; AC-16 | Follow each metric predicate into detailed list queries | Matching total at same snapshot, preserved time window/ownership; incompatible/bad params 400. | `server/tests/lab-04/dashboard-drilldown.api.test.ts` | Planned |
| UI-01 | Component | FR-01-05; BR-05-12,29; AC-01-06 | Use staff action list/create/view/edit and Requester read-only view | Correct fields/labels/conditional validation/assignment; automatic actor read-only; inert text; no staff/private DOM for Requester. | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | Component | FR-06-08; BR-13-17; AC-07-10 | Use permitted Ticket transitions, gate, advisory indication and history | Required confirmations/summary/reason; blocker link and refreshed badges; indication remains advisory; terminal controls absent. | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-03 | Component | FR-11,13; BR-22-28; AC-13,15,16,21 | Render Requester dashboard and follow card/detail navigation | Correct labels/loading/empty/filter/window; page resets to 1 and return context retained. | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-04 | Component | FR-12,13; BR-22-28; AC-14-16,21 | Render staff/Admin dashboard and navigate current-user work | Correct cards/chips, five rows and N of M, action detail/tab, role navigation and Admin User Management. | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-05 | Component/failure | FR-09,10,16; BR-18,19,28; AC-11,12,21 | Double-click, lose response, fail validation/network, conflict or switch account | Busy guard/reused creation key; draft preserved on recoverable failure, explicit reload/review, no silent overwrite or late identity data. | `client/tests/lab-04/failure-states.test.tsx` | Planned |
| UI-06 | UI style | FR-16; BR-29; AC-20 | Assert meaningful style, label, badge, focus and dialog semantics | Documented token/state conventions and accessible controls; rendered browser inspection complements DOM checks. | `client/tests/lab-04/styles-accessibility.test.tsx` | Planned |
| MIG-01 | Migration | FR-14; BR-20; AC-17 | Apply additive migrations to disposable existing-data snapshot | Counts/IDs/numbers/FKs/authorship/status/file metadata/checksums preserved; version 1, flag false, unknown dates null, no fake work/history. | `server/tests/lab-04/migration.integration.test.ts` | Planned |
| MIG-02 | Recovery | FR-14; BR-20; AC-17 | Restore DB/upload backup into second disposable target | Integrity comparisons and baseline authenticated reads/downloads succeed with documented recovery procedure. | `server/tests/lab-04/recovery.integration.test.ts` | Planned |
| SEED-01 | Integration | FR-14; BR-21; AC-18 | Seed twice alongside user records and changed fixture credentials | Counts/IDs/user changes stable; all status/priority/owner/action and zero/nonzero demo cases available. | `server/tests/lab-04/seed.integration.test.ts` | Planned |
| REG-01 | Regression | FR-15; BR-30; AC-19 | Run earlier server/client suites with reviewed authenticated fixtures | Existing permitted behavior passes; explicit Lab 4 corrections documented; no hidden removed/skipped requirements. | Existing paths in section 5 | Planned |
| SEC-01 | Security | FR-15; BR-03,04,10,31; AC-05,06,19 | Directly test protected API/note/file access and existing auth/logout flows | No requesterId/default/query-token/static bypass; live role/password gate, private visibility and approved authentication contract preserved. | `server/tests/lab-04/security-regression.api.test.ts` | Planned |
| E2E-01 | Browser E2E | FR-01-05,09,10; BR-01-12,18,19; AC-01-06,11,12 | Real staff creates/assigns/edits/completes/cancels several actions; Requester reads | Backend persists independent actors/assignment; validation/inactive/role/retry/recovery scenarios follow contract. | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | Browser E2E | FR-06-08; BR-13-18; AC-07-11 | Create/indicate, attempt gated resolve, finish work, resolve/close/reopen/cancel | Real role workflow, history and parent/child status agree; incomplete work cannot bypass gate. | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | Browser E2E | FR-11-13,15; BR-22-28,30,31; AC-13-16,19,21 | Role dashboard landing/drill-down/empty/failure and earlier user journeys | Real metric destinations and identity isolation; auth/list/detail/attachments/comments/notes/Admin continuity. | `e2e/lab-04/dashboards.spec.ts` | Planned |
| RESP-01 | Browser/responsive | FR-16; BR-29; AC-20 | Use major screens at desktop/tablet/mobile/320px and 200% zoom | No clipping/overlap/page overflow; touch/keyboard/dialog operation correct; actual screenshots retained. | `e2e/lab-04/responsive-accessibility.spec.ts` | Planned |
| PERF-01 | Performance smoke | FR-11,12,14; BR-23,27; AC-23 | Measure representative larger local dataset against section 4 target | Exact independent totals, bounded payload/list sizes and recorded query/timing outcomes; no N+1 growth. | `server/tests/lab-04/performance-smoke.api.test.ts` | Planned |
| DOC-01 | Manual/doc review | FR-17,18; BR-32; AC-22 | Review contract, actual paths/results, setup, workflow and final evidence | Four-file feature 1 scope, consistent AC/BR mapping, five work branches and truthful later Answer Parts 1-9 evidence. | No automated product file; review log in section 6 | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

The table above is the authoritative detailed mapping. This index prevents an AC from being missed during implementation.

| Acceptance Criterion | Description | Mapped Tests | Status |
| --- | --- | --- | --- |
| **AC-01** | Create Valid Action | API-01, UI-01, E2E-01 | Planned |
| **AC-02** | Action Validation | UNIT-01, API-02, UI-01, E2E-01 | Planned |
| **AC-03** | Independent Assignment | API-03, UI-01, E2E-01 | Planned |
| **AC-04** | Action Lifecycle | UNIT-02, API-03, API-04, UI-01, E2E-01 | Planned |
| **AC-05** | Role and Ownership Protection | API-05, API-12, SEC-01, UI-01, E2E-01 | Planned |
| **AC-06** | Safe Shared Content | API-06, SEC-01, UI-01, E2E-01 | Planned |
| **AC-07** | Ticket Transitions | UNIT-02, API-08, UI-02, E2E-02 | Planned |
| **AC-08** | Resolution Gate | UNIT-02, API-09, API-10, UI-02, E2E-02 | Planned |
| **AC-09** | Advisory Requester Indication | UNIT-02, API-11, UI-02, E2E-02 | Planned |
| **AC-10** | Append-Only Status History | API-07, API-08, API-10, API-12, UI-02, E2E-02 | Planned |
| **AC-11** | Concurrent and Stale Writes | API-10, API-13, UI-05, E2E-01, E2E-02 | Planned |
| **AC-12** | Duplicate Creation Retry | API-14, UI-05, E2E-01 | Planned |
| **AC-13** | Requester Dashboard | API-15, UI-03, E2E-03 | Planned |
| **AC-14** | Staff Dashboard | API-16, UI-04, E2E-03 | Planned |
| **AC-15** | Dashboard Boundaries and Empty Data | UNIT-03, API-15, API-16, API-17, UI-03, UI-04, E2E-03 | Planned |
| **AC-16** | Dashboard Drill-Down | API-18, UI-03, UI-04, E2E-03 | Planned |
| **AC-17** | Migration and Recovery | MIG-01, MIG-02 | Planned |
| **AC-18** | Idempotent Seed | SEED-01 | Planned |
| **AC-19** | Earlier-Function Regression | API-05, REG-01, SEC-01, E2E-03 | Planned |
| **AC-20** | Responsive and Accessible UI | UI-06, RESP-01, manual checklist | Planned |
| **AC-21** | Failure Feedback | UI-03, UI-04, UI-05, E2E-03 | Planned |
| **AC-22** | Documentation and Delivery Evidence | DOC-01 | Planned |
| **AC-23** | Performance Smoke | API-07, PERF-01 | Planned |

BR coverage groups: BR-01-12 -> API-01-07; BR-13-17 -> API-08-12; BR-18-19 -> API-13-14; BR-20 -> MIG-01/02; BR-21 -> SEED-01; BR-22-27 -> API-15-18/PERF-01; BR-28 -> UI-05/E2E-03; BR-29 -> UI-06/RESP-01; BR-30 -> REG-01/E2E-03; BR-31 -> SEC-01; BR-32 -> DOC-01. FR-01-18 all appear in the detailed matrix.

---

## 4. Responsive, Visual and Performance Checks

Exercise both dashboards, staff action create/edit/view, Requester action view, workflow confirmation/gate/history, and earlier primary screens at 1280x800, 820x1180 and 390x844; add 320px width and 200% browser zoom. Capture actual screenshots under `artifacts/lab-04/screenshots/` using the directories in [ui-spec.md](ui-spec.md). Inspect labels, private/shared distinction, empty/long values, conditional validation placement, read-only fields, focus visibility/order, keyboard tabs/dialog trap/Escape/focus return, 44px touch controls and no page overflow. Measure text/background contrast against WCAG AA (4.5:1 normal text; 3:1 large text) and control/focus visibility. Component tests alone do not prove browser layout or contrast.

Manual status: **Planned**. Complete the UI spec's checklist with dated evidence; do not tick boxes based on intended CSS. Check browser console and broken links during the real demo. Test network loss/500/401/403/404/409/422 and refresh-after-failure on representative forms; confirm drafts persist only for the current identity.

- [ ] Zen Green colors, typography, badges and button hierarchy match the UI contract.
- [ ] Editable/read-only fields and conditional validation messages are clear on every viewport.
- [ ] Desktop/tablet/mobile screenshots show no clipping, overlap or page-level horizontal overflow.
- [ ] Keyboard focus, dialog trap/return, labels and non-color status cues work in the browser.
- [ ] Dashboard drill-down and Requester/shared/private visibility remain correct.
- [ ] Loading/empty/failure/conflict screens preserve recoverable input and show truthful feedback.

PERF-01 uses a disposable local fixture of at least 1,000 Tickets and 3,000 actions. This is a chosen smoke workload, not a production capacity promise. Record machine/DB/configuration, row counts, query count, JSON byte size, 3 warm-ups and 20 measured dashboard requests per role. Chosen local target: p95 <= 1,000ms per endpoint after warm-up, at most five rows in each dashboard list, exact counts and no per-row N+1 query growth. A slow result triggers query/index investigation; record the outcome instead of weakening it silently. Browser first-load/network performance is outside this API timing measure.

---

## 5. Test Execution Instructions

Existing package scripts (run from repository root, when ready for product verification):

```bash
npm --prefix server test
npm --prefix client test
npm --prefix server run build
npm --prefix client run build
npm --prefix client run lint
```

No root `package.json` command is assumed. There is no server lint script in the current package. A focused proposed API command after its file exists is `npm --prefix server test -- tests/lab-04/actions-taken.api.test.ts`. Browser E2E, disposable migration/recovery and performance commands are **pending Issue 5 configuration**; record exact executable commands after adding the runner and safety guards.

Existing regression paths: `server/tests/lab-01/`, `server/tests/lab-02/`, `server/tests/lab-03/`, `client/tests/lab-01/`, `client/tests/lab-02/`, `client/tests/lab-03/`. Reconcile earlier tests for advisory requester indication, required versions, authenticated requester fixtures and role dashboard landing. Record old expectation, corrected requirement and new assertion; maintain the covered user capability. Keep any legacy selector simulation in isolated tests, never an unauthenticated production route.


---

## 6. Final Test Results

| Run / check | Branch and commit | Command or manual procedure | Actual file/artifact paths | Outcome | Date / reviewer |
| --- | --- | --- | --- | --- | --- |
| Issue 1 product tests | `feature/1_lab4-specifications`; uncommitted draft | Not run: documentation scope | None | Not run | Pending |
| Issue 1 document structure | `feature/1_lab4-specifications`; uncommitted draft | Read-only checks of relative links, JSON examples, requirement/test mappings, four-file scope and branch count; git status/diff inspection | Four core Markdown files in `docs/lab-04/`; tool output in revision session | Pass for these document checks only | Issue 1 revision session; peer review pending |
| Issues 2-4 focused tests | Pending | Pending | Pending | Planned | Pending |
| Issue 5 migration/recovery/seed/security | Pending | Pending | Pending | Planned | Pending |
| Full regression, builds, lint and browser E2E | Pending | Pending | Pending | Planned | Pending |
| Visual/accessibility/performance smoke | Pending | Pending | Pending | Planned | Pending |
| Final main verification | Pending | Pending | Pending | Planned | Pending |

At release, record final main's commit hash and rerun the required suites there. Link outputs/screenshots and update each scenario group's final status from real evidence; evidence from an earlier branch must not be represented as execution on main.

---

## 7. Known Limitations or Deferred Verification

- Feature 1 contains only the four core documents. All product scenario groups remain Planned; no Lab 4 implementation or runtime test pass is claimed.
- New test paths are proposed until their implementation issue creates them. Record real file paths before final submission.
- Browser E2E configuration, migration/recovery/performance commands and screenshot artifacts do not yet exist for Lab 4. Add and verify them during implementation; component journeys do not substitute for browser evidence.
- Reviewer and AI-use records are prepared later from actual review/prompt evidence using the earlier-lab formats.
- Exact metrics, field limits, action statuses and concurrency/retry implementation are project decisions for review under Lab 4, not values prescribed verbatim by the handout.
