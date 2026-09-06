# Lab 2 Peer Review Record

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

### PR 1 — feature/issue-1-specs-and-planning → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/11](https://github.com/bbxndg/Toktickit/pull/11) |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Reviewed and approved! Complete coverage across all 4 Lab 2 specification documents. The traceability matrix mapping from AC-01 through AC-10 to concrete test paths is super clean and thorough.API contracts, Prisma data models, and responsive layout specs fully align with project requirements. LGTM! PR Approved.]" |
| **My Response** | "[Thank you for the review, can you please merge for me now.]" |
| **Outcome** | Approved and merged |

---

### PR 2 — feature/2_lab2-db-seed-requester-context → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/14](https://github.com/bbxndg/Toktickit/pull/14) |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[LGTM! 🚀 Great work on Lab 2 implementation!<br><br>Summary of review:<br><br>Database & Seeding: Prisma schema models structure is clean and idempotent seeding is properly handled.<br>Backend API: GET /api/requesters endpoint correctly filters active requesters (BR-05 verified with supertest).<br>Frontend & UI: RequesterContext with LocalStorage and RequesterSelector UI work smoothly. Zen Green theme looks neat.<br>Testing: Tests cover both API and Frontend components cleanly.<br>Everything looks solid and meets the Lab 2 specifications. Approved and ready to merge! 👍]" | 
| **My Response** | "[Thanks for you detailed review, can you please merge this PR for me kub.]" |
| **Outcome** | Approved and merged |

---

### PR 3 — feature/3_lab2-create-ticket-flow → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/20](https://github.com/bbxndg/Toktickit/pull/20) |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Great work! The implementation of the ticket creation flow, Multer attachment handling, and the Zen Green frontend component looks super solid.<br><br>Awesome job keeping 100% test coverage across both backend and frontend suites. Everything looks clean and ready to go. Approved! 👍]" |
| **My Response** | "[Thank you for reviewing my PR, you can merge this PR now.]" |
| **Outcome** | Approved and merged |

---

### PR 4 — feature/4_lab2-my-tickets-screen → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/21](https://github.com/bbxndg/Toktickit/pull/21) |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[**server/src/routes/tickets.ts**<br>**Suggestion (Performance / DB Optimization):**<br>Currently, we fetch all active attachments into memory just to count them (include: { attachments: { where: { isRemoved: false }, select: { id: true } } } followed by .length). Can we refactor this to use Prisma's _count aggregation instead? This will let PostgreSQL perform the count directly at the database level without transferring unnecessary records over the network.<br><br>**client/tests/lab-02/MyTickets.test.tsx**<br>**Suggestion (Test Coverage):**<br>Could we add a dedicated unit test verifying the \"Clear Filters\" interaction? Specifically, testing that clicking the \"Clear Filters\" button resets the search input, category, priority, and status dropdowns back to their default values and refreshes the query.<br><br>**client/src/pages/MyTickets.tsx**<br>**Suggestion (UX & Network Efficiency):**<br>Great job on the filter toolbar! However, typing in the search input currently triggers a backend API call on every single keystroke because search is tied directly to the useEffect fetch without any debounce. Could we introduce a debounce mechanism (e.g., ~300ms) for the search query? This will significantly reduce redundant API traffic while the user is actively typing.]" |
| **My Response** | "[No response directly<br>Commit Message after receiving my friend's comment: refactor: address PR review feedback on Prisma count aggregation, search debounce, and test coverage<br>After my friend review my changes again, I said: Thanks for the review, please merge for me]" |
| **Outcome** | Approved and merged |

---

### PR 5 — feature/5_lab2-ticket-detail-and-attachments → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/22](https://github.com/bbxndg/Toktickit/pull/22) |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[**server/src/routes/ticketDetail.ts**<br>**Suggestion (Code Cleanliness & Robustness):**<br>Instead of manually setting headers and calling `res.sendFile()`, Express provides `res.download(filePath, attachment.originalName)` which natively handles Content-Disposition, UTF-8 filename encoding, and stream error handling.<br>Also, when an attachment is added or soft-removed, should we update the parent Ticket's `updatedAt` timestamp so the ticket history reflects the latest activity?<br><br>**client/src/pages/TicketDetail.tsx**<br>**Suggestion (UX / UI Enhancement):**<br>Currently file sizes are hardcoded to display in KB (`(att.sizeBytes / 1024).toFixed(1)} KB`). Could we create a `formatFileSize` helper that formats larger files as MB (e.g. `2.4 MB` instead of `2457.6 KB`) for better readability?<br>Additionally, let's ensure the file input value is properly reset on error so re-selecting the same file will still trigger the `onChange` event.<br><br>**client/tests/lab-02/TicketDetail.test.tsx**<br>**Suggestion (Test Coverage):**<br>Could we add a test case to verify client-side attachment validation in `handleAddAttachment`? Specifically testing that selecting an invalid file type (e.g., `.exe` or disallowed MIME) immediately renders the error alert without sending an API request.]" |
| **My Response** | "[No response directly<br>Commit Message after receiving my friend's comment: refactor: address PR review feedback on file download handling, file size helper, and validation tests<br>After my friend review my changes again, I said: Thank you for your review, can you please merge the PR]" |
| **Outcome** | Approved and merged |

---

### PR 6 — feature/6_lab2-e2e-testing-and-screenshots → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/bbxndg/Toktickit/pull/23](https://github.com/bbxndg/Toktickit/pull/23) |
| **Reviewer** | [Kawinpop Churari] ([@softkoi](https://github.com/softkoi)) |
| **Review Comment** | "[Wow, that’s fantastic—an absolutely perfect job. I’m going to approve it right now.]" |
| **My Response** | "[Thank you for the review, please merge for me hehe]" |
| **Outcome** | Approved and merged |

---

## Pull Requests I Reviewed for My Partner

> I reviewed the following PRs submitted by my partner Kawinpop Churari ([@softkoi](https://github.com/softkoi)).

### PR 1 — [feature/1-specification] → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/10](https://github.com/softkoi/toktickit/pull/10) |
| **My Review Comment** | "[Look good to me, the specifications are clear and easy to catch up with, covers all the specs required for this lab, good job, feel free to start implementing.]" |
| **Partner's Response** | "[No Comment]" |
| **Outcome** | Approved and merged |

---

### PR 2 — [feature/2-requester-context] → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/11](https://github.com/softkoi/toktickit/pull/11) |
| **My Review Comment** | "[Look good to me, start small, 3 endpoints are actually enough for this PR, please continue the left in the next and next PR krub, don't forget to take a look on both, try to match every PR with the Functional Requirements from last PR that you made and don't take testing for granted, feel free to continue.]" |
| **Partner's Response** | "[No Comment]" |
| **Outcome** | Approved and merged |

---

### PR 3 — [feature/3-create-ticket] → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/12](https://github.com/softkoi/toktickit/pull/12) |
| **My Review Comment** | "[Approved, looks good, your implementation covers the required backend API, ticket number generation, validation, frontend TicketForm, and associated test coverage in accordance with the spec requirements.]" |
| **Partner's Response** | "[Thank you for the review, can you please merge for me now. hehe]" |
| **Outcome** | Approved and merged |

---

### PR 4 — [feature/4-file-attachment] → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/13](https://github.com/softkoi/toktickit/pull/13) |
| **My Review Comment** | "[Great job on Feature 4! The implementation of BR-06 Attachment Resiliency is clean, and having all 8 server test files passing with 100% success is awesome. The file upload flow and quota check logic looks good.<br><br>I noticed a few minor improvements regarding frontend memory management, accessibility (a11y), and backend temp file error handling. Please check my inline comments below. Once addressed, this is good to merge!<br><br>**client/src/components/AttachmentUploader.tsx**<br>Nice work handling image preview generation with `URL.createObjectURL`! You've properly revoked object URLs in `handleRemoveFile`, but if the component unmounts while preview images are active (or if the user resets the form), those blob URLs might remain in memory.<br>Could we add a `useEffect` cleanup hook to automatically revoke all active `previewUrls` when the component unmounts?<br>`useEffect(() => { return () => { files.forEach(fileItem => { if (fileItem.previewUrl) { URL.revokeObjectURL(fileItem.previewUrl); } }); }; }, [files]);`<br><br>**client/src/components/AttachmentUploader.tsx**<br>The drag-and-drop area works smoothly with mouse interactions! To ensure full keyboard accessibility (a11y) for screen readers and keyboard users, could we add `role=\"button\"`, `tabIndex={0}`, and an `onKeyDown` event handler (for Enter / Space keys) to trigger the file input?<br><br>**server/src/controllers/attachment.controller.ts**<br>In the error/forbidden branches, you properly clean up uploaded temp files using `fs.unlink`. However, using an empty callback `() => {}` silently ignores potential filesystem deletion errors (e.g. ENOENT or permission issues).<br>Suggest logging unlink errors or wrapping cleanup in a utility function using `fs.promises.unlink` with a try/catch block to keep controller logs clean and track any lingering unlinked files.<br><br>**server/src/services/attachment.service.ts**<br>I noticed `ALLOWED_MIME_TYPES` and `ALLOWED_EXTENSIONS` are duplicated between `AttachmentUploader.tsx` and `attachment.service.ts`. Should we consider moving shared constants to a common config file (or exporting them cleanly) so that frontend and backend limits stay perfectly synced if we ever update allowed file types or size limits?]" |
| **Partner's Response** | "[No response directly<br>Commit Message after receiving my comment: refactor(attachment): address code review feedback for preview URL cleanup, dropzone a11y, safeUnlink, and shared constants<br>After I review his changes again, he said: Thank you, merge for me please]" |
| **Outcome** | Approved and merged |

---

### PR 5 — [feature/5-my-tickets] → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/14](https://github.com/softkoi/toktickit/pull/14) |
| **My Review Comment** | "[Looks great overall! Left a few minor suggestions, please have a look.<br><br>**client/src/pages/MyTicketsPage.tsx**<br>Nice work on the search form implementation! To improve screen reader accessibility (a11y) and user experience, could we add an `aria-label=\"Search tickets by summary or number\"` attribute to the input element and `aria-label=\"Submit search\"` to the search button?<br>Also, adding `autoComplete=\"off\"` to the search input would prevent browser autofill popups from obscuring the search suggestions/table headers.<br><br>**client/src/pages/MyTicketsPage.tsx**<br>Great job handling async data fetching! However, if a user rapidly changes filter dropdowns or types quickly in the search input, multiple HTTP requests might trigger in parallel. This could potentially cause a race condition where a slower, older request overwrites newer filtered results. Could we add an `AbortController` signal to the fetch request in `useEffect` cleanup so that pending in-flight requests are automatically cancelled when filters change?<br><br>**server/src/controllers/ticket.controller.ts**<br>In `getTickets`, if a client passes an invalid non-numeric category string like `category=abc` or a negative number like `category=-1`, `parseInt(category as string, 10)` currently results in `NaN` or a negative integer without returning a validation error.<br>Should we add a validation check to return a `400 Bad Request` with `code: 'INVALID_CATEGORY'` if category is provided in the query string but is not a valid positive integer?<br><br>**server/src/controllers/ticket.controller.ts**<br>Currently, `await prisma.ticket.count(...)` and `await prisma.ticket.findMany(...)` run sequentially in two separate database round-trips. Could we optimize DB latency by running them concurrently using `Promise.all([prisma.ticket.count(...), prisma.ticket.findMany(...)])` when fetching the ticket list?]" |
| **Partner's Response** | "[No response directly<br>Commit Message after receiving my comment: refactor(tickets): address code review feedback for search accessibility, abort controller, category validation, and Promise.all concurrency<br>After I review his changes again, he said: Can you merge for me please ;-; TT]" |
| **Outcome** | Approved and merged |

---

### PR 6 — [feature/6-ticket-detail] → lab2-staging

| Field | Detail |
|-------|--------|
| **PR Link** | [https://github.com/softkoi/toktickit/pull/15](https://github.com/softkoi/toktickit/pull/15) |
| **My Review Comment** | "[Well done, look good to me, approved this PR.]" |
| **Partner's Response** | "[pls merge for me my friend]" |
| **Outcome** | Approved and merged |
