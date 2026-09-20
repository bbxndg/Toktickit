# Lab 3 Peer Review Record

## My Information

| Field | Detail |
|-------|--------|
| **Name** | [Benjamin Garforth] |
| **Student ID** | [67070501031] |
| **GitHub Username** | [bbxndg](https://github.com/bbxndg) |

---

## Peer Reviewer (Primary)

| Field | Detail |
|-------|--------|
| **Reviewer Name** | [Kawinpop Churari] |
| **Reviewer Student ID** | [67070501079] |
| **Reviewer GitHub Username** | [softkoi](https://github.com/softkoi) |

---

## Pull Requests Reviewed

> My partner reviewed the following PRs that I submitted.

### PR 1 — feature/1_lab3-specifications → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/28] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Very well done. The documentation is very detailed. I approve.]" |
| **My Response** | "[Thanks for the review, please merge for me.]" |
| **Outcome** | Approved and merged |

---

### PR 2 — feature/2_lab3-auth-and-user-management → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/33] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[LGTM! 🚀 Great work on Issue 2 implementation!<br>**Review Summary:**<br><br> - Database migration and idempotent seeding look clean and properly handle all roles with bcrypt password hashes. Authentication flow (JWT, cookies/headers, password complexity, mandatory first-login gate) works seamlessly. Administrator safety guards (BR-17 preventing self-deactivation and BR-18 protecting the last active administrator) are properly implemented on both server and client layers.<br> - Test coverage is impressive with 51/51 server tests and 35/35 client tests passing cleanly. Minor UI / Spec Alignment Suggestions: In UserManagement.tsx, I noticed a couple of minor visual details from docs/lab-03/ui-spec.md (Screen 5) that could be aligned even more precisely:<br>Edit Modal Title: The UI spec mentions Edit User: [Name] as the modal title (currently it displays the generic Edit User Account).<br> - Safety Notice Wording: The spec suggests the exact safety hint: "At least one active Administrator must remain in the system." when the user is the sole active admin.<br> - Role Badges Tooltip: Adding a simple title attribute to the Role badges in the user directory table (e.g. explaining permissions for Requester / IT Staff / Admin) would provide great contextual guidance for administrators. These are minor UI polish items.<br><br>Once addressed, I'm happy to approve and merge this PR! 👍]" |
| **My Response** | "[No response directly,<br>**Commit Message after receiving my friend's comment:** fix(client): align user management modal title, safety wording, and role tooltips with ui-spec.<br>**After my friend review my changes again, I said:** Thank you for your review, please merge for me my lord.]" |
| **Outcome** | Approved and merged |

---

### PR 3 — feature/3_lab3-staff-queue-and-ticket-workflow → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/34] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[The overall code flow for the IT Staff Ticket Queue and BR-10 State Transition Matrix is complete and looks very good.<br><br>I have one small UX suggestion for StaffTicketDetail.tsx: in the Ticket Owner section, when the ticket is already owned by the current staff member (ticket.owner.id === user?.id), the Claim button is not displayed because they are already the owner.<br><br>It would be helpful to add a small badge, such as “Assigned to You”, next to the Ticket Owner label. This would give staff clear and immediate visual feedback that the ticket is already assigned to them.]" |
| **My Response** | "[No response directly,<br>**Commit Message after receiving my friend's comment:** feat(client): display assigned to you badge on ticket detail owner section.<br>**After my friend review my changes again, I said:** Please merge for me.]" |
| **Outcome** | Approved and merged |

---

### PR 4 — feature/4_lab3-collaboration-and-e2e → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/35] |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[The collaboration feature works nicely! But I would like a small changes, when the comment or note input is under 2 characters and the button is disabled, could you add a title tooltip (e.g., title="Must be between 2 and 2,000 characters") on the submit buttons so users immediately know the minimum length requirement?]" |
| **My Response** | "[No response directly,<br>**Commit Message after receiving my friend's comment:** feat(collaboration): add character limit tooltips to comment and note submit buttons.<br>**After my friend review my changes again, I said:** please merge for meeeee.]" |
| **Outcome** | Approved and merged |

---

## Pull Requests I Reviewed for My Partner

> I reviewed the following PRs submitted by my partner Kawinpop Churari ([@softkoi](https://github.com/softkoi)).

### PR 1 — [feature/1-engineering-contract] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/23] |
| **My Review Comment** | "[Look good to me, the specifications are very clear and well implemented, approved.]" |
| **Partner's Response** | "[Thank you, Please merge for me]" |
| **Outcome** | Approved and merged |

---

### PR 2 — [feature/2-database-migration-design] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/24] |
| **My Review Comment** | "[Look good to me, approved to merge. Good database and migration strategy.]" |
| **Partner's Response** | "[Please merge for me my baby]" |
| **Outcome** | Approved and merged |

---

### PR 3 — [feature/3-test-design-documentation] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/25] |
| **My Review Comment** | "[Your implementation looks great but I have minor changes required for you, once it's addressed, I will be happy to approve,<br><br>**docs/lab-03/tests.md**<br>In TEST-004 (Password Boundary Validation), could you clarify if we are also testing a maximum password length limit (e.g. 128 characters) to prevent DoS attacks via bcrypt hashing heavy payloads?<br><br>**docs/lab-03/tests.md**<br>For TEST-020 (State Machine Transitions), please specify if we should add an explicit test case for ticket cancellation (NEW -> CANCELLED), and whether a Requester is allowed to cancel their own ticket if it's still in NEW status.<br><br>**docs/lab-03/tests.md**<br>Great test plan! For TEST-033 (Accessibility), can we also include explicit checks for Screen Reader ARIA Live Regions (aria-live="polite") when toast notifications appear upon ticket status updates?]" |
| **Partner's Response** | "[No response directly,<br>**Commit Message after receiving my comment:** docs: update lab-03 test plan based on review feedback.<br>**After I review his changes again, he said:** Happy Happy, Please merge for me.]" |
| **Outcome** | Approved and merged |

---

### PR 4 — [feature/4-authentication-foundation] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/26] |
| **My Review Comment** | "[Looks good overall, but I have small concerns, once addressed, I will be happy to merge,<br><br>**server/src/utils/passwordPolicy.ts**<br>In validatePasswordPolicy, could we ensure that passwords containing whitespace characters or leading/trailing spaces are explicitly validated or rejected? Currently, spaces might be counted towards the 8-character minimum length. Please add a check or regex to reject passwords with spaces.<br><br>**server/src/controllers/auth.controller.ts**<br>In the login handler, could we make sure the input email is sanitized with .trim().toLowerCase() before querying Prisma? Also, for inactive accounts (!user.isActive), please ensure the error message specifies Account is deactivated with a 401 status code to match the acceptance criteria AC-05.<br><br>**server/src/middlewares/authMiddleware.ts**<br>In requireRoles middleware, could we make sure that when role authorization fails, it returns a standard JSON error response with 403 Forbidden and error code INSUFFICIENT_PERMISSIONS as defined in section 1.2 of the API spec?<br><br>**server/tests/lab-03/auth.api.test.ts**<br>Could you add an extra test case in auth.api.test.ts to test sending an empty JSON body {} to POST /api/auth/login and verify that the API gracefully handles it and returns 401 Unauthorized with INVALID_CREDENTIALS?]" |
| **Partner's Response** | "[No response directly,<br>**Commit Message after receiving my comment:** refactor(auth): address code review feedback on password space validation and email sanitization.<br>**After I review his changes again, he said:** Merge for me pls.]" |
| **Outcome** | Approved and merged |

---

### PR 5 — [feature/5-admin-user-management] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link 1 #Partner accidentally closed the PR, #With my comment** | [https://github.com/softkoi/toktickit/pull/27] |
| **PR Link 2 #Continued Version, #Without my comment** | [https://github.com/softkoi/toktickit/pull/28] |
| **My Review Comment** | "[Looks great brother, but I have a small changes required for you, once addressed, I'll merge this PR,<br><br>**server/src/controllers/admin.controller.ts**<br>Consider adding strict regex validation for the email format here before querying the database, so invalid or malformed email strings (e.g., missing '@' or domain) are rejected early with a 400 Bad Request instead of relying solely on Prisma errors.<br><br>**client/src/pages/LoginPage.tsx**<br>Great job implementing the password visibility toggle! Could you add an aria-label attribute (e.g., aria-label={showPassword ? 'Hide password' : 'Show password'}) to this toggle button to improve accessibility for screen readers?<br><br>**client/src/index.css**<br>To ensure optimal touch UX on mobile devices, could we add smooth momentum scrolling -webkit-overflow-scrolling: touch; and touch-action: pan-x; to .table-container, .overflow-x-auto so tables scroll smoothly on iOS and Android phones?]" |
| **Partner's Response** | "[Thank you merge for me please]" |
| **Outcome** | Approved and merged |

### PR 6 — [lab3-staging] → main

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/29] |
| **My Review Comment** | "[Great job for Lab3 implementation, you are doing great! Happy to merge this into main]" |
| **Partner's Response** | "[merge please]" |
| **Outcome** | Approved and merged |

