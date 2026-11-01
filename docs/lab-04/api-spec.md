# Lab 4 REST API Specification

**Product:** TokTickIT IT Service Desk\
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression\
**Base URL:** `http://localhost:4000/api` (or relative `/api`)\
**Status:** Draft API Contract — Planned Implementation

---

## 1. Overview & General Conventions

Requirements come from Lab 4 sections 4-6 and 8. Endpoint paths, limits, versions and creation keys are the proposed project decisions in specification section 11. Reuse Express, Prisma/PostgreSQL, JSON, and the existing Bearer JWT scheme. All new APIs require `Authorization: Bearer <token>`, including shared action/history reads. Validate token signature/expiry, then load the live User; authorization uses its current role/activation/password-change state. Browser localStorage holds the existing token; it is never an API source of role truth. Normal endpoints are unavailable until first-password change is complete. `/auth/me`, `/auth/change-password`, and `/auth/logout` retain their gate exemptions.

Request/response dates are UTC ISO-8601 strings ending in `Z`. Write bodies use `Content-Type: application/json`. Positive IDs/versions must be safe integers; path/query IDs are strict decimal strings, not partially parsed strings. Reject unknown/immutable body fields. Responses expose only selected user summaries `{id,name,role}`, never hashes/secrets or internal disk paths. User text is plain text. Error messages do not leak database details or another Requester's records.

| Operation | REQUESTER | IT_STAFF | ADMINISTRATOR |
| --- | --- | --- | --- |
| GET Ticket actions/history | Owned Ticket only | All Tickets | All Tickets |
| POST/PATCH Actions Taken | Forbidden | Allowed on active Ticket/action states | Same as IT Staff |
| Staff claim/assign/priority/status | Forbidden | Allowed by workflow | Same as IT Staff |
| Requester indication | Owned Ticket only | Forbidden | Forbidden |
| Requester dashboard | Own identity only | Forbidden | Forbidden |
| Staff dashboard | Forbidden | Shared Tickets/current-user actions | Same as IT Staff |
| Administrator User Management | Forbidden | Forbidden | Existing permission retained |

Authenticate and check operation role before looking up protected resources. On shared reads, check Ticket ownership before returning actions/history. A missing action or an action under a different parent ID returns 404; never mutate it through another Ticket's URL. Requester dashboard identity-selection parameters are ignored; they cannot select another user's scope.

### 1.1. Error envelope and HTTP outcomes

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Action validation failed.",
    "details": [{ "field": "followUpNote", "message": "A follow-up note is required." }]
  }
}
```

`details` is optional except field validation. Do not return successful data in an error envelope.

| HTTP | Code | Meaning |
| --- | --- | --- |
| 200 | No error | Retrieval/update/no-op, or successful creation replay |
| 201 | No error | First successful action creation |
| 400 | VALIDATION_ERROR | Invalid JSON, field/type/length/ID/query, required version/key missing, unsupported actor/date fields |
| 400 | INVALID_ASSIGNEE | Requested assignee missing, inactive or not staff/Admin |
| 401 | UNAUTHORIZED | Missing/malformed/invalid/expired token or inactive/nonexistent current account |
| 403 | FORBIDDEN | Authenticated wrong role; resource contents are not disclosed |
| 403 | PASSWORD_CHANGE_REQUIRED | User still requires first-password change |
| 404 | NOT_FOUND | Missing resource or shared read of another Requester's Ticket |
| 409 | STALE_UPDATE | Ticket/action version changed; reload/reconcile required |
| 409 | IDEMPOTENCY_CONFLICT | Creation key already used for different normalized input |
| 409 | ALREADY_ASSIGNED | Claim attempted on another user's assigned Ticket |
| 422 | INVALID_ACTION_TRANSITION | Illegal action transition or editing a terminal action |
| 422 | TICKET_NOT_ACTIVE | Action/owner/priority mutation blocked by Ticket state |
| 422 | INVALID_STATUS_TRANSITION | Illegal Ticket transition or advisory indication in an unsupported state |
| 422 | INCOMPLETE_ACTIONS | Attempt to resolve while at least one pending action exists |
| 500 | INTERNAL_ERROR | Safe unexpected-error response; transaction is rolled back |

Inherited attachment rules retain 410 for removed-file download and their validation behavior. Route aliases from earlier labs are not new features. Required hardening applies the same authentication/ownership policy to any retained alias. No action deletion or history editing capability is added; unsupported mutation methods must return a non-success response without changing data.

### 1.2. Pagination and consistency

Action/history lists accept `page` (default 1) and `pageSize` (default 20, range 1-50). Invalid/repeated/noninteger/out-of-range parameters return 400. Response:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 0, "totalPages": 1 },
  "ticket": { "id": 105, "status": "OPEN", "version": 4, "updatedAt": "2026-10-07T03:00:00.000Z" }
}
```

`totalPages=max(1,ceil(totalItems/pageSize))`; pages past the last page return an empty array with unchanged totals. Actions order `actionAt ASC,id ASC`; history `createdAt ASC,id ASC`. Fetch page/count/parent projection from one consistent read snapshot so the returned parent version describes the read.

For writes, check the parent's supplied version and hold the parent consistency boundary first, then check an action's version and validate children. Commit related writes/events together. A guarded increment/row lock or equivalent transactional compare-and-swap must actually serialize competing writes; reading a version and later issuing an unconditional update is insufficient. Stale rejection includes only safe conflict metadata:

```json
{
  "error": {
    "code": "STALE_UPDATE",
    "message": "The Ticket or Action has changed. Reload and review before saving.",
    "details": [{ "field": "ticketVersion", "message": "A newer Ticket version is available." }]
  }
}
```

No stale write changes timestamps, rows, or history. Every real action write also increments the Ticket version/updatedAt; action edits increment their action version. Ticket owner/priority/status/indication writes increment the Ticket version once. Genuine no-ops do not increment or create events. Existing Ticket detail GET responses expose versions additively; callers must use fresh values, not hardcode 1.

---

## 2. Actions Taken representations and validation

### 2.1. Action representation

The shared projection is identical for Requester/staff (subject to parent access). It contains:

```json
{
  "id": 301,
  "ticketId": 105,
  "actionAt": "2026-10-07T03:00:00.000Z",
  "description": "Inspect the wireless adapter and reconnect to campus Wi-Fi.",
  "result": null,
  "assignee": { "id": 8, "name": "Alex Thompson", "role": "IT_STAFF" },
  "createdBy": { "id": 9, "name": "Emily Watson", "role": "IT_STAFF" },
  "updatedBy": { "id": 9, "name": "Emily Watson", "role": "IT_STAFF" },
  "performedBy": null,
  "followUpRequired": true,
  "followUpNote": "Check stability after the next restart.",
  "attachmentNotes": "See wifi-error.png in the Ticket attachments.",
  "status": "IN_PROGRESS",
  "cancelReason": null,
  "completedAt": null,
  "cancelledAt": null,
  "version": 1,
  "createdAt": "2026-10-07T03:00:00.000Z",
  "updatedAt": "2026-10-07T03:00:00.000Z"
}
```

`performedBy` is null for unfinished/cancelled work and stamped from the completing actor for completed work. `createdBy` and `actionAt` never change. Completion does not replace the assignee or Ticket Owner. Inactive historical user summaries remain readable. Request fingerprints/request keys are internal and not exposed in shared lists.

### 2.2. Input rules

| Field | POST | PATCH | Rule |
| --- | --- | --- | --- |
| description | Required | Optional changed field | Trimmed string 2-2,000 |
| result | Optional; required if status COMPLETED | Optional changed field; required in resulting COMPLETED state | Null/empty while pending, otherwise trimmed 2-2,000 |
| assigneeId | Optional, defaults to actor | Optional changed field | Positive active staff/Admin ID; explicit null rejected |
| status | Optional, defaults PLANNED; PLANNED/IN_PROGRESS/COMPLETED | Optional changed field | Action matrix in specification; CANCELLED requires reason |
| followUpRequired | Optional, defaults false | Optional changed field | Strict boolean |
| followUpNote | Required when resulting flag true | Conditional using merged state | Trimmed 2-2,000; normalized null when flag false |
| attachmentNotes | Optional | Optional changed field | Null/empty or trimmed 2-2,000 |
| cancelReason | Not accepted at creation | Required when target CANCELLED | Trimmed 2-2,000 |
| ticketVersion | Required | Required | Current positive parent version |
| version | Not accepted | Required | Current positive action version |
| clientRequestId | Required UUID | Not accepted | Stable key for one creation intent |

POST stamps actionAt/createdAt/updatedAt, creator/editor, default assignee, and completedAt/performer if created completed. PATCH validates the merged record, not just supplied fields. A pending result may be explicitly cleared with null; a true follow-up flag cannot have an empty note. PATCH containing only current versions or unchanged normalized fields is a no-op on a pending action. A terminal action still rejects edits; terminal correction uses a new action on an active Ticket.

No input may set `ticketId`, actor fields, date fields, server terminal timestamps or internal fingerprint. A description or attachment note is shared, not a channel for confidential operational notes.

---

## 3. Action endpoints

### `GET /api/tickets/:id/actions-taken`

Retrieves all shared Actions Taken for a permitted Ticket in stable paginated order.

- **Access:** Owning Requester, IT Staff, Administrator.
- **Query Parameters:** `page`, `pageSize` only; defaults and bounds in section 1.2.
- **Request Body:** None.
- **Response (200 OK):** `data` contains the shared action objects in section 2.1, with `pagination` and `ticket` as defined in section 1.2. A zero-action Ticket returns an empty array.
- **Error Responses:** Common 400/401/403; missing/non-owned Ticket returns identical 404.

A successful requester read does not permit action writes.

### `POST /api/staff/tickets/:id/actions-taken`

Creates one work record under an active Ticket.

- **Access:** Active IT Staff/Administrator; parent NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED.
- **Request Body:** Fields and conditional validation in section 2.2.

**Request Example:**

```json
{
  "description": "Inspect the wireless adapter and reconnect to campus Wi-Fi.",
  "assigneeId": 8,
  "status": "IN_PROGRESS",
  "followUpRequired": true,
  "followUpNote": "Check stability after the next restart.",
  "attachmentNotes": "See wifi-error.png in the Ticket attachments.",
  "ticketVersion": 4,
  "clientRequestId": "e6bd3fc0-894f-4ab6-b0aa-777777777777"
}
```

- **Response (201 Created):** `{data:<Action>,ticket:<parent>,replayed:false}` using the representations in sections 1.2 and 2.1. The example increments parent version from 4 to 5 without changing status/owner.
- **Response (200 OK, replay):** Same envelope with `replayed:true`, current existing action/parent and no mutation.

Creation fingerprint includes normalized description/result/assignee/status/follow-up/attachment inputs with defaults resolved. It excludes `ticketVersion` and server-generated values. Scope key by `(ticketId,createdById,clientRequestId)`. Handle concurrent duplicate inserts via the database unique constraint and return replay/conflict after comparing input. Authenticate/authorize before replay lookup; a key cannot retrieve another user's or Ticket's work. Replay of an originally successful identical request is allowed even if the old version is stale or the Ticket subsequently became terminal; it only returns the existing record.

- **Error Responses:** Common 401/403; 400 validation/assignee; 404 missing parent; 409 key conflict/stale parent; 422 inactive parent. Failed first creation leaves counts and versions unchanged.

### `PATCH /api/staff/tickets/:id/actions-taken/:actionId`

Updates permitted pending work fields or completes/cancels an action.

- **Access:** Active IT Staff/Administrator; child belongs to URL parent; parent active and action nonterminal.
- **Request Body:** Required `version`, `ticketVersion`, plus changed fields from section 2.2.

**Request Example (completion):**

```json
{
  "status": "COMPLETED",
  "result": "Adapter reconfigured; connection remained stable during testing.",
  "followUpRequired": false,
  "version": 1,
  "ticketVersion": 5
}
```

- **Response (200 OK):** `{data:<updated Action>,ticket:<updated parent>}`. Completing as user 9 records performedBy 9, completedAt, action version 2 and Ticket version 6; it does not resolve the Ticket. Cancellation uses `status:CANCELLED` and `cancelReason`. Reassignment uses `assigneeId`; unchanged historical inactive assignment may remain during a pending text edit, but explicit reassignment to an inactive target and completion with an inactive assignee are rejected.

- **Error Responses:** Common 401/403; 404 missing/mismatched parent or action; 409 stale versions; 422 invalid action/parent states; 400 invalid/conditional fields.

Validate current parent/action versions before transition/gate checks. Parent cancellation and this edit cannot partially succeed together. There is no action DELETE endpoint.

---

## 4. Ticket workflow extensions

### 4.1. Detail projections

Existing `GET /api/tickets/:id` (owned Requester) and `GET /api/staff/tickets/:id` (staff/Admin) add:

```json
{
  "version": 6,
  "requesterResolvedIndication": false,
  "requesterResolvedAt": null,
  "resolutionSummary": null,
  "resolvedAt": null,
  "closedAt": null,
  "allowedStatusTransitions": ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  "resolutionGate": { "blocked": false, "pendingActionCount": 0 }
}
```

These are additive fields within existing detail objects, not a replacement success envelope. Requester `allowedStatusTransitions` is always empty because it cannot change workflow. Gate metadata may describe shared action blockers but never Internal Notes. Staff transitions describe the matrix; resolutionGate separately explains conditional blocking.

#### `GET /api/tickets/:id`

- **Access:** Owning REQUESTER.
- **Request Body:** None.
- **Response (200 OK):** Existing owned Ticket detail, with the additive fields above; `allowedStatusTransitions` is empty.
- **Error Responses:** Common 400/401/403; missing/non-owned Ticket returns identical 404.

#### `GET /api/staff/tickets/:id`

- **Access:** IT_STAFF/ADMINISTRATOR.
- **Request Body:** None.
- **Response (200 OK):** Existing staff Ticket detail, with version, matrix transitions and gate metadata above.
- **Error Responses:** Common 400/401/403; missing Ticket returns 404.

### `PATCH /api/staff/tickets/:id/status`

Transitions the Ticket through its final workflow.

- **Access:** IT Staff/Administrator.
- **Request Body:** Required `status`, `version`; `resolutionSummary` required for target RESOLVED; `reason` required for target CANCELLED and optional on other actual transitions. Shared strings are trimmed 2-2,000.

**Request Example:**

```json
{
  "status": "RESOLVED",
  "version": 6,
  "resolutionSummary": "Wireless adapter settings corrected and verified with the Requester."
}
```

- **Response (200 OK):** Existing id/ticketNumber/status/updatedAt fields plus version/advisory/resolution timestamps/summary.
- **Error Responses:** Common 401/403; 404 missing Ticket; 400 field validation; 409 stale version; 422 invalid transition or INCOMPLETE_ACTIONS.

Enforce specification BR-13's matrix and BR-14's gate in one parent-guarded transaction.

Append one status event for a real change. RESOLVED sets resolvedAt/summary; CLOSED retains resolution information and sets closedAt. REOPENED clears current advisory/resolution fields while history remains. CANCELLED atomically moves all pending actions to CANCELLED, copies the provided shared reason, stamps cancelledAt/updatedBy and increments each changed action version; completed/cancelled children remain intact. Increment parent version once. A repeated same status with current version is a no-op; it cannot rewrite a saved summary/reason or add history.

### `PATCH /api/staff/tickets/:id/claim`

Claims an unassigned Ticket; another user's ownership requires explicit reassignment.

- **Access:** IT_STAFF/ADMINISTRATOR; Ticket not CLOSED/CANCELLED.
- **Request Body:** `{version}`.
- **Response (200 OK):** Existing claim projection plus Ticket version. Already owned by caller is a no-op unless status NEW must advance to OPEN.
- **Error Responses:** Common 400/401/403/404; 409 STALE_UPDATE/ALREADY_ASSIGNED; 422 TICKET_NOT_ACTIVE.

### `PATCH /api/staff/tickets/:id/assign`

Explicitly assigns, reassigns or unassigns Ticket ownership.

- **Access:** IT_STAFF/ADMINISTRATOR; Ticket not CLOSED/CANCELLED.
- **Request Body:** `{ownerId:<active staff/Admin ID or null>,version}`.
- **Response (200 OK):** Existing assignment projection plus Ticket version; unchanged current owner/status is a no-op.
- **Error Responses:** Common 401/403/404; 400 invalid body/ineligible owner; 409 stale version; 422 TICKET_NOT_ACTIVE.

### `PATCH /api/staff/tickets/:id/priority`

Updates IT Priority independently of Requested Priority.

- **Access:** IT_STAFF/ADMINISTRATOR; Ticket not CLOSED/CANCELLED.
- **Request Body:** `{itPriority:<LOW/MEDIUM/HIGH/CRITICAL>,version}`.
- **Response (200 OK):** Existing priority projection plus Ticket version; unchanged normalized priority is a no-op.
- **Error Responses:** Common 400/401/403/404; 409 stale version; 422 TICKET_NOT_ACTIVE.

Non-null assignment or claim changes NEW to OPEN and appends one status event, even if a legacy NEW Ticket already has that owner. Live owner validation remains in force. Update existing callers/fixtures to send versions; no runtime missing-version bypass.

### `PATCH /api/tickets/:id/indicate-resolved`

Records the Requester's advisory indication without formally resolving the Ticket.

- **Access:** Owning REQUESTER only; Ticket IN_PROGRESS/WAITING_FOR_REQUESTER.
- **Request Body:** `{version}`.
- **Response (200 OK):**


```json
{
  "id": 105,
  "status": "IN_PROGRESS",
  "requesterResolvedIndication": true,
  "requesterResolvedAt": "2026-10-07T03:10:00.000Z",
  "version": 7,
  "updatedAt": "2026-10-07T03:10:00.000Z"
}
```

Status remains the original status. First indication stamps time/increments version; a repeated indication with fresh version keeps time/version unchanged. No TicketStatusEvent is added because status did not change. This implements Lab 4 section 4.5 even where existing code currently returns RESOLVED automatically.

- **Error Responses:** Common 400/401; 403 staff/Admin/password gate; wrong Requester/missing Ticket 404; wrong state 422; stale version 409.

### `GET /api/tickets/:id/status-history`

Retrieves append-only Ticket workflow evidence.

- **Access:** Owning Requester, IT Staff, Administrator.
- **Query Parameters:** `page`, `pageSize`, per section 1.2.
- **Request Body:** None.
- **Response (200 OK):** Paginated `data` entries with `id,ticketId,fromStatus,toStatus,actor:{id,name,role},reason,createdAt`, plus the parent projection. Sort createdAt ASC,id ASC.
- **Error Responses:** Common 400/401/403; missing/non-owned Ticket returns identical 404.

Reasons are shared text, never Internal Notes. Legacy Tickets without events return an empty list; no fabricated events/actors and no history-edit/delete API.

---

## 5. Dashboard APIs

### `GET /api/dashboard/requester`

Retrieves the authenticated Requester's concise dashboard.

- **Access:** REQUESTER; scope from authenticated identity.
- **Query Parameters:** No user-selected scope/page/window/limit. Identity-selection parameters cannot change results.
- **Request Body:** None.
- **Response (200 OK):**


```json
{
  "generatedAt": "2026-10-07T03:00:00.000Z",
  "window": {
    "timeZone": "UTC",
    "recentResolvedSince": "2026-09-30T03:00:00.000Z",
    "recentResolvedUntil": "2026-10-07T03:00:00.000Z"
  },
  "metrics": { "totalTickets": 12, "activeTickets": 4, "waitingForRequester": 1, "recentlyResolved": 2 },
  "recentTickets": [
    {
      "id": 105,
      "ticketNumber": "TKT-2026-000105",
      "summary": "Campus Wi-Fi disconnects after restart",
      "status": "IN_PROGRESS",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "updatedAt": "2026-10-07T02:59:00.000Z"
    }
  ],
  "drillDown": {
    "totalTickets": { "view": "my-tickets", "query": { "page": 1 } },
    "activeTickets": { "view": "my-tickets", "query": { "statusGroup": "active", "page": 1 } },
    "waitingForRequester": { "view": "my-tickets", "query": { "status": "WAITING_FOR_REQUESTER", "page": 1 } },
    "recentlyResolved": {
      "view": "my-tickets",
      "query": { "status": "RESOLVED", "resolvedSince": "2026-09-30T03:00:00.000Z", "resolvedUntil": "2026-10-07T03:00:00.000Z", "page": 1 }
    }
  }
}
```

Every count/recent row is scoped to the caller, even with spoofed identity parameters. Recent Ticket list has at most five rows ordered updatedAt DESC,id DESC. No full description/attachments/notes/user emails are included. Values are illustrative fixtures, not live counts.

- **Error Responses:** 401 unauthenticated/inactive; 403 role/password gate; 500 safe API failure.

### `GET /api/dashboard/staff`

Retrieves shared operational counts and current-user pending actions.

- **Access:** IT_STAFF/ADMINISTRATOR.
- **Query Parameters:** No user-selected scope/limits.
- **Request Body:** None.
- **Response (200 OK):**


```json
{
  "generatedAt": "2026-10-07T03:00:00.000Z",
  "metrics": { "activeTickets": 24, "unassignedTickets": 3, "myAssignedTickets": 6, "waitingForRequester": 4 },
  "byStatus": { "NEW": 3, "OPEN": 5, "IN_PROGRESS": 10, "WAITING_FOR_REQUESTER": 4, "RESOLVED": 6, "CLOSED": 8, "REOPENED": 2, "CANCELLED": 1 },
  "byItPriority": { "LOW": 2, "MEDIUM": 9, "HIGH": 8, "CRITICAL": 5 },
  "recentTickets": [],
  "myPendingActions": { "totalItems": 0, "data": [] },
  "drillDown": {
    "activeTickets": { "view": "ticket-queue", "query": { "statusGroup": "active", "page": 1 } },
    "unassignedTickets": { "view": "ticket-queue", "query": { "statusGroup": "active", "ownerId": "unassigned", "page": 1 } },
    "myAssignedTickets": { "view": "ticket-queue", "query": { "statusGroup": "active", "ownerId": 8, "page": 1 } },
    "waitingForRequester": { "view": "ticket-queue", "query": { "status": "WAITING_FOR_REQUESTER", "page": 1 } }
  }
}
```

`ownerId` in myAssignedTickets is the authenticated ID (8 only illustrates it). Recent Ticket rows use the same safe fields as section 5.1 and add nullable `owner:{id,name,role}`. Pending action rows have at most five entries with `id,ticketId,ticketNumber,description,status,actionAt,assignee:{id,name,role}`. Their full matching count is `myPendingActions.totalItems`; count actions, not distinct Tickets. Rows link to staff detail + Actions Taken tab. Staff/Admin see only their own assigned pending actions in this section, although all Tickets contribute to shared metrics. Status/priority bucket drill-down queries are generated from their fixed enum keys using the predicates in specification section 5.4.

- **Error Responses:** 401 unauthenticated/inactive; 403 role/password gate; 500 safe API failure.

### 5.3. Snapshot, bounds, zero data and failures

Use one consistent read snapshot for counts/lists, generatedAt and the rolling window. All numeric buckets are nonnegative integers and present even at zero. Empty arrays indicate successfully read zero data; auth/DB/network failures use error responses, never fake zero counts. Recent resolution is inclusive [T-7*24h,T], current RESOLVED only; null legacy resolvedAt is excluded. Priority counts use `itPriority ?? requestedPriority` on active Tickets. Responses remain fixed-size independent of total Ticket count, aside from bounded summary string lengths.

`drillDown` is a structured AppView destination, not an external URL. Frontend allowlists the permitted view/query keys and passes initial filters to the existing views. All destination APIs independently authenticate and enforce ownership; a dashboard link is not authorization.

---

## 6. Additive list-query support for drill-down

Extend existing GET /api/tickets and GET /api/staff/tickets without replacing their current success/pagination envelopes, search/category/priority/sort controls, or existing filters.

| Parameter | Meaning and validation |
| --- | --- |
| statusGroup=active | Matches NEW/OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED; cannot combine with status or resolution range |
| resolvedSince + resolvedUntil | Require both valid UTC ISO instants with since<=until, and status=RESOLVED; inclusive range on resolvedAt; invalid combinations return 400 |
| status | One existing Ticket enum; a bucket link uses this exact value |
| ownerId (staff) | Positive numeric User ID or unassigned; historical inactive owners remain filterable; my-assigned link uses current identity |
| itPriority (staff) | Existing enum filter now uses effective fallback priority so null legacy values match dashboard counts |

Scope Requester queries to authenticated requesterId, even with a supplied requesterId. On drill-down set page=1 and keep the current list's pageSize defaults (8 for My Tickets, 10 for Queue). Use existing sort controls with a stable secondary id tie-breaker. A date-window link retains its original response instants until the dashboard refreshes; it must not silently recalculate a later window inside the destination.

---

## 7. Earlier API hardening and compatibility boundary

The existing requester Ticket/attachment routes currently retain unauthenticated requesterId fallbacks; some decode JWT claims without live-account/password-gate middleware. The server also mounts a public `/uploads` static route. These are baseline findings and planned Issue 5 corrections, not behavior declared implemented by this document.

Protect application operations with live auth/gate/role checks, remove deployed simulation and public-file bypasses, and fetch downloads with Bearer authorization (client may save a fetched Blob). Validate ownership before disclosing whether a file is removed. Keep the allowed image/PDF types, per-file 5 MB and five-active-file limits, soft-removal metadata/reason, removed download denial, and admin safety rules. Existing frontend/API tests must use authenticated fixtures rather than accepting unsafe runtime fallbacks. Public reference/health endpoints retain their non-sensitive Lab 1 role where appropriate.

Lab 4 sections 1, 6 and 8.5 require existing approved authentication, authorization, account and attachment behavior to remain correct. Verify login, password change, current-user retrieval and logout as regression cases. This contract retains the existing authentication interfaces; it does not add a new JWT-revocation table, login token format or session-management feature. Any observed authentication-contract mismatch must be explained and reviewed as a scoped hardening correction before changing that contract.

---

## 8. Verification and implementation allocation

Issue 2 implements action schemas/endpoints/retry keys, the shared parent version foundation and version checks/callers on existing parent mutations. Issue 3 implements final workflow/history/indication using that foundation. Issue 4 implements metrics/list-filter/navigation contracts; Issue 5 reconciles earlier security/regression and release evidence. Each issue owns its API tests and client integration updates. Follow [tests.md](tests.md); all proposed paths/statuses remain Planned until files exist and execution is recorded.
