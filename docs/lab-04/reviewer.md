# Lab 4 Peer Review Record

> **Draft outline:** Fill in the actual GitHub review comments, responses, and outcomes from the PRs. Do not treat placeholders as completed reviews.

## My Information

| Field | Detail |
|-------|--------|
| **Name** | Benjamin Garforth |
| **Student ID** | 67070501031 |
| **GitHub Username** | [bbxndg](https://github.com/bbxndg) |

---

## Peer Reviewer (Primary)

| Field | Detail |
|-------|--------|
| **Reviewer Name** | Kawinpop Churari |
| **Reviewer Student ID** | 67070501079 |
| **Reviewer GitHub Username** | [softkoi](https://github.com/softkoi) |

---

## Pull Requests Reviewed

> My partner reviewed the following PRs that I submitted.

### PR 1 — feature/1_lab4-specifications → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/38] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Looking good, ready to merge !!]" |
| **My Response** | "[please merge for me, thank you]" |
| **Outcome** | Approved and merged |

---

### PR 2 — feature/2_lab4-actions-taken → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/39] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Overall, you’ve done a good job, but there are a few points I’d like you to take another look at.<br><br>**client/src/components/tickets/ActionsTaken.tsx**<br>**Suggestion (Conflict Recovery):** `reloadLatest()` updates `editing` but leaves `draft.status` unchanged. If another staff member advances the action from PLANNED to IN_PROGRESS, the refreshed dropdown no longer contains PLANNED, but the next PATCH still submits that stale status and receives 422.<br><br>Could we reconcile the draft status against the refreshed action's permitted transitions, preserve the other entered fields, and clearly explain any required status adjustment? Please add a regression test covering a status change by another user followed by Reload Latest and Save Changes.<br><br>**server/tests/lab-04/seed.integration.test.ts**<br>**Suggestion (Repeatable Test Fixtures):** This assertion hard-codes `version: 2`, although the isolated test database is retained between runs and seeding deliberately preserves existing edits.<br><br>If this Ticket starts at version 7, the test increments it to 8 but incorrectly expects 2. Could we assert `ticket.version + 1` instead, using the snapshot captured before the mutation? This would verify preservation without assuming a fresh database.<br><br>**Suggestion (Failure-Safe Test Cleanup):** The fixture restoration runs only after every assertion succeeds. If seeding or an assertion throws, the test leaves the user's password hash set to `changed-test-hash` and retains the temporary Ticket edits in the reusable test database.<br><br>Could we capture the original records before modifying them and move restoration into a `finally` block? Cleanup should run on both successful and failed tests, restoring every field changed by this test.]" |
| **My Response** | "[No response directly,<br>**Commit Messages after receiving my friend's comments:** fix(ui): reconcile stale action status after conflict reload; fix(test): isolate npm test and restore seed fixtures on failure.<br>**After my friend reviewed my changes again, I said:** Please merge for me ngubb]" |
| **Outcome** | Approved and merged |

---

### PR 3 — feature/3_lab4-ticket-workflow → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/40] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Look good to me, I'm ready to merge!!]" |
| **My Response** | "[Please merge for meee ngubbbb]" |
| **Outcome** | Approved and merged |

---

### PR 4 — feature/4_lab4-role-dashboards → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/41] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[There are a few things that need to be corrected, as follows:<br><br>**client/src/App.tsx**<br>**Suggestion (Navigation State):** Could we reset the current view and list filters only when the authenticated identity or role actually changes? The `/auth/me` response calls `setUser()` with a new object even for the same account, so this effect can run after the user has opened a Ticket or selected dashboard filters. That would send them back to the dashboard and discard their navigation context.<br><br>A test with a delayed `/auth/me` response would help verify that navigation and filters remain intact for the same user.<br><br>**client/src/context/AuthContext.tsx**<br>**Suggestion (Session State Consistency):** Could we prevent an older `/auth/me` response from overwriting a successful password change? If the session check starts before the password is changed but returns afterward, it may restore `isPasswordChangeRequired: true` and show the mandatory change dialog again.<br><br>Please add a test that delays `/auth/me` until after a successful password change and confirms that the completed password gate remains cleared.]" |
| **My Response** | "[No response directly,<br>**Commit Message after receiving my friend's comments:** fix(auth): preserve navigation and password gate on delayed session refresh.<br>**After my friend reviewed my changes again, I said:** please merge for me uwuu]" |
| **Outcome** | Approved and merged |

---

### PR 5 — feature/5_lab4-hardening-and-e2e → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/47] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[There are something I want to comment<br><br>**server/src/routes/ticketDetail.ts**<br>**Suggestion (Input Validation):** Could we validate the entire attachment ID as a positive safe integer instead of using `parseInt()` alone? For example, `parseInt("123abc", 10)` returns `123`, while the API specification requires strict decimal IDs. It would also be useful to add regression tests for malformed IDs on both the download and removal routes.<br><br>**server/scripts/e2e-isolated.cjs**<br>**Suggestion (Test Runner Cleanup):** The runner cleans up its child processes and fixtures in `finally` after normal execution. Could we also handle interruptions such as `SIGINT` and `SIGTERM`? If the runner is stopped during Playwright execution, it may exit before cleanup runs, leaving test processes or fixtures behind. Please ensure cleanup only stops processes and removes records created by this run.]" |
| **My Response** | "[No response directly,<br>**Commit Messages after receiving my friend's comments:** fix(attachments): validate attachment IDs strictly; fix(e2e): clean up runner on interruption.<br>**After my friend reviewed my changes again, I said:** Please merge for me ngubb]" |
| **Outcome** | Approved and merged |

---

## Pull Requests I Reviewed for My Partner

> I reviewed the following PRs submitted by my partner Kawinpop Churari ([@softkoi](https://github.com/softkoi)).

### PR 1 — [docs/sprint4-spec] → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/30] |
| **My Review Comment** | "[Looks good, your documentation is clear and structured, ready to merge]" |
| **Partner's Response** | "[Thank you, Can you merge for me please?]" |
| **Outcome** | Approved and merged |

---

### PR 2 — [feat/actions-taken-backend] → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/31] |
| **My Review Comment** | "[Looks good for getting Actions Taken feature started, approved this PR. Well done.]" |
| **Partner's Response** | "[Thank you, merge for me please uwu TT]" |
| **Outcome** | Approved and merged |

---

### PR 3 — [feat/actions-taken-frontend] → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/32] |
| **My Review Comment** | "[Please address these 3 points in a follow-up commit, and I will be happy to approve the PR!<br><br>**client/src/services/actionTaken.service.ts**<br>Currently, when the API returns an error response (!response.ok), we only extract data.error?.message into a generic Error instance.<br>Could we attach the HTTP status code (e.g. err.status = response.status) or the custom backend error code to the thrown error? This will allow UI components to distinguish between a 403 Forbidden authorization issue and a 400 Bad Request validation failure.<br><br>**client/src/components/ActionsTakenList.tsx**<br>In the card header (lines 126–128), could you add an amber/yellow warning badge (e.g., Follow-Up Needed) when action.followUpRequired === true?<br>Right now, the follow-up note is placed only at the bottom of the card body. Having a distinct badge right in the top header row will make it much faster for IT Staff to scan and spot tickets with pending follow-up tasks.<br><br>**client/src/components/ActionTakenForm.tsx**<br>In the validate() function (lines 46–58), we only check if the string is empty (!description.trim()). However, our Sprint 4 business rules (BR-04) and backend API enforce a minimum length of 3 characters for description, result, and followUpNote.<br>Could you update the frontend validation conditions to enforce trim().length < 3 and add helper hints like (min. 3 characters) beside the form labels so users don't encounter unexpected API validation errors?]" |
| **Partner's Response** | "[No response directly,<br>**Commit Message after receiving my comment:** refactor: address peer code review feedback for error handling, badge prominence, and validation.<br>**After I reviewed his changes again, he said:** Please merge for me baby]" |
| **Outcome** | Approved and merged |

---

### PR 4 — [feat/ticket-workflow-resolution] → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/33] |
| **My Review Comment** | "[Please address these 2 points in a follow-up commit, and I will be happy to approve the PR!<br><br>**server/src/controllers/staff.controller.ts**<br>When rejecting an invalid status transition with INVALID_TRANSITION (lines 295–305), could we include the list of valid next transitions in the error response payload (e.g. details: { permittedNextStatuses: ALLOWED_TRANSITIONS[ticket.currentStatus] \|\| [] })?<br>This will provide clearer error context for frontend clients and API consumers so they know which statuses are valid without having to consult the documentation.<br><br>**client/src/pages/StaffTicketDetailPage.tsx**<br>For critical or terminal state transitions (specifically when transitioning to RESOLVED or CANCELLED), could you add a confirmation prompt (e.g. window.confirm or alert modal) before calling the update API?<br>This will prevent accidental permanent ticket closures by IT Staff who might misclick the dropdown.]" |
| **Partner's Response** | "[No response directly,<br>**Commit Message after receiving my comment:** refactor: address review feedback for permitted transitions error details and status confirmation.<br>**After I reviewed his changes again, he said:** Can you merge for me please]" |
| **Outcome** | Approved and merged |

---

### PR 5 — [feat/dashboards-and-hardening] → lab4-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/34] |
| **My Review Comment** | "[Please address this point in a follow-up commit, and I will be happy to approve the PR!<br><br>**client/src/pages/StaffDashboard.tsx**<br>In StaffDashboard.tsx, could we add visual itPriority badge indicators (e.g. HIGH in Crimson Red, MEDIUM in Amber, LOW in Slate) beside each ticket in the 'Recent Service Tickets' list? This would allow IT Staff to triage critical urgent tickets immediately from the dashboard overview.]" |
| **Partner's Response** | "[No response directly,<br>**Commit Message after receiving my comment:** refactor: address review feedback for priority indicators on dashboard recent tickets.<br>**After I reviewed his changes again, he said:** Merge for me Please]" |
| **Outcome** | Approved and merged |
