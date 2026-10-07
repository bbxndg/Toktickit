# Lab 4 Sprint Engineering Specification

**Product:** TokTickIT IT Service Desk\
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression\
**Status:** Draft Specification — Pending Student and Peer Review\
**Requirements Source:** SE Lab 4 labsheet\
**Companion Contracts:** [API](api-spec.md), [UI](ui-spec.md), [tests](tests.md)

---

## 1. Sprint Goal

Complete the local service-desk workflow by recording the work performed under each Ticket, enforcing the final resolution rules, and giving Requesters and IT Staff useful dashboards. Preserve existing data and permitted behavior from Labs 1-3 while improving concurrency handling, failure feedback, responsive layouts, accessibility, and demonstration evidence.

---

## 2. Stakeholder Request Interpretation

A Ticket is the parent request coordinated by one primary Ticket Owner. Several staff members may plan, perform, and record different Actions Taken under that Ticket. Requesters can read the work on their own Tickets and indicate that the problem appears resolved; staff must review the work and formally resolve or close it. Dashboards summarize authoritative database data and lead back to the detailed Ticket screens.

### 2.1. Lab 4 requirement coverage

| Lab 4 source | Contract coverage |
| --- | --- |
| Sections 3, 4.1-4.4 and 8.3 | Action fields, parent-child structure, independent staff work and role permissions |
| Sections 4.5, 8.4 and 9; Answer Part 7 | Final Ticket matrix, server-enforced resolution gate, advisory requester indication and append-only workflow evidence |
| Sections 4.6, 6.2 and 8.1-8.2; Answer Part 5 | Backend metrics, current-user actions, bounded recent lists, empty states and drill-down |
| Section 5 | Additive model/migration, preserved data, legacy behavior, justified indexes, idempotent seed and recovery |
| Sections 6.1 and 8.5 | Stale/conflicting writes, duplicate retries, retained form input, safe failures and earlier-function regression |
| Sections 7 and 8.6; Answer Part 9 | Existing Zen Green conventions, responsive layout and accessibility |
| Sections 9-14 | Specification structure, test traceability, feature/staging/release workflow and final evidence |

Lab 4 is the requirements source for this sprint. Earlier labs and repository documents provide context about the existing implementation and examples of documentation style. Existing features are regression subjects because Lab 4 sections 1, 6 and 8.5 explicitly require their continuation; they are not separate new Lab 2/3 implementation tasks. Lab 4 itself refers to earlier responsive and process conventions in sections 8.6 and 11-13.

Section 11 records proposed implementation decisions where Lab 4 asks students to define details. Exact limits, enum names, endpoints, metrics and concurrency mechanisms are project choices, not verbatim handout requirements. The current requester-indication code changes status to RESOLVED; correcting it is within Lab 4 section 4.5's explicit advisory rule.

---

## 3. Scope

### 3.1. Included

- Actions Taken list, create, assign/reassign, edit, status transitions, complete/cancel, and read-only requester presentation.
- Required fields: creation date/time, description, result, automatic performer, follow-up flag/note, and attachment notes.
- Staff and Administrator operational permissions; Requester access limited to owned Tickets.
- Final Ticket transitions, incomplete-action resolution gate, advisory requester indication, and append-only Ticket status history.
- Version checks and atomic updates across Ticket and Action records; safe creation retries.
- Requester and IT Staff dashboards; Administrator reuses the staff dashboard and retains User Management.
- Backend metric calculations, recent Tickets, current-user pending actions, defined drill-down filters, and zero-data states.
- Additive Prisma migrations, preservation of earlier data, deterministic idempotent local seed fixtures, recovery verification.
- Regression, security checks, responsive/accessibility checks, browser E2E, performance smoke checks, and current setup/demo documentation.

### 3.2. Explicitly Excluded

- Automatic SLA clocks, escalation engines, on-call scheduling and breach notifications.
- Email, SMS, LINE, push and other external notification services.
- Inventory/spare-parts management, purchasing and service-cost accounting.
- Time-sheet billing, payroll and detailed labor-cost calculations.
- Multi-level approvals and electronic signatures.
- Advanced BI, custom report builders and export warehouses.
- Multi-tenancy and production cloud operations.
- Unrelated product features outside the reviewed Lab 4 contract.

This design adds no new role, action file-upload subsystem, self-registration or reference-data management screen. Optional Administrator account-count cards are deferred; its staff dashboard covers the approved role needs.

---

## 4. Functional Requirements

### Actions Taken

- **FR-01**: The system shall list, create, and edit Actions Taken under their parent Ticket using the fields in section 7.
- **FR-02**: The system shall assign work to an active staff/Admin user, independently of Ticket ownership, and stamp creator/editor/performer from authenticated identity.
- **FR-03**: The system shall support action planning, progress, completion, and cancellation with the defined transition and validation rules.
- **FR-04**: The system shall show all Actions Taken on owned Tickets to Requesters without allowing action writes or exposing Internal Notes.
- **FR-05**: The system shall validate action fields on client and server; render user content safely as plain text.

### Ticket Workflow

- **FR-06**: The system shall enforce the final Ticket transition matrix and incomplete-action resolution gate on the backend.
- **FR-07**: The system shall record requester resolution indication without changing Ticket status or bypassing staff review.
- **FR-08**: The system shall append a status-history entry for each actual Ticket status change and show history in stable order to permitted roles.
- **FR-09**: The system shall detect stale writes and serialize action writes and Ticket workflow changes so resolution cannot race unfinished work.
- **FR-10**: The system shall prevent duplicate action creation from repeated clicks or a retry after a lost response.

### Role Dashboards

- **FR-11**: The system shall provide a Requester dashboard containing only owned Ticket metrics and recent Tickets.
- **FR-12**: The system shall provide a shared staff/Admin dashboard with operational metrics, recent Tickets, and current-user pending Actions Taken.
- **FR-13**: The system shall open detailed lists or Ticket Detail from dashboard controls with the exact documented filters.

### Regression and Product Completion

- **FR-14**: The system shall migrate, backfill, seed, and recover without losing earlier records, ownership, attachments, or authorship.
- **FR-15**: The system shall preserve permitted earlier workflows and harden authentication, ownership, private notes, attachments, and account safety.
- **FR-16**: The system shall provide consistent processing/validation/success/empty/forbidden/conflict/failure states and accessible responsive UI.
- **FR-17**: The system shall maintain truthful setup, migration, seed, test, demonstration, and course evidence documentation.
- **FR-18**: Sprint work shall be delivered through exactly five work branches, peer-reviewed PRs into `lab4-staging`, and a release PR into `main`.

---

## 5. Business Rules

### 5.1. Actions Taken and authorization

- **BR-01 (Parent relationship)**: Every `ActionTaken` belongs to exactly one existing Ticket. Its `ticketId` cannot be changed after creation. A Ticket may have zero, one, or many actions.
- **BR-02 (Independent responsibilities)**: `Ticket.ownerId` coordinates the request; `ActionTaken.assigneeId` coordinates that work item. They may be different users. Creating, assigning, completing, or cancelling an action must not silently change Ticket ownership or status.
- **BR-03 (Authentication)**: Protected operations require a valid Bearer token, a live active database account, its current database role, and a cleared password-change flag. Invalid/expired/missing authentication returns 401; first-password-change restriction returns 403 `PASSWORD_CHANGE_REQUIRED`. New endpoints never accept simulated `requesterId` identity.
- **BR-04 (Access)**: Requesters read actions/history only on owned Tickets (non-owned/missing Ticket: identical 404). Requesters cannot write actions or staff workflow (403 before resource lookup). Active IT Staff and Administrators have operational access across Tickets. Only Administrators manage users.
- **BR-05 (Attribution)**: Creator and last editor are server-stamped. `performedById` is null before completion and is stamped from the user completing the action, including creation directly as `COMPLETED`. It is read-only and immutable afterwards. This separates planned assignment from actual performance; client-supplied actor IDs are rejected.
- **BR-06 (Assignment)**: Creation defaults assignee to the authenticated staff user. Explicit assignments must reference an existing active `IT_STAFF` or `ADMINISTRATOR`; missing, inactive, or Requester targets return 400. Deactivation retains historical associations; assigning the same inactive user again is rejected. Completion requires the retained assignee to be active, so pending work for a deactivated assignee must first be reassigned.
- **BR-07 (Dates and ordering)**: `actionAt` and `createdAt` are the server creation timestamp in UTC; no user-supplied date override. Action list order is `actionAt ASC, id ASC`; edit timestamps never reorder it. Terminal timestamps are server-stamped. UI displays them with an explicit local timezone.
- **BR-08 (Content validation)**: Trim strings. `description`: 2-2,000 characters; `result`: optional while pending, any nonempty value 2-2,000 and required when completed; `followUpNote`, `attachmentNotes`, and `cancelReason`: optional empty/null or 2-2,000, with conditional requirements below. Booleans must be JSON booleans, IDs and versions positive safe integers, and statuses exact enum values. Length means JavaScript string length consistently on both layers.
- **BR-09 (Follow-up)**: `followUpRequired=true` requires a nonempty valid follow-up note. False normalizes the note to null. A follow-up flag documents advice; it does not automatically create another action, send notifications, or change Ticket status. Unfinished work that prevents resolution must remain a pending action.
- **BR-10 (Attachment notes)**: Attachment notes are shared plain text identifying existing permitted Ticket attachments. They do not authorize a file, replace upload/download ownership checks, or contain Internal Notes. Removed files remain unavailable regardless of notes.
- **BR-11 (Action transitions)**: Create as `PLANNED`, `IN_PROGRESS`, or `COMPLETED`. `PLANNED -> IN_PROGRESS | COMPLETED | CANCELLED`; `IN_PROGRESS -> COMPLETED | CANCELLED`; `COMPLETED` and `CANCELLED` are terminal. Completion requires result; cancellation requires reason. Any active staff/Admin may act, not only the assignee. Repeating the same pending status is allowed when editing other fields, not a new transition.
- **BR-12 (Edit boundaries)**: Completed/cancelled action rows are read-only and never deleted. To correct a terminal work record, add a new action under an active Ticket. Actions can be created/edited only when Ticket status is `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, or `REOPENED`. A resolved Ticket must be reopened before further action work; closed/cancelled Tickets are read-only for workflow/actions. Earlier comment and attachment policies remain separate.

### 5.2. Ticket workflow and consistency

- **BR-13 (Ticket transitions)**: Only active staff/Admin perform formal transitions, using the matrix below. Initial status remains `NEW`. Identical status with a current version is a no-op and adds no history. Claim or assigning a non-null owner advances `NEW -> OPEN` as before; that implicit transition follows the same transaction/history/version rules. Claiming a Ticket already owned by another user returns 409; reassignment is explicit. Ownership/IT Priority are frozen on `CLOSED`/`CANCELLED` Tickets.

| Current status | Permitted next statuses |
| --- | --- |
| NEW | OPEN, IN_PROGRESS, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| CLOSED | None |
| REOPENED | IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| CANCELLED | None |

- **BR-14 (Resolution gate)**: A transition to `RESOLVED` is rejected with 422 `INCOMPLETE_ACTIONS` if any child is `PLANNED` or `IN_PROGRESS`. Completed/cancelled children do not block. Require a shared resolution summary of 2-2,000 trimmed characters. This defines the server-enforced gate requested by Lab 4 sections 4.5 and 9. Zero-action Tickets can be resolved after staff review; do not manufacture Actions Taken for legacy Tickets. Closing requires `RESOLVED`. Cancelling a Ticket requires a 2-2,000-character shared reason and atomically cancels pending actions with that reason while preserving terminal actions.
- **BR-15 (Advisory indication)**: Only the owning Requester can indicate resolution, while `IN_PROGRESS` or `WAITING_FOR_REQUESTER`. Store `requesterResolvedIndication=true` and `requesterResolvedAt`; status remains unchanged. Repeated indication with a current version is a no-op. Staff see the indication; no external notification is sent. Reopening resets the current indication, its timestamp, and current `resolvedAt`/resolution summary. Historical workflow entries remain.
- **BR-16 (Formal review)**: Staff review the actions and shared summary before resolving/closing; no automatic status change follows action completion or requester indication. Set `resolvedAt` on resolution and `closedAt` on closure from the server clock. Preserve the existing creation default that copies Requested Priority into IT Priority; keep Requested Priority unchanged and IT Priority independently editable on nonterminal Tickets.
- **BR-17 (Append-only workflow)**: Append one `TicketStatusEvent` per actual status change (including implicit claim/assignment). Record old/new status, actor, server timestamp, and shared resolution/cancellation reason where applicable. No edit/delete operation exists. History sorts `createdAt ASC, id ASC`. Comments/notes remain append-only. Action records permit pending edits under BR-12; append-only does not prohibit that required UI.
- **BR-18 (Atomic concurrency)**: Every Ticket owner/priority/status/indication mutation requires its current `version`; action creation also requires `ticketVersion`; action edits require both action `version` and `ticketVersion`. Each action write increments the parent version/update timestamp as well as its own version on edit. Guard/lock the parent first within the transaction, then check children and write. Stale updates return 409 `STALE_UPDATE` without partial writes. Competing resolution/action writes cannot both succeed on the same parent version. Ticket cancellation increments the parent once and every changed child once. No-op requests do not increment versions.
- **BR-19 (Retry safety)**: Action creation requires a client-generated UUID `clientRequestId`, unique per Ticket and authenticated creator. Identical normalized input with the same key returns the existing action (200, `replayed=true`) without another write; different input returns 409 `IDEMPOTENCY_CONFLICT`. Authorize before checking the key. A replay bypasses stale/terminal checks only for the original successful identical request and does not mutate data. Update retries use version conflicts/reconciliation; no automatic silent overwrite.

### 5.3. Data, dashboards, and final quality

- **BR-20 (Migration)**: Add fields/tables without changing earlier IDs, Ticket numbers, relationships, file paths, authorship, or statuses. Backfill versions to 1 and advisory flag to false; existing Tickets have no invented actions/events. Unknown historical resolution/closure dates remain null. Existing resolved Tickets may close; new resolutions obey BR-14. Recovery restores a verified backup rather than discarding new work with a blind downgrade.
- **BR-21 (Seed)**: Repeatable seeding uses stable fixture keys and preserves existing/user-created data and changed credentials. Cover every Ticket status and priority, assigned/unassigned Tickets, zero/one/many actions, multiple staff on one Ticket, terminal/pending action cases, and nonzero/zero dashboard accounts. Include inactive-assignee negative-test data without assigning new seeded work to inactive users.
- **BR-22 (Dashboard identity)**: Requester scope is always `requesterId=req.user.id`; staff metrics cover all Tickets; current-user assignments use the authenticated user ID. Never trust a requested `requesterId`, staff ID, or claimed role to change dashboard scope.
- **BR-23 (Calculations)**: Use the metric table below; obtain one consistent database read snapshot for all counts/lists in a dashboard response. Counts are independent of the five-item display limit. Distinguish all Tickets from active work; never sum rows after pagination as a total.
- **BR-24 (Time boundaries)**: Recent resolution means current status `RESOLVED` and `resolvedAt >= generatedAt minus 7*24 hours` and `resolvedAt <= generatedAt`, inclusive. Use UTC instants, not local-midnight truncation. Recent Ticket lists are latest updates (no date cutoff). Unknown legacy `resolvedAt` is excluded only from the recent-resolution metric, not from status totals.
- **BR-25 (Priority)**: Effective IT Priority is `itPriority ?? requestedPriority` for legacy null values. Priority summaries count active Tickets and always include LOW/MEDIUM/HIGH/CRITICAL zero buckets. Do not rewrite Requester priority as a backfill.
- **BR-26 (Drill-down)**: Metric actions pass the documented allowlisted view and filters to My Tickets/Queue, resetting page to 1. Destination queries must use the same predicates as counts. Preserve the source dashboard/filter context when returning from detail.
- **BR-27 (Bounded data)**: Dashboard returns fixed-size count buckets and at most five recent Tickets / five pending actions with safe summaries. Never embed full Ticket collections, Internal Notes, file paths, credential fields, or attachment binaries. Paginate action/history lists.
- **BR-28 (Feedback)**: Disable duplicate submit controls while pending; preserve entered values on recoverable errors and conflicts; offer explicit reload/review on stale data. Clear role-specific data on logout/account switch and do not let late responses repopulate it.
- **BR-29 (UI quality)**: Reuse existing Zen Green tokens, read-only/invalid/busy styles, responsive rules, visible focus, labels, non-color status cues, and accessible modal behavior. Display shared Actions Taken separately from private Internal Notes; render content as text, not HTML.
- **BR-30 (Earlier behavior)**: Keep auth/password policy, requester Ticket creation/list/detail, comments, notes, attachments, queue ownership/priority, and administrator safety functional. Update old assertions only for intentional contract corrections (advisory indication, authenticated access, versions, role dashboard landing); no required test may be skipped to hide a regression.
- **BR-31 (Protected resources)**: As part of Lab 4's security and regression scope, recheck live account state/role on protected APIs, preserve the password-change gate, and prevent bypass via unauthenticated `requesterId`, a JWT in a download URL, or a public static uploads route. Binary downloads use authorized Bearer requests. Authentication secrets stay server-side. Verify existing login/logout/current-user behavior against the approved authentication contract; this increment does not prescribe a new JWT revocation subsystem.
- **BR-32 (Evidence)**: Planned is not Passed. Record actual file paths, commands, outcomes, branch/commit and review evidence; distinguish mocked UI journeys from browser E2E. Release evidence comes from final `main` after approved PRs.

### 5.4. Dashboard definitions

Define `ACTIVE={NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED}` and `PENDING_ACTION={PLANNED, IN_PROGRESS}`. `T` is the response `generatedAt`; `R` is Requester ID; `U` is the staff/Admin ID.

| Metric/list | Exact predicate and ordering | Drill-down |
| --- | --- | --- |
| Requester `totalTickets` | All Tickets where requesterId=R | My Tickets, no filter |
| Requester `activeTickets` | requesterId=R AND status in ACTIVE | My Tickets: statusGroup=active |
| Requester `waitingForRequester` | requesterId=R AND status=WAITING_FOR_REQUESTER | My Tickets: status=WAITING_FOR_REQUESTER |
| Requester `recentlyResolved` | requesterId=R AND status=RESOLVED AND resolvedAt in [T-7 days,T] | My Tickets: status=RESOLVED, resolvedSince=T-7 days, resolvedUntil=T |
| Staff `activeTickets` | status in ACTIVE | Queue: statusGroup=active |
| Staff `unassignedTickets` | status in ACTIVE AND ownerId IS NULL | Queue: statusGroup=active, ownerId=unassigned |
| Staff `myAssignedTickets` | status in ACTIVE AND ownerId=U | Queue: statusGroup=active, ownerId=U |
| Staff `waitingForRequester` | status=WAITING_FOR_REQUESTER | Queue: status=WAITING_FOR_REQUESTER |
| Staff `byStatus` | Count all Tickets per each of the eight Ticket statuses | Queue: status=<bucket> |
| Staff `byItPriority` | Count active Tickets per effective IT Priority | Queue: statusGroup=active, itPriority=<bucket> |
| Requester/staff `recentTickets` | Own/all Tickets respectively; updatedAt DESC, id DESC; take 5 | Each row opens permitted Ticket Detail |
| Staff `myPendingActions` | assigneeId=U AND action status in PENDING_ACTION AND parent status in ACTIVE; actionAt ASC, id ASC; take 5, plus full matching total | Each row opens parent staff detail, Actions Taken tab |

Zero-data response contains numeric zeros, all enum buckets, and empty arrays. A failed request is an error state, not a dashboard full of zeros. Date-range drill-down retains the generated window until refresh.

---

## 6. UI Specification Summary

After successful login/password change, Requesters land on their dashboard; IT Staff/Admin land on the staff dashboard. Keep existing My Tickets/Create Ticket, Queue, and Administrator-only User Management navigation available. Role navigation must not expose unauthorized destinations.

Actions Taken appear as a shared tab/list in both detail screens. Staff get create/edit and permitted transition controls; Requesters get read-only records. Public text includes result, follow-up, attachment notes and cancellation reason. Show assignee separately from automatic performer. A pending action shows "Not completed" for performer. Terminal rows have no edit/delete controls. Ticket controls show only permitted transitions, explain unresolved action blockers, and display requester indication without relabeling the Ticket as resolved.

Use desktop >=992px, tablet 768-991px, mobile <768px with usable cards/stacked forms on small screens, and follow [ui-spec.md](ui-spec.md) for states, dialogs, labels, tokens, screenshots, and keyboard behavior.

---

## 7. Data Changes, Migration, and Seed Decisions

These are proposed schema additions for Issues 2-4, not changes applied by Issue 1. Continue PostgreSQL/Prisma and existing `Role`, `Priority`, and `TicketStatus` enums.

### 7.1. ActionTaken model

| Field | Type / constraints | Purpose |
| --- | --- | --- |
| id | Int, autoincrement PK | Stable identity and tie-breaker |
| ticketId | Int FK Ticket, immutable, restrict deletion | Parent request |
| assigneeId | Int FK User, required, restrict deletion | Assigned work responsibility |
| createdById / updatedById | Int FKs User, server-stamped, required | Creator and most recent editor |
| performedById | Int? FK User, server-stamped on completion | Actual completing staff; null until completed |
| actionAt / createdAt | DateTime, server now, immutable | Required action creation date/time |
| updatedAt | DateTime, changes on a real mutation | Last edit time |
| description | String, required | Shared work description |
| result | String? | Required when completed |
| followUpRequired | Boolean, default false | Follow-up flag |
| followUpNote / attachmentNotes / cancelReason | String? | Conditional/shared explanatory text |
| status | ActionTakenStatus: PLANNED, IN_PROGRESS, COMPLETED, CANCELLED | Work state |
| completedAt / cancelledAt | DateTime?, server-stamped | Terminal timestamps |
| version | Int, default 1 | Optimistic concurrency |
| clientRequestId | UUID string, required | Retry identity |
| requestFingerprint | String, normalized creation-input fingerprint | Detect key reuse with changed content |

Constraints: unique `(ticketId, createdById, clientRequestId)`; indexes `(ticketId, actionAt, id)` and `(assigneeId, status, actionAt, id)`. Validate status/conditional field consistency in every mutation; foreign keys retain deactivated users.

### 7.2. Ticket additions and status history

- Add `version Int default 1`, `requesterResolvedIndication Boolean default false`, `requesterResolvedAt DateTime?`, `resolutionSummary String?`, `resolvedAt DateTime?`, and `closedAt DateTime?`.
- Add relation `actionsTaken ActionTaken[]` and `statusHistory TicketStatusEvent[]`.
- `TicketStatusEvent`: id PK, ticketId FK, fromStatus TicketStatus, toStatus TicketStatus, actorId FK User, reason String?, createdAt server now. There is no updatedAt or mutation API for events.
- Add history index `(ticketId, createdAt, id)`; Ticket dashboard indexes `(requesterId, status, resolvedAt)`, `(ownerId, status)`, and `(updatedAt, id)` after checking existing indexes and measured query plans. Do not add duplicate indexes blindly.

### 7.3. Justified database decisions

1. A separate child model supports many staff work records without overwriting the parent Ticket or confusing Ticket ownership with action assignment.
2. Parent-first version guarding keeps action changes and resolution in one consistency boundary; an action-only version would not prevent a resolution race.
3. Unique creation request keys prevent network retries from duplicating work and provide database enforcement beyond a disabled button.
4. Append-only status events preserve workflow evidence, while mutable pending action rows satisfy required edit behavior without maintaining an unrelated general audit subsystem.
5. Nullable legacy dates avoid inventing resolution history; new server timestamps make recent-resolution counts meaningful.

### 7.4. Migration, backfill, and recovery

Use additive migrations in Issue 2 for action tables and shared version foundation, then Issue 3 for workflow fields/history and Issue 4 for justified dashboard indexes. Before applying them to the local course database, back up PostgreSQL and the referenced uploads directory. Test on a disposable database cloned from a representative existing-data fixture.

Compare old row counts, IDs, Ticket numbers, ownership, authorship, attachment metadata and file checksums before/after. Backfill versions/flag defaults only. Preserve legacy null IT Priority using the query fallback. Do not create fake actions, status events, resolution summaries, or historical dates. Old `RESOLVED`/`CLOSED` Tickets retain statuses; unknown resolution dates remain null and are excluded from recent-resolution only. Validate legacy zero-action transitions explicitly.

Exercise restore into a disposable database/uploads copy and compare the same integrity manifest. In the course environment recovery means restoring the verified backup and compatible application version; do not reset the working database or drop new tables containing work. Record actual commands and results in Issue 5's README/evidence update.

### 7.5. Seed coverage

Keep Lab 3's active/inactive user and reference fixtures. Add dedicated stable Ticket numbers and action request keys for all eight Ticket statuses, all four priorities, owner/null owner, zero/one/multiple actions, two staff acting on one Ticket, pending/complete/cancelled actions, follow-up cases, and recently resolved records. Include a Requester with zero Tickets, a staff user with zero assigned actions, and realistic nonzero metrics. Re-running seed must not duplicate or reset edited work/credentials. Relative-date demo fixtures are established on first insertion and remain unchanged on rerun; test clocks/fixtures are independent of demo seed aging.

---

## 8. API Contract Summary

| Capability | Endpoint |
| --- | --- |
| List shared actions | GET /api/tickets/:id/actions-taken |
| Create/edit actions | POST /api/staff/tickets/:id/actions-taken; PATCH /api/staff/tickets/:id/actions-taken/:actionId |
| Read workflow history | GET /api/tickets/:id/status-history |
| Advisory requester indication | PATCH /api/tickets/:id/indicate-resolved (correct existing behavior) |
| Staff workflow/owner/priority | Existing /api/staff/tickets/:id/status, /claim, /assign, /priority with required version |
| Role dashboards | GET /api/dashboard/requester; GET /api/dashboard/staff |
| Metric drill-down | Existing GET /api/tickets and GET /api/staff/tickets with documented additive filters |

All schemas, headers, no-op/replay behavior, validation, ordering, errors and response projections are in [api-spec.md](api-spec.md). Existing detail responses expose new version/workflow fields additively; never return `passwordHash` or private notes through a shared endpoint.

---

## 9. Acceptance Criteria

- **AC-01 (Create Valid Action)**:
  - **Given** an active staff/Admin and active Ticket,
  - **When** valid work is created,
  - **Then** exactly one action belongs to that Ticket, creator/default assignee are correct, and parent status/owner remain unchanged.
- **AC-02 (Action Validation)**:
  - **Given** missing/whitespace/out-of-range/wrong-type fields or conditional result/follow-up/reason failures,
  - **When** a write is attempted,
  - **Then** 400 field errors appear and no partial write occurs.
- **AC-03 (Independent Assignment)**:
  - **Given** an eligible assignee independent of Ticket Owner,
  - **When** work is assigned/reassigned,
  - **Then** action responsibility changes only; inactive/Requester/missing targets are rejected.
- **AC-04 (Action Lifecycle)**:
  - **Given** an action state,
  - **When** a permitted transition occurs,
  - **Then** result/reason, actual performer and terminal timestamps are correct; invalid transitions, terminal edits and writes on inactive Ticket states fail.
- **AC-05 (Role and Ownership Protection)**:
  - **Given** Requester A and B,
  - **When** each reads actions/history,
  - **Then** only owned Tickets are accessible; requester action/staff writes return 403 without content leakage.
- **AC-06 (Safe Shared Content)**:
  - **Given** manipulated actor/date/parent fields or text resembling HTML/Internal Notes,
  - **When** work is written/read,
  - **Then** immutable fields cannot be forged, text is inert, and private notes remain absent.
- **AC-07 (Ticket Transitions)**:
  - **Given** any Ticket status,
  - **When** staff attempt a status change or implicit claim/assignment transition,
  - **Then** only matrix-approved operations succeed; Requested Priority remains unchanged.
- **AC-08 (Resolution Gate)**:
  - **Given** a pending child action,
  - **When** staff try to resolve,
  - **Then** 422 INCOMPLETE_ACTIONS blocks it; after complete/cancel and a valid summary it succeeds, including the documented zero-action legacy boundary.
- **AC-09 (Advisory Requester Indication)**:
  - **Given** an owned IN_PROGRESS/WAITING_FOR_REQUESTER Ticket,
  - **When** the Requester indicates resolution,
  - **Then** the flag/time change once and status does not change; other states/users cannot bypass staff review.
- **AC-10 (Append-Only Status History)**:
  - **Given** repeated workflow changes,
  - **When** permitted roles read history,
  - **Then** events are append-only, attributed, stable by timestamp/id, with one event per actual change and none for a no-op.
- **AC-11 (Concurrent and Stale Writes)**:
  - **Given** two users with the same version,
  - **When** they race edits, action creation/resolution, or cancellation,
  - **Then** stale work receives 409 and no gate bypass, lost update, or partial child/history write occurs.
- **AC-12 (Duplicate Creation Retry)**:
  - **Given** a lost action-create response or rapid repeated clicks,
  - **When** identical input is retried with the same request key,
  - **Then** the original action is returned once; changed input with that key receives 409.
- **AC-13 (Requester Dashboard)**:
  - **Given** Requester-owned data and spoofed identity query parameters,
  - **When** the Requester dashboard is requested,
  - **Then** counts/lists contain only authenticated ownership and match database predicates.
- **AC-14 (Staff Dashboard)**:
  - **Given** staff/Admin accounts and mixed assignments,
  - **When** the staff dashboard is requested,
  - **Then** shared metrics and recent Tickets are correct while the pending-action section is scoped to that account.
- **AC-15 (Dashboard Boundaries and Empty Data)**:
  - **Given** boundary timestamps, a null legacy IT Priority, and empty data,
  - **When** dashboard metrics are calculated,
  - **Then** inclusive UTC rules, fallback priority, zero buckets and empty arrays match the contract.
- **AC-16 (Dashboard Drill-Down)**:
  - **Given** a dashboard card or list row,
  - **When** its drill-down is activated,
  - **Then** the proper list/detail/tab opens with matching filters and page=1; ownership and filter context persist.
- **AC-17 (Migration and Recovery)**:
  - **Given** a representative Lab 3 database/uploads backup,
  - **When** migrations and a recovery rehearsal run,
  - **Then** old records, relationships and binaries remain intact with documented defaults and no fabricated history.
- **AC-18 (Idempotent Seed)**:
  - **Given** demo fixtures,
  - **When** seed runs twice,
  - **Then** counts/identities/credentials are stable and required zero/nonzero/mixed-action examples remain available.
- **AC-19 (Earlier-Function Regression)**:
  - **Given** earlier permitted workflows,
  - **When** regression and direct API security checks run,
  - **Then** auth, password gate, account safety, comments/notes, attachments, queue and requester flows remain correct with intentional contract corrections documented.
- **AC-20 (Responsive and Accessible UI)**:
  - **Given** desktop/tablet/mobile and keyboard use,
  - **When** all major Lab 4 screens are exercised,
  - **Then** responsive/visual/focus/modal/label/status cues meet the UI checklist.
- **AC-21 (Failure Feedback)**:
  - **Given** validation, stale response, network/API failure, logout or role switch,
  - **When** a screen processes it,
  - **Then** meaningful feedback preserves recoverable input and prevents stale identity data or duplicate submission.
- **AC-22 (Documentation and Delivery Evidence)**:
  - **Given** final release preparation,
  - **When** evidence is reviewed,
  - **Then** every requirement/test has truthful paths/status, setup/demo commands work, five work branches follow review flow, and submission covers Answer Parts 1-9.
- **AC-23 (Performance Smoke)**:
  - **Given** a representative local dataset,
  - **When** dashboard/list smoke checks run,
  - **Then** counts remain accurate, summaries stay bounded, and documented local timing/query measurements meet the test plan.

---

## 10. Definition of Done

### 10.1. Product Completion

- [ ] All FR-01 through FR-17 and BR-01 through BR-31 implemented and evidenced against AC-01 through AC-23.
- [ ] Migrations preserve data and the restore rehearsal passes on disposable fixtures; seed is idempotent.
- [ ] Unit/API/UI/style/authorization/workflow/migration/regression/performance-smoke/browser E2E and manual visual checks pass; no required test is skipped/disabled.
- [ ] Labs 1-3 regression passes, with justified expectation/fixture updates for explicit corrections.
- [ ] Frontend/backend builds and documented lint checks pass; no console errors, obsolete UI, unfinished controls, leaked private content, or public file bypass.
- [ ] Metrics match authoritative queries; stale/duplicate/concurrent operations are safe.
- [ ] Screens meet responsive/accessibility and safe-failure specifications.
- [ ] README setup/seed/migration/test/demo and known limitations are current.

### 10.2. Course Delivery

- [ ] FR-18/BR-32 evidenced: five work-branch PRs approved into staging; release PR approved into main; all Issues Done after actual completion.
- [ ] Reviewer record includes real identities, links, comments, responses, approvals and outcomes.
- [ ] AI-use record includes the actual model/agent, 6-10 real selected prompts, and student-written reflection.
- [ ] A concise submission PDF uses Answer Part 1 through Answer Part 9 in order, with readable screenshots, working links, and final-main evidence.
- [ ] Specification history proves the contract preceded implementation PR completion.

### 10.3. Feature Branch Scope

Feature 1 contains only `specification.md`, `api-spec.md`, `ui-spec.md` and `tests.md`. Reviewer and AI-use records are prepared later using the corresponding earlier-lab examples and actual evidence. Lab 4 section 11's work is grouped into exactly five work branches as requested by the student; `lab4-staging` is not counted.

| Issue | Work branch | Scope | Depends on |
| --- | --- | --- | --- |
| 1 | `feature/1_lab4-specifications` | Four core contracts and test planning | Existing completed product |
| 2 | `feature/2_lab4-actions-taken` | Model/migration/seed, actions API/UI, shared versions/retry safety and focused tests | 1 reviewed and merged |
| 3 | `feature/3_lab4-ticket-workflow` | Gate, advisory indication, final matrix/history, workflow UI and tests | 2 reviewed and merged |
| 4 | `feature/4_lab4-role-dashboards` | Dashboard queries/API/UI, drill-down, indexes and focused tests | 3 reviewed and merged |
| 5 | `feature/5_lab4-hardening-and-e2e` | Integrated regression/security, migration recovery, E2E, responsive/accessibility/visual checks, README and final evidence | 4 reviewed and merged |

Start each next branch from reviewed staging. Each implementation issue includes its own tests and documentation updates. Feature PRs target `lab4-staging`; after integration verification, one release PR targets `main`. No direct development on staging/main and no sixth work branch. Final checks/evidence follow the actual release; drafting the contract does not complete the course delivery.

---

## 11. Assumptions and Decisions for Review

| ID | Project decision and reason |
| --- | --- |
| D-01 | Action enum PLANNED/IN_PROGRESS/COMPLETED/CANCELLED makes Answer Part 6's status/complete/cancel behavior and the defined resolution gate testable; exact names are chosen here. |
| D-02 | Assignee is planned responsibility, creator is recorder, automatic performer is the completing authenticated staff. Null performer before completion avoids claiming planned work has already been performed. |
| D-03 | Server creation time is Action Date/Time, following Lab 4 section 8.3's action-create date/time; editable historical/backdated work is outside this increment. |
| D-04 | Limits reuse the existing 2-2,000 collaboration convention. Conditional result/follow-up/cancel reasons make terminal/follow-up behavior explainable. |
| D-05 | COMPLETED/CANCELLED actions are retained and read-only. Append-only workflow evidence is supplied by Ticket status events and existing comments/notes; pending action edits remain supported. |
| D-06 | Lab 4 requires a resolution gate. Pending actions block it; cancelled actions are terminal, zero-action Tickets do not require fabricated work, and a shared staff summary is required. These are the defined gate details for student review. |
| D-07 | Retain the existing eight-status Ticket matrix, staff formal control, and closed/cancelled terminal behavior. Correct requester indication to satisfy Lab 4 section 4.5. |
| D-08 | Parent versions and action versions provide predictable conflict handling; creation keys handle lost-response retries. Database transactions enforce the parent/child gate under races. |
| D-09 | Recent resolution uses a rolling seven-day UTC interval. Legacy unknown dates are excluded from that one metric. Five-item lists and fixed enum buckets keep dashboards concise. |
| D-10 | Keep the current React AppView navigation model; pass initial filters/tab context instead of introducing a router merely for dashboards. Administrator reuses staff dashboard. |
| D-11 | Preserve successful authenticated workflows, not legacy authorization bypasses. Retained Lab 2 tests must authenticate through fixtures, or test a deliberately isolated simulation harness; no runtime fallback based solely on requesterId. |
| D-12 | Use `ai-use.md` exactly as named by Lab 4's repository/submission requirements, although earlier labs use `ai_use.md`. Do not duplicate the Lab 4 AI log under two names. |

These decisions are ready for review in Issue 1. No user approval, peer approval, test success, migration execution, or implementation completion is implied by this draft.
