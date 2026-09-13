# Lab 2 Zen Green UI Specification

**Product:** TokTickIT IT Service Desk  
**Sprint:** Lab 2 — Requester Ticketing MVP  
**Design System:** Zen Green Theme  

---

## 1. Color Palette & Design Tokens

| Token / Element | Color Code | Purpose & Usage |
| :--- | :--- | :--- |
| **Primary Green** | `#006B3C` | App header navbar, primary submission buttons, active badge backgrounds. |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, keyboard focus outlines, hyperlinks, hover states. |
| **Pale Green** | `#EAF6EF` | Active selected rows, subtle card accents, success banners, light badges. |
| **Page Background** | `#F5F7F6` | Default body canvas color for a quiet, comfortable reading backdrop. |
| **Surface / Cards** | `#FFFFFF` | Background for form containers, tables, ticket cards, and modals. |
| **Text (Primary)** | `#1A2E26` | Dark charcoal-green for high contrast body text and headings (avoid pure `#000000`). |
| **Text (Muted)** | `#4A5568` | Secondary labels, timestamps, file sizes, helper hints. |
| **Editable Field** | `#FFFFFF` | Editable inputs and selects with neutral border (`#CBD5E1`). |
| **Read-Only Field** | `#E8EFEA` | Soft gray-green shading for system-generated / read-only fields. |
| **Error Accent** | `#B91C1C` | Dark red border and text for validation error messages placed directly below inputs. |
| **Warning Accent** | `#D97706` | Amber badge for medium priority and attention callouts. |
| **Success Accent** | `#15803D` | Green icon and text for submission confirmation. |

---

## 2. Typography & Form Layout Rules

- **Base Font Family:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Scale:**
  - Page Title: `1.5rem (24px)`, bold (`700`), color `#1A2E26`
  - Section Header / Card Title: `1.25rem (20px)`, semi-bold (`600`)
  - Form Label: `0.875rem (14px)`, medium (`500`), margin-bottom `4px`
  - Body / Input Text: `1rem (16px)`, normal (`400`)
  - Helper & Validation Text: `0.8125rem (13px)`, normal (`400`), placed directly beneath inputs
- **Field Component Heights:** Consistent `40px` (or `2.5rem`) for text inputs, selects, and buttons. Multiline Description uses `120px` minimum height with vertical resizing only.
- **Required Markers:** Required form labels display a red asterisk (`<span class="text-danger">*</span>`).
- **Validation Messages:** Displayed immediately under the specific input element in red (`#B91C1C`).

---

## 3. Button Hierarchy & Interactive States

1. **Primary Action** (e.g., `Submit Ticket`, `Continue`):
   - Background `#006B3C`, text `#FFFFFF`, rounded `6px`.
   - Hover: `#0B7A46`.
   - Busy / Loading: Disabled, cursor `not-allowed`, shows animated spinner with text `"Submitting..."`.
2. **Secondary Action** (e.g., `Clear Filters`, `Cancel`):
   - Background transparent / white, border `1px solid #CBD5E1`, text `#1A2E26`.
   - Hover: Background `#F1F5F9`.
3. **Destructive Action** (e.g., `Soft Remove Attachment`):
   - Background `#FEE2E2`, border `1px solid #FCA5A5`, text `#B91C1C`.
   - Hover: Background `#FCD34D`.
4. **Disabled State**:
   - Opacity `0.5`, background `#E2E8F0`, text `#94A3B8`, cursor `not-allowed`.

---

## 4. Application Shell & Navigation

- **Navbar Header:**
  - Background: `#006B3C`, text white.
  - Left: TokTickIT logo icon + title `"TokTickIT"`.
  - Center/Nav: Links for `"My Tickets"` and `"+ Create Ticket"` with active page indicator (underlined in pale green `#EAF6EF`).
  - Right: Development Requester display badge (e.g., `"Requester: Jennifer Anderson"`) and a `"Change Requester"` button/link.
- **Unselected Requester Behavior:**
  - If no requester is selected, any attempt to visit ticket screens automatically presents the Development Requester Selector modal or redirects to the selector page.

---

## 5. Screen Specifications

### 5.1. Development Requester Selector Screen
- **Card Container:** Centered card on `#F5F7F6` canvas, max-width `480px`.
- **Icon / Avatar:** Green user avatar icon at top center.
- **Title:** `"Select Development Requester"`.
- **Notice Banner:** Pale green callout explaining: *"This selector is used for Lab 2 testing only to simulate requester context. Authentication and role-based access will be introduced in Lab 3."*
- **Dropdown Control:** Populated dynamically from `GET /api/requesters` (only active requesters).
- **Controls:** `Continue` button (disabled until a user is picked) and `Cancel` button.

---

### 5.2. Create Ticket Screen
- **Container:** Centered form card, max-width `900px`.
- **Top Section (System Info - Read-only):**
  - **Ticket No:** Shows placeholder `[Generated after submission]` on `#E8EFEA` background.
  - **Ticket Date:** Current date (e.g., `September 4, 2026 08:30 AM`) on `#E8EFEA` background.
  - **Requester:** Active user name (e.g., `Jennifer Anderson`) on `#E8EFEA` background.
- **Middle Section (Classification & Content - Editable):**
  - **Category Select:** Dropdown (Account and Access, Hardware, Software, Network).
  - **Related System Select:** Dropdown (Corporate Laptop, Email, Wi-Fi, etc.).
  - **Requested Priority:** Dropdown (`Low`, `Medium`, `High`, `Critical`).
  - **Summary Input:** Single line text input with character limit indicator (`0/100`).
  - **Description Input:** Multiline textarea with character limit indicator (`0/2000`).
- **Bottom Section (Attachment Uploader):**
  - Drag-and-drop dropzone or browse button.
  - Allowed hint: *"Accepted files: JPG, PNG, WEBP, PDF (Max 5 MB each, up to 5 files)"*.
  - Selected files list: Displays filename, file size, format, and a `Remove` button before submitting.
- **Actions:**
  - `Cancel` button (navigates back to My Tickets).
  - `Submit Ticket` button (primary green, shows spinner while processing).

---

### 5.3. My Tickets Screen
- **Header:** Title `"My Tickets"` + subtitle `"View and track all of your support requests."` + `"+ Create Ticket"` button.
- **Filter Toolbar:**
  - Keyword search input with search icon (searches Ticket No and Summary).
  - Category dropdown filter (`All Categories` default).
  - Priority dropdown filter (`All Priorities` default).
  - Status dropdown filter (`All Statuses` default).
  - `Clear Filters` button (resets all controls).
- **Desktop Table View (≥992px):**
  - Columns: `Ticket No.`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `IT Priority`, `Current Status`, `Last Updated`.
  - Priority Badges:
    - Low: Pale blue (`#E0F2FE`, text `#0369A1`)
    - Medium: Amber (`#FEF3C7`, text `#B45309`)
    - High / Critical: Light red (`#FEE2E2`, text `#B91C1C`)
  - Status Badges:
    - New: Pale green (`#EAF6EF`, text `#006B3C`)
    - In Progress: Light amber (`#FEF3C7`, text `#D97706`)
    - Resolved / Closed: Light gray (`#F1F5F9`, text `#475569`)
  - Row Hover: Subtle highlight (`#F8FAFC`); clicking row opens Ticket Detail.
- **Mobile Card View (<768px):**
  - Individual ticket card with Ticket No, Badges on top row, Summary in bold, Category and Last Updated at bottom.
- **Empty vs. No-Results States:**
  - **Empty State (User has 0 tickets created):** Friendly icon + *"You haven't submitted any support tickets yet."* + `Submit your first ticket` button.
  - **No-Results State (Filters matched 0 items):** Search icon + *"No tickets match your filter criteria."* + `Clear Filters` button.
- **Pagination Bar:**
  - Summary: `"Showing 1 to 8 of 24 tickets"`.
  - Controls: `Previous`, page number buttons, `Next`.

---

### 5.4. Requester Ticket Detail Screen
- **Back Navigation:** `"← Back to My Tickets"` link.
- **Header Overview (Read-Only):**
  - Clean 3-column / 4-row read-only grid with `#E8EFEA` background for all metadata (Ticket No, Date, Category, Related System, Requester, Priorities, Current Status).
  - Summary and Full Description blocks.
- **Attachment Section (`AttachmentSection.tsx`):**
  - Counter badge: e.g., `"Attachments (3)"`.
  - `+ Add Attachment` button (disabled if active attachments == 5).
  - Table / List of Attachments:
    - **Active Attachment Row:** Original filename, size, upload date, `Download` link button, `Remove` button.
    - **Removed Attachment Row:** Strikethrough filename, `(Removed)` red badge, removed timestamp, displayed `Removal Reason: "..."`, **Download button disabled/removed**.
- **Soft-Remove Confirmation Modal:**
  - Title: `"Remove Attachment"`.
  - Message: *"Are you sure you want to remove this attachment? Soft-removed attachments cannot be downloaded."*
  - Required Field: `Removal Reason` textarea (min 3 characters).
  - Actions: `Cancel` and `Confirm Removal` (destructive red).

---

## 6. Responsive Breakpoints & Viewport Rules

| Viewport | Range | Layout & Behavior |
| :--- | :--- | :--- |
| **Desktop** | `≥ 992px` | Full multi-column grid, expanded horizontal data table, fixed centered content width (`max-width: 1200px`). |
| **Tablet** | `768px – 991px` | 2-column form grids, condensed table or horizontal scroll with clear affordance, touch-accessible buttons. |
| **Mobile** | `< 768px` | 1-column vertically stacked form controls, table converted to stacked Ticket Cards, navigation collapses or uses mobile-friendly layout, zero horizontal page scroll. |

---

## 7. Visual Checklist & Screenshot Plan

The following screenshots must be captured in `artifacts/lab-02/screenshots/`:

1. **`create-ticket/`**:
   - `01-create-initial-desktop.png`: Blank Create form with read-only fields populated.
   - `02-create-validation-errors.png`: Field-level error messages directly below invalid fields.
   - `03-create-file-upload-valid-invalid.png`: Selected files showing size/type validation.
   - `04-create-submitting-busy.png`: Disabled button showing spinner and "Submitting...".
   - `05-create-success-dialog.png`: Confirmation showing generated Ticket Number (`TKT-YYYY-XXXXXX`).
   - `06-create-api-failure-preserved.png`: Form values preserved after simulated network error.
2. **`my-tickets/`**:
   - `01-my-tickets-desktop-table.png`: Full desktop table with Zen Green badges.
   - `02-my-tickets-mobile-cards.png`: Mobile viewport view displaying cards without overflow.
   - `03-my-tickets-search-filter.png`: Active search keyword and category filter applied.
   - `04-my-tickets-no-results.png`: Filter resulting in 0 matches with Clear Filters button.
   - `05-my-tickets-empty-state.png`: Requester with no tickets showing empty state.
   - `06-my-tickets-requester-switch.png`: Showing ticket isolation before and after switching users.
3. **`ticket-detail/`**:
   - `01-ticket-detail-view.png`: Read-only layout and metadata grid.
   - `02-ticket-detail-add-attachment.png`: Uploading additional file to existing ticket.
   - `03-ticket-detail-soft-remove-modal.png`: Modal prompting for required removal reason.
   - `04-ticket-detail-removed-state.png`: Strikethrough removed file with reason; no download button.
   - `05-ticket-detail-unauthorized.png`: Direct URL access rejected for another user's ticket.

