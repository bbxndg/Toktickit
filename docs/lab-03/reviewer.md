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

### PR 1 — [feature/1_lab3-auth] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/...] |
| **My Review Comment** | "[...]" |
| **Partner's Response** | "[...]" |
| **Outcome** | Approved and merged |

---

### PR 2 — [feature/2_lab3-staff-queue] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/...] |
| **My Review Comment** | "[...]" |
| **Partner's Response** | "[...]" |
| **Outcome** | Approved and merged |

---

### PR 3 — [feature/3_lab3-user-management] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/...] |
| **My Review Comment** | "[...]" |
| **Partner's Response** | "[...]" |
| **Outcome** | Approved and merged |

---

### PR 4 — [feature/4_lab3-collaboration] → lab3-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/...] |
| **My Review Comment** | "[...]" |
| **Partner's Response** | "[...]" |
| **Outcome** | Approved and merged |

