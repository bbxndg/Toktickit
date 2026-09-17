# Lab 3 Zen Green UI Specification

**Product:** TokTickIT IT Service Desk  
**Sprint:** Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens  
**Design System:** Zen Green Theme  

---

## 1. Color Palette & Design Tokens

| Token / Element | Color Code | Purpose & Usage |
| :--- | :--- | :--- |
| **Primary Green** | `#006B3C` | App header navbar, primary actions, active status badges, brand identity. |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, focus rings, hover states on primary actions. |
| **Pale Green** | `#EAF6EF` | Selected rows, subtle card accents, success banners, Requester role badge. |
| **Page Background** | `#F5F7F6` | Default page canvas for comfortable, low-glare readability. |
| **Surface / Cards** | `#FFFFFF` | Background for tables, ticket cards, modals, and input fields. |
| **Text (Primary)** | `#1A2E26` | Dark charcoal-green for high contrast body text and headings. |
| **Text (Muted)** | `#52635B` | Labels, timestamps, secondary notes, helper text. |
| **Editable Field** | `#FFFFFF` | Form inputs and select dropdowns with border `#D1D9D4`. |
| **Read-Only Field** | `#E8EFEA` | Soft gray-green shading for system-locked fields. |
| **Public Comment Box** | `#FFFFFF` / `#EAF6EF` | Clean, open conversation thread with pale green accent. |
| **Internal Note Box** | `#FEF3C7` / `#B45309` | Warm amber background with left border `4px solid #D97706` marked "Confidential Internal Note". |
| **Error Accent** | `#B91C1C` | Red border and text for validation errors and destructive actions. |
| **Warning Accent** | `#D97706` | Amber badges for Medium/In-Progress states and safety alerts. |

### Role Badges
- **Requester**: `.badge-zg-role-requester` (Background `#EAF6EF`, Text `#006B3C`, Border `#C4E6D2`).
- **IT Staff**: `.badge-zg-role-staff` (Background `#E0F2FE`, Text `#0369A1`, Border `#BAE6FD`).
- **Administrator**: `.badge-zg-role-admin` (Background `#F3E8FF`, Text `#6B21A8`, Border `#E9D5FF`).

### Status Badges
- **NEW**: `.badge-zg-status-new` (Pale Green / Dark Green text).
- **OPEN**: `.badge-zg-status-open` (Light Blue / Dark Blue text).
- **IN_PROGRESS**: `.badge-zg-status-inprogress` (Amber / Dark Amber text).
- **WAITING_FOR_REQUESTER**: `.badge-zg-status-waiting` (Light Purple / Dark Purple text).
- **RESOLVED**: `.badge-zg-status-resolved` (Light Green / Dark Green text).
- **CLOSED**: `.badge-zg-status-closed` (Light Gray / Dark Gray text).
- **REOPENED**: `.badge-zg-status-reopened` (Orange / Dark Orange text).
- **CANCELLED**: `.badge-zg-status-cancelled` (Light Red / Dark Red text).

---

## 2. Application Shell & Role-Based Navigation

The top navigation bar (`.zg-navbar`) adapts dynamically to the authenticated user's role:

```
+---------------------------------------------------------------------------------------+
| 🎫 TokTickIT    [Nav Tab 1]  [Nav Tab 2]          [👤 Jennifer Anderson | Role] [Sign Out] |
+---------------------------------------------------------------------------------------+
```

### Role Navigation Matrix
- **Requester**:
  - Tab 1: `📋 My Tickets`
  - Tab 2: `➕ Create Ticket`
- **IT Staff**:
  - Tab 1: `📥 Ticket Queue`
  - Tab 2: `➕ Create Ticket`
- **Administrator**:
  - Tab 1: `👥 User Management`
  - Tab 2: (Optional ticket queue if dual-role authorized, otherwise strictly User Management)

### User Identity Pill
- Located at top right of the navbar.
- Displays user icon, full name, and role badge.
- Includes a clear `[ Sign Out ]` button that invalidates the session and redirects to `/login`.

---

## 3. Screen Specifications

### Screen 1: Login & Mandatory First-Login Password Change

#### 1.1 Login Screen (`/login`)
- **Layout**: Centered card (`max-width: 440px`) on `var(--zg-bg)` background with TokTickIT logo and header.
- **Fields**:
  - Email Address (`type="email"`, auto-focus, placeholder `name@company.com`).
  - Password (`type="password"`, toggle-visibility icon).
- **Actions**: `[ Sign In ]` primary button (shows spinner and disables when busy).
- **Error Feedback**: Alert box beneath fields: `"Invalid email address or password. Please try again."` (safe generic response to prevent account enumeration).

#### 1.2 Mandatory Password Change Screen / Modal
- **Trigger**: Appears automatically upon successful login when `user.isPasswordChangeRequired = true`. Normal application views are completely blocked.
- **Header**: `"Set New Password"` with callout: *"You are signing in with an initial temporary password. You must set a new secure password before continuing."*
- **Fields**:
  - Current Password (pre-filled or prompted).
  - New Password (`type="password"`).
  - Confirm New Password (`type="password"`).
- **Password Requirement Checklist** (real-time checkmarks):
  - [x] At least 8 characters
  - [x] At least one uppercase letter (A–Z)
  - [x] At least one lowercase letter (a–z)
  - [x] At least one numeric digit (0–9)
  - [x] At least one special symbol (!@#$%^&*...)
- **Action**: `[ Save Password & Continue ]` primary button.

---

### Screen 2: IT Staff Ticket Queue

- **Layout**: Full-width container with responsive header, filter toolbar, ticket table (desktop), ticket cards (mobile), and pagination footer.
- **Queue Summary Bar**:
  - Chips showing live counts: `All (42)`, `Unassigned (8)`, `In Progress (14)`, `Waiting for Requester (5)`.
- **Filter Toolbar**:
  - Search input: Live search with 300ms debounce across Ticket Number and Summary.
  - Dropdowns: Category, Requested Priority, IT Priority, Status, Ticket Owner.
  - Sort selector: Newest first, Priority (Critical to Low), Last Updated.
  - Action: `[ 🔄 Clear Filters ]` button when any filter is active.
- **Desktop Table View (≥ 768px)**:
  - Columns: Ticket No, Created Date, Summary & System, Category, Req. Priority, IT Priority, Status, Owner, Action (`View Detail`).
  - Hover highlight on rows (`var(--zg-pale)`).
- **Mobile Card View (< 768px)**:
  - Stacked cards with Ticket Number, Status pill, Summary, Owner pill, and timestamp.
- **Pagination Footer**:
  - Predictable fixed-window pagination (`‹ Previous [1] [2] [3] [4] [5] ... [18] Next ›`).

---

### Screen 3: IT Staff Ticket Detail & Operational Workflow

- **Header Bar**:
  - Breadcrumb: `Ticket Queue > TKT-2026-000105`.
  - Button: `← Back to Queue`.
- **Operational Action Strip**:
  - **Ticket Owner**: Dropdown displaying active IT Staff and Administrators, plus a quick `[ Claim Ticket ]` button if unassigned.
  - **IT Priority**: Select dropdown (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - **Ticket Status**: Select dropdown showing only permitted transitions per BR-10, with a confirmation modal for terminal states (`RESOLVED`, `CLOSED`, `CANCELLED`).
- **Ticket Details Section**:
  - Read-only card with Ticket Number, Requester name/department, Created Date, Category, Related System, Summary, and Description.
- **Tabbed Interaction Section**:
  - **Tab 1: Public Comments (`💬 Public Comments (3)`)**:
    - Thread of chronologically ordered messages visible to Requester and Staff.
    - Each message displays Author Name, Role pill (`Requester` or `IT Staff`), and timestamp.
    - Textarea to post new Public Comment with `[ 📨 Post Public Comment ]` button.
  - **Tab 2: Internal Notes (`🔒 Internal Notes (2)`)**:
    - Amber-accented thread marked with lock icon: *"Internal operational notes. Never visible to Requesters."*
    - Author Name, timestamp, and note content.
    - Textarea with `[ 🔒 Save Internal Note ]` button.
  - **Tab 3: Attachments (`📎 Attachments (2 active / 5)`)**:
    - Active attachments with download links.
    - Soft-removed attachment history with removal reasons.

---

### Screen 4: Requester Ticket Detail Extensions

- **Lab 2 Continuity**: Maintains read-only view of ticket fields and attachment management.
- **Public Comments Tab**: Requesters see the full public conversation with IT Staff and can post new replies. (Internal Notes tab is strictly omitted from the DOM).
- **"Problem Appears Resolved" Action**:
  - Prominent button in header: `[ ✅ Problem Appears Resolved ]`.
  - Visible when ticket is `IN_PROGRESS` or `WAITING_FOR_REQUESTER`.
  - Clicking prompts confirmation: *"Confirm that your issue has been resolved?"*. Once confirmed, status transitions to `RESOLVED` and notifies staff.

---

### Screen 5: Administrator User Management

- **Layout**: Clean user directory table with search, role filter, and "+ Create User" header action.
- **User Directory Table**:
  - Columns: Full Name, Email Address, Role (colored pill), Status (`Active` green pill / `Inactive` gray pill), Actions (`[ Edit ]` button).
- **Create User Modal**:
  - Modal title: `"Create New User Account"`.
  - Fields: Full Name, Email Address, Role dropdown (`Requester`, `IT Staff`, `Administrator`), Initial Password field, Active toggle switch (default: Yes).
  - Note: *"The user will be required to set a new password on their first login."*
  - Buttons: `[ Cancel ]`, `[ Create User ]`.
- **Edit User Modal**:
  - Modal title: `"Edit User: [Name]"`.
  - Fields: Full Name, Email Address, Role dropdown, Active toggle switch.
  - **Reset Initial Password Section**:
    - Button: `[ 🔑 Set New Initial Password ]`.
    - Expands input for new temporary password.
  - **Safety Protections**:
    - If user is the currently logged-in Administrator: Active toggle is disabled with hint: *"You cannot deactivate your own administrator account."*
    - If user is the only active Administrator: Role dropdown and Active toggle are disabled with hint: *"At least one active Administrator must remain in the system."*
  - Buttons: `[ Cancel ]`, `[ Save Changes ]`.

---

## 4. Responsive & Accessibility Rules

- **Responsive Viewports**:
  - Desktop (≥ 992px): Multi-column layouts, full data tables, side-by-side action bars.
  - Tablet (768px – 991px): Adaptive 2-column forms, scrollable tables, wrapped navbar.
  - Mobile (< 768px): Single-column stacked forms, card view for tickets, centered stacked navbar, touch targets ≥ 40px.
- **Accessibility (a11y)**:
  - Form labels explicitly linked to inputs with `htmlFor` and `id`.
  - Semantic HTML headings (`<h1>` through `<h6>`).
  - Keyboard focus rings (`outline: 2px solid var(--zg-secondary); outline-offset: 2px`).
  - ARIA attributes: `aria-expanded`, `aria-label`, `aria-modal="true"` for dialogs.

