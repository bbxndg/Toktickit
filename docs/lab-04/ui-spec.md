# Lab 4 Zen Green UI Specification

**Product:** TokTickIT IT Service Desk\
**Sprint:** Lab 4 — Actions Taken, Dashboards, and Final Regression\
**Design System:** Zen Green Theme\
**Status:** Draft UI Specification — Planned Implementation

---

## 1. Color Palette & Design Tokens

Reuse `client/src/styles/zen-green.css`, Bootstrap, existing cards/forms/badges and typography. These values are the current project tokens, not a replacement theme:

Lab 4 sections 7-8 define this sprint's UI scope. Earlier UI specifications are the writing/layout examples and existing design context; retain their component conventions as Lab 4 requires.

| Token | Value / purpose |
| --- | --- |
| --zg-primary | #006B3C; navbar and primary actions |
| --zg-secondary | #0B7A46; links, active tabs and focus |
| --zg-pale | #EAF6EF; subtle selected/success emphasis |
| --zg-bg / --zg-surface | #F5F7F6 / #FFFFFF; page and cards |
| --zg-text-primary / --zg-text-muted | #1A2E26 / #52635B |
| --zg-border / --zg-readonly-bg | #D1D9D4 / #E8EFEA |
| --zg-error / --zg-error-bg | #B91C1C / #FEE2E2 |
| --zg-warning / --zg-warning-bg | #D97706 / #FEF3C7 |
| --zg-success / --zg-success-bg | #15803D / #DCFCE7 |

Use `zg-card`, `zg-label`, `zg-input`, `zg-readonly-field`, `zg-error-text`, `btn-zg-primary`, and `btn-zg-secondary` where applicable. New status badges reuse these semantic colors rather than silently assuming new CSS classes already exist. Text labels distinguish planned/progress/completed/cancelled even without color. Priority/role/Ticket status badges retain established meaning. Warnings are used for actual blockers/conflicts, not decoration.

### Actions Taken Status Badges

| Status label | Background / text | Meaning |
| --- | --- | --- |
| Planned | #EAF6EF / #006B3C | Work recorded but not started |
| In Progress | #FEF3C7 / #B45309 | Work currently being performed |
| Completed | #DCFCE7 / #166534 | Work finished with a recorded result |
| Cancelled | #FEE2E2 / #B91C1C | Work stopped with a recorded reason |

These are proposed badge mappings for the new action states. Existing Ticket status, priority and role badges keep their current classes and labels; do not add a second badge system.

---

## 2. Typography & Form Layout Rules

| Element | Typography / layout |
| --- | --- |
| Font family | Existing system stack: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif |
| Page title | 1.5rem / 24px, weight 700, primary text color |
| Section/card title | 1.25rem / 20px, weight 600 |
| Form label | 0.875rem / 14px, weight 500, 4px below label |
| Body/input text | 1rem / 16px, weight 400 |
| Helper/validation text | 0.8125rem / 13px, placed directly beneath the associated control |
| Fields | Consistent 40px desktop input/select height; textareas at least 120px with safe vertical resizing |
| Spacing and surfaces | Existing 8/16/24px spacing, 8px card corners, subtle border/shadow; centered max-width 1200px content |
| Touch controls | At least 44px interactive target on mobile; readable save/cancel controls |

Labels sit above controls and reference inputs through htmlFor/id. Required fields show a red asterisk plus textual/screen-reader explanation. Editable fields are white with a neutral border; automatic/immutable values use readable read-only shading. Keep helper text and field-specific validation visible rather than relying on tooltips. The same typography and states apply to dashboard cards, actions, workflow dialogs and earlier retained screens.

---

## 3. Button Hierarchy & Interactive States

| Type / state | Appearance and behavior |
| --- | --- |
| Primary | Primary green, white text, visible action label; secondary-green hover. Save Action, Save Changes, Refresh or confirmed workflow action. |
| Secondary | White/transparent surface, neutral border and readable text. Cancel, Back, Clear Filters and Reload Latest. |
| Tertiary / link | Secondary-green text, visible focus, named destination. View Tickets, Open Ticket and tab navigation. |
| Destructive | Error color with clear Cancel Action/Cancel Ticket label; confirmation includes required shared reason. |
| Disabled | Visually distinct and inert; keep the reason available in adjacent text. Do not rely on low-contrast text to convey important state. |
| Busy | Immediate disabled duplicate-submit guard, spinner and Saving.../Loading... label; announce processing. |
| Focus | Visible 2px secondary-green outline with offset; keyboard activation supported. |

Reuse existing button classes and border-radius conventions. Status and priority badges always include text. Icon-only controls require an accessible name and tooltip. Warnings explain actual blockers/conflicts. Confirmations, successful changes and recoverable failures must remain readable without color alone.

---

## 4. Application Shell & Role-Based Navigation

Keep the current AppView/state-based navigation; new planned views are `requester-dashboard` and `staff-dashboard`. Dashboard controls pass initial filter/page/tab context into the existing My Tickets/Queue/detail views. This is a view contract, not an assertion that URL routes or a routing library exist.

| User state / role | Landing view | Navigation |
| --- | --- | --- |
| Unauthenticated | Login | No protected destinations |
| First-password-change required | Mandatory Change Password | No dashboard/Ticket navigation until saved |
| REQUESTER | Requester Dashboard | Dashboard, My Tickets, Create Ticket, Sign Out |
| IT_STAFF | Staff Dashboard | Dashboard, Ticket Queue, Sign Out |
| ADMINISTRATOR | Staff Dashboard | Dashboard, Ticket Queue, User Management, Sign Out |

Brand opens the appropriate role dashboard. Show the authenticated name/role; no Development Requester selector or Change Requester action appears in the delivered application. Do not add staff Ticket creation merely because a mockup contains a Create Ticket shortcut; this sprint retains the existing Requester creation scope.

The current role determines visible destinations, while APIs independently enforce access. Logout/account switch clears dashboard counts, loaded Tickets, action drafts and filters scoped to the former user. Abort/ignore late responses. The first-password gate must work before a cached role dashboard is displayed. Highlight the current navigation item with both styling and an accessible current indication.

---

## 5. Screen Specifications

### Shared Dashboard Layout and Feedback

```text
TokTickIT | Dashboard | permitted navigation | Name / Role | Sign Out
Dashboard                                            [Refresh]
Updated: <local date/time with timezone>
[Metric + value + View Tickets] [Metric + value + View Tickets] ...
Recent Tickets                          Additional role section
Ticket number | Summary | Status | Updated | Open
```

Four concise metric cards are used per role. Every card has a plain label, authoritative number and named button/link for its destination. Use semantic buttons/links rather than click handlers on an unlabeled div. Keep a zero-count card actionable so the user can inspect an empty filtered list. Counts are totals from the backend, not the displayed recent-list length.

Initial fetch shows a labeled loading region/skeleton, not zeros. Successful empty data shows zero cards and useful empty text. First-load failures show an error and Retry; failed refresh may retain the previous successful snapshot with "Could not refresh. Showing previously loaded data." and its timestamp. A refresh request disables its own control; late responses cannot replace newer snapshots. Use a polite live region for completion, and clear alerts for errors without moving focus unexpectedly.

### 5.1. IT Staff and Administrator Dashboard

Cards: **Active Tickets**, **Unassigned Tickets**, **My Assigned Tickets**, **Waiting for Requester**. Use the specification's active predicates consistently. Follow with compact Ticket-status and active-IT-priority summary badges, each a named filtered-Queue action; include every zero bucket.

Sections:

- **Recent Tickets:** at most five shared Tickets with number, summary, status, owner (or Unassigned), updated time and Open.
- **My Pending Actions:** at most five actions assigned to the authenticated staff/Admin, oldest first. Show Ticket number, action description, status, creation time and Open Ticket. Show "Showing N of M pending actions" using the full action total. One Ticket may appear more than once because rows represent actions, not Tickets.

Open an action's parent staff detail with Actions Taken selected and the row identified. If that page contains more actions, fetch its page or provide a direct focus mechanism; do not silently highlight an unrelated row. Administrator uses this same dashboard plus its existing User Management destination. Extra account-count widgets are deferred.

### 5.2. Requester Dashboard

Cards: **Total Tickets**, **Active Tickets**, **Waiting for You**, **Recently Resolved (7 days)**. Helper text defines active as New/Open/In Progress/Waiting for Requester/Reopened. The recent-resolution window uses the backend UTC instants; display its human-readable range without recomputing the query using local calendar days.

Recent Tickets shows at most five owned records (Ticket Number, Summary, Status, Updated, Open). Provide a View My Tickets secondary action and Requester's existing Create Ticket action. No-record text: "No tickets yet." Waiting-for-you card directs attention to the exact WAITING_FOR_REQUESTER filter; recent-resolution card directs to its fixed date range. Do not label cancelled/closed Tickets active. Do not include other users, internal notes or staff-only controls.

### Dashboard Drill-Down Context

Accept only permitted AppView destinations and query keys from the API. Set destination page=1; apply the exact status/statusGroup/owner/priority/date-range predicate. My Tickets and Queue show active filter controls or a clear removable summary, including the fixed recent-resolution range. Clear Filters removes dashboard-derived filters too. Opening/returning from detail preserves destination filters/page and the source dashboard context. Do not present an unfiltered list as the result of clicking a filtered count.

### 5.3. Actions Taken on Ticket Detail

#### 5.3.1. Shared list and read-only view

Add an **Actions Taken** tab to existing Ticket Detail, separate from Public Comments, Internal Notes and Attachments. Both staff and the owning Requester can read all action rows including cancelled/completed work. The Requester DOM contains no staff action forms, edit buttons or Internal Notes tab/content.

Desktop table: Action Date/Time, Description preview, Assignee, Performed By, Status, Follow-up, View/Edit action. The expanded view/modal shows complete description/result/follow-up note/attachment notes/cancel reason, creator, last editor and timestamps without truncating access to full text. Display performer as "Not completed" until completion. Keep automatic performer distinct from the planned assignee and parent Ticket Owner.

Sort by immutable actionAt ascending then ID ascending. Paginate at 20 by default using API totals; editing does not move a row. Mobile uses cards with the same accessible fields, followed by expanded full content. Wrap long filenames and multiline text. Empty text: "No actions recorded." Read-only terminal rows show their status and View without Edit/Delete. Historic inactive assignee is labeled clearly without removing attribution.

#### 5.3.2. Staff create/edit form

Use a focused dialog or the existing detail-panel convention; the implementation must choose one consistent responsive form, with an accessible heading and labels:

| Control | Behavior |
| --- | --- |
| Action Date/Time | Read-only; "Recorded when saved" during create, then server/local-time display |
| Action Description * | Textarea, trimmed 2-2,000; persistent limit help |
| Assigned To * | Active staff/Admin select from GET /api/staff/members; default current user on create; separate from Ticket Owner |
| Performed By | Read-only; explained as automatic completing user, initially Not completed |
| Status | Create: Planned/In Progress/Completed; edit: current pending status plus permitted next states |
| Result | Textarea; required when Completed, optional while pending |
| Follow-Up Required? | Labeled checkbox/switch; strict boolean |
| Follow-up Note | Required and visible when flag true; clear stored value when false |
| Attachment Notes | Optional shared textarea; identify files already in Ticket Attachments |
| Cancellation Reason | Required when changing an action to Cancelled; not a creation choice |

Show "Actions Taken are visible to the Requester. Use Internal Notes for confidential information." near the form. Field errors appear below their controls and link via aria-describedby; conditional requirements change immediately with status/flag. At first validation failure focus the first invalid field. Result/reason content is preserved after a failed request.

Create primary action: **Save Action** / **Saving...**. Edit: **Save Changes** / **Saving...**. Completion/cancellation requires explicit confirmation including the resulting terminal read-only status; confirmation includes the required result/reason inputs rather than silently advancing. Provide Cancel and a safe discard confirmation for an unsaved dirty draft. Modal supports focus trapping, Escape/cancel when safe, a named dialog, and return to its triggering control.

Creation uses one clientRequestId per creation intent; keep it across an identical network retry. On ambiguous lost response, retry/reconcile before treating modified input as a new creation, so the user is not encouraged to create duplicates. Versions/key storage is internal behavior and not exposed as ordinary form fields.

#### 5.3.3. Assignment, failures and state boundaries

Load eligible staff before enabling Save; provide loading/empty/failure feedback when the assignee list cannot load. An inactive historical assignee remains visible on View/Edit with a warning; completion requires reassignment to an active target. Server rejects inactive targets even if they were present when the dropdown loaded.

For 409 conflict, preserve the draft and show "This ticket or action changed. Reload the latest information and review your changes." Offer Reload Latest and return-to-draft review, not automatic overwrite/retry with a newer version. For 400 show field messages; for 422 explain state/gate and refresh relevant status; for safe 500/network failure retain values and offer Retry. When no action writes are permitted, show the shared list with explanatory read-only state. Reopen a resolved Ticket through its workflow controls before adding work; do not embed a hidden automatic reopen in Save Action.

### 5.4. Ticket Workflow, Resolution and History

#### 5.4.1. Staff operational controls

Keep Owner/Claim, IT Priority and Status controls in the operational strip. Their mutations use the current Ticket version. Show only matrix-permitted status destinations. If RESOLVED is matrix-permitted but blocked by pending actions, explain "Complete or cancel pending actions before resolving this ticket." Provide an accessible Actions Taken link/count; do not rely on a disabled button tooltip alone.

Resolve confirmation requires shared Resolution Summary, 2-2,000 characters. Cancel confirmation requires shared Cancellation Reason and explains that pending actions will be cancelled together. Close confirmation states the Ticket will be closed. Reopen uses a permitted RESOLVED -> REOPENED transition and clears the current resolution indication; older history remains readable.

After success, refresh parent detail/version, relevant action list/history and dashboard state before another write. Keep Requested Priority read-only. Closed/cancelled Tickets show workflow/action/owner/priority controls as read-only; normal earlier permitted comment/attachment rules are not silently conflated with that boundary.

#### 5.4.2. Requester resolution indication

Show **Problem Appears Resolved** only on owned IN_PROGRESS/WAITING_FOR_REQUESTER Tickets. Confirmation: "Tell IT that the problem appears resolved? IT will review the work before updating the ticket status." On success display "Sent to IT for review" and keep the original Ticket status badge. If already indicated, show its timestamp and remove the duplicate actionable control. Staff see a shared informational banner with the indication time. No external notification or staff status transition is implied by the banner.

#### 5.4.3. Status history

Provide **Status History** as a read-only detail section/tab visible to permitted roles. Show From -> To, staff actor, timestamp and shared reason/summary in ascending createdAt/ID order, paginated 20. No edit/delete controls. No-record text: "No recorded status changes." Do not invent an old transition or claim an older Ticket never changed merely because historical events were not stored.

Keep private Internal Notes visually distinct with the existing amber/lock/caution treatment. A history reason and action result are public fields; never copy private notes into them automatically.

### 5.5. Screen Modes and User Feedback

| Condition | Presentation / action |
| --- | --- |
| Initial/loading | Named loading region; block only controls requiring missing data |
| Successful empty | Clear no-record text, real zero totals, permitted next action |
| Filtered no-results | Explain filters and offer Clear Filters |
| Validation | Field-level error; preserve values; focus first invalid field |
| Saving | Busy text/spinner; immediate duplicate-submit guard |
| Success | Polite confirmation; update authoritative detail/counts; return focus appropriately |
| Forbidden/password gate | Accessible access explanation or password-change flow; no protected content |
| Not found | Safe generic missing/unavailable text without revealing another user's Ticket |
| Stale/conflict | Preserve draft, explicit reload/review, no silent overwrite |
| API/network failure | Safe error and Retry; retain form or label older successful snapshot |
| Session ends/account changes | Clear protected state; cancel/ignore pending response; Login or role landing |

---

## 6. Responsive & Accessibility Rules

Desktop >=992px: centered content with sensible maximum width, four-card dashboard row, two-column detail forms where practical, full action table. Tablet 768-991px: two-card columns, adaptive forms, readable condensed table/cards without page overflow. Mobile <768px: one-card columns, stacked forms, action cards, wrapped navigation/tabs, reachable save/cancel controls.

Check 1280x800 desktop, 820x1180 tablet, and 390x844 mobile; include 320px width and 200% zoom during accessibility review. No clipped labels, overlapping validation, hidden buttons, page-level horizontal scroll, inaccessible dialog footer, or unreadable action/attachment text. Container-level scrolling is allowed only for appropriate tables; card fallback is preferred on narrow screens.

Use semantic headings/lists/tables; tab controls, if implemented with tab roles, support arrow/Home/End navigation with selected state and connected tabpanels. All controls work with keyboard, preserve visible focus, have accessible names, and announce loading/error/success appropriately. Color and icons supplement text. Modal focus stays inside while open and returns on close. Check text/control contrast using actual tokens, not a blanket claim that all existing colors already pass.

---

## 7. Visual Checklist & Screenshot Plan

Issue 5 records actual results and filenames. These are destinations for future evidence, not existing screenshots:

| Screen | Planned screenshot directory | Required states |
| --- | --- | --- |
| Staff/Admin Dashboard | artifacts/lab-04/screenshots/staff-dashboard/ | Populated, zero own actions, all-zero dataset, loading, failure, filtered drill-down |
| Requester Dashboard | artifacts/lab-04/screenshots/requester-dashboard/ | Owned counts, waiting attention, zero Tickets, failure, date-range drill-down |
| Actions Taken | artifacts/lab-04/screenshots/actions-taken/ | Shared list, create/edit, follow-up/result validation, complete/cancel, inactive assignee, conflict, Requester read-only |
| Ticket Workflow | artifacts/lab-04/screenshots/ticket-workflow/ | Pending-action gate, advisory indication, resolve/close/cancel/reopen, history |

Planned filenames follow the earlier-lab numbered convention. Capture these representative names plus each required state above; add tablet/mobile variants at the documented dimensions:

- `staff-dashboard/01-staff-populated-desktop.png`, `02-staff-empty-mobile.png`, `03-staff-api-failure.png`.
- `requester-dashboard/01-requester-owned-desktop.png`, `02-requester-empty-mobile.png`, `03-requester-drilldown-tablet.png`.
- `actions-taken/01-actions-list-desktop.png`, `02-actions-validation.png`, `03-actions-readonly-mobile.png`, `04-actions-conflict.png`.
- `ticket-workflow/01-resolution-gate.png`, `02-requester-advisory.png`, `03-status-history-tablet.png`.

- [ ] Every major screen captured at desktop/tablet/mobile dimensions.
- [ ] Theme, type/spacing, badges and editable/read-only field conventions match this contract.
- [ ] Labels/asterisks/help/errors/buttons and all meaningful states are visible and readable.
- [ ] Public/private separation and role navigation hold in screenshots and direct API checks.
- [ ] Keyboard focus, dialog trap/return, tab/list operation, live feedback and non-color cues checked.
- [ ] Long/multiline text, 320px width, zoom and wrapping do not clip/overlap/overflow.
- [ ] Screenshot artifacts link to actual tests/manual checks; unexecuted items remain unchecked.

Mockup cards, shortcuts and example counts inform layout; they do not mandate unapproved features or substitute for the metric/authorization contracts.
