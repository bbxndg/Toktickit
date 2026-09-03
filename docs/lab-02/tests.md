# Lab 2 Test Plan and Results

**Product:** TokTickIT IT Service Desk  
**Sprint:** Lab 2 — Requester Ticketing MVP  
**Status:** Planned Test Suite (Pre-Implementation Baseline)  

---

## 1. Test Strategy

The verification strategy follows **Test-Driven Development (TDD)** and **Spec-Driven Development (Spec DD)**. Automated tests are written before or in lockstep with implementation and span all four levels of the testing pyramid:
1. **Unit Tests (Vitest)**: Data generator logic (unique `ticketNumber` generation), file validation utilities, date/size formatting helpers.
2. **API Integration Tests (Supertest + Vitest)**: Complete REST contracts under `server/tests/lab-02/` covering happy paths, input validation, unauthorized access, attachment constraints, and soft removal.
3. **UI Component Tests (Vitest + React Testing Library)**: Client component behavior under `client/tests/lab-02/` validating form states, busy indicators, error message placements, responsive cards, and modal interactions.
4. **End-to-End Tests (Playwright)**: End-user journey tests under `e2e/lab-02/` simulating cross-page navigation, session switching, ticket submission, file upload, and soft-removal.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-01, BR-01 | Create ticket with valid data | HTTP 201; returns created ticket with unique `TKT-YYYY-XXXXXX` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-02** | API | AC-02, BR-10 | Create ticket with missing summary | HTTP 400; validation error for `summary` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-03** | API | AC-03, BR-06 | Upload attachment > 5 MB | HTTP 400; rejected with file size error | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-04** | API | AC-03, BR-06 | Upload invalid MIME type (.exe) | HTTP 400; rejected with invalid file type error | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-05** | API | AC-05, BR-04 | Query tickets for Requester A | HTTP 200; returns array containing only Requester A tickets | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-06** | API | AC-09, FR-07 | Search tickets by keyword | HTTP 200; filters list to matching summaries/numbers | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-07** | API | AC-06, BR-04 | Requester B fetches Requester A's ticket | HTTP 403 or 404; ticket data blocked | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-08** | API | AC-07, BR-07 | Soft remove attachment with reason | HTTP 200; `isRemoved = true`, reason saved | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-09** | API | AC-08, BR-08 | Download soft-removed attachment | HTTP 410 or 404; download blocked | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-10** | API | AC-04, BR-06 | Add 6th active attachment to ticket | HTTP 400; rejected exceeding 5 active limit | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-11** | API | AC-10, BR-05 | Retrieve requesters list | HTTP 200; inactive requesters excluded | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **UI-01** | UI | AC-01, BR-11 | Submit button enters busy state on click | Button disabled and displays loading indicator | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-02** | UI | AC-02, BR-10 | Validation error shown under input | Red error message rendered immediately below summary | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-03** | UI | AC-05, BR-13 | Change Requester updates ticket list | Old tickets cleared, new user's tickets loaded | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-04** | UI | AC-09, FR-08 | Pagination button changes active page | Updates displayed slice and active page indicator | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-05** | UI | AC-07, BR-07 | Soft-remove modal requires non-empty reason | Confirm button disabled until reason is entered | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **UI-06** | UI | AC-08, BR-09 | Removed attachment displays strikethrough | No download button present for removed row | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **E2E-01** | E2E | AC-01, AC-05 | Full journey: Select Requester -> Create -> List | Ticket appears in list with generated number | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-02** | E2E | AC-07, AC-08 | Detail journey: Upload -> Soft-remove -> Verify | Attachment soft-removed with reason and download disabled | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Description | Planned Test Cases | Level |
| :--- | :--- | :--- | :--- |
| **AC-01** | Create valid ticket and receive official number | `API-01`, `UI-01`, `E2E-01` | API, UI, E2E |
| **AC-02** | Validation errors displayed below inputs | `API-02`, `UI-02` | API, UI |
| **AC-03** | Attachment file size & type validation | `API-03`, `API-04` | API |
| **AC-04** | Limit of 5 active attachments enforced | `API-10` | API |
| **AC-05** | Requester ownership isolation in My Tickets | `API-05`, `UI-03`, `E2E-01` | API, UI, E2E |
| **AC-06** | Cross-requester ticket detail access forbidden | `API-07` | API |
| **AC-07** | Soft removal records reason and preserves metadata | `API-08`, `UI-05`, `E2E-02` | API, UI, E2E |
| **AC-08** | Soft-removed attachment blocked from download | `API-09`, `UI-06`, `E2E-02` | API, UI, E2E |
| **AC-09** | Search, filter, and paginate ticket list | `API-06`, `UI-04` | API, UI |
| **AC-10** | Inactive requesters excluded from dropdown | `API-11` | API |

---

## 4. Responsive and Visual Checklist

- [ ] **Color Palette Fidelity**: App header matches `#006B3C`, hover states match `#0B7A46`, pale green highlights match `#EAF6EF`.
- [ ] **Read-only vs Editable**: Ticket Number, Date, Requester, and Detail header fields use `#E8EFEA` background.
- [ ] **Validation Positioning**: Field error text is colored `#B91C1C` and positioned immediately under the input control.
- [ ] **No Horizontal Overflow**: Verified at Desktop (`1280px`), Tablet (`800px`), and Mobile (`375px`).
- [ ] **Mobile Transformation**: My Tickets table gracefully collapses to card view below `768px`.
- [ ] **Touch Targets**: All mobile buttons, links, and select fields provide at least `44px` touch height.

---

## 5. Test Execution Commands

```bash
# Run Server API and Unit Tests
cd server && npm test

# Run Client Unit and Component Tests
cd client && npm test

# Run End-to-End Tests
npx playwright test e2e/lab-02/
```

---

## 6. Final Results

*(To be updated after implementation branches are completed and merged)*

| Suite | Total Tests | Passed | Failed | Skipped | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Server Tests** | TBD | TBD | 0 | 0 | Pending |
| **Client Tests** | TBD | TBD | 0 | 0 | Pending |
| **E2E Tests** | TBD | TBD | 0 | 0 | Pending |

---

## 7. Known Limitations or Deferred Tests

- Authentication, token verification, and password checks are intentionally deferred to Lab 3 as per stakeholder specifications.
- Public comments, internal IT notes, and IT Staff workflow tests are excluded from this MVP release.

