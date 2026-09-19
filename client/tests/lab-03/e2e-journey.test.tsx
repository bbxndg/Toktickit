import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('Lab 3 End-to-End User Journeys (E2E)', () => {
  const mockRequester = {
    id: 1,
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@toktickit.local',
    department: 'Human Resources',
    role: 'REQUESTER',
    isActive: true,
    isPasswordChangeRequired: false,
  };

  const mockStaff = {
    id: 2,
    name: 'Alex Thompson',
    email: 'alex.thompson@toktickit.local',
    department: 'IT Support',
    role: 'IT_STAFF',
    isActive: true,
    isPasswordChangeRequired: false,
  };

  const mockAdmin = {
    id: 3,
    name: 'Root Administrator',
    email: 'admin@toktickit.local',
    department: 'IT Operations',
    role: 'ADMINISTRATOR',
    isActive: true,
    isPasswordChangeRequired: false,
  };

  const mockCategories = [
    { id: 1, name: 'Account and Access' },
    { id: 2, name: 'Hardware' },
    { id: 3, name: 'Software' },
  ];

  const mockSystems = [
    { id: 1, name: 'Corporate Laptop' },
    { id: 2, name: 'Email Server' },
    { id: 3, name: 'VPN Gateway' },
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // ============================================================================
  // E2E-01: Full Auth Journey (Initial Password -> Mandatory Change Modal -> Shell)
  // ============================================================================
  it('E2E-01: Full Auth Flow: Initial Password Login -> Mandatory Change Modal -> Application Shell', async () => {
    const user = userEvent.setup();

    const tempUser = {
      id: 5,
      name: 'Temp Newbie',
      email: 'newbie@toktickit.local',
      role: 'REQUESTER',
      department: 'Marketing',
      isActive: true,
      isPasswordChangeRequired: true,
    };

    let passwordChanged = false;

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();

      // Auth /me sync
      if (urlStr.includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify(passwordChanged ? { ...tempUser, isPasswordChangeRequired: false } : tempUser), { status: 200 }));
      }

      // POST /api/auth/login
      if (urlStr.includes('/api/auth/login')) {
        return Promise.resolve(new Response(JSON.stringify({
          token: 'jwt_temp_user_token',
          user: tempUser,
        }), { status: 200 }));
      }

      // POST /api/auth/change-password
      if (urlStr.includes('/api/auth/change-password')) {
        passwordChanged = true;
        return Promise.resolve(new Response(JSON.stringify({
          message: 'Password changed successfully',
          user: { ...tempUser, isPasswordChangeRequired: false },
        }), { status: 200 }));
      }

      // GET /api/tickets
      if (urlStr.includes('/api/tickets')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } }), { status: 200 }));
      }
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve(new Response(JSON.stringify([tempUser]), { status: 200 }));
      }

      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<App />);

    // 1. Initial view is Login Form
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    await user.type(screen.getByTestId('login-email-input'), 'newbie@toktickit.local');
    await user.type(screen.getByTestId('login-password-input'), 'TempPass123!');
    await user.click(screen.getByTestId('login-submit-button'));

    // 2. Mandatory Password Change modal automatically blocks the interface
    await waitFor(() => {
      expect(screen.getByTestId('change-password-modal')).toBeInTheDocument();
    });

    // 3. Fill in password change fields
    await user.type(screen.getByTestId('current-password-input'), 'TempPass123!');
    await user.type(screen.getByTestId('new-password-input'), 'CompliantPass123!');
    await user.type(screen.getByTestId('confirm-password-input'), 'CompliantPass123!');

    await user.click(screen.getByTestId('change-password-submit-btn'));

    // 4. Modal closes and user enters authenticated application shell
    await waitFor(() => {
      expect(passwordChanged).toBe(true);
      expect(screen.queryByTestId('change-password-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-identity-badge')).toBeInTheDocument();
      expect(screen.getByText('Temp Newbie')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // E2E-02: IT Staff Ticket Flow (Queue -> Claim -> Prioritize -> Note & Comment)
  // ============================================================================
  it('E2E-02: IT Staff Ticket Flow: Queue -> Claim -> Set Priority -> Save Note -> Post Comment', async () => {
    const user = userEvent.setup();
    localStorage.setItem('toktickit_auth_token', 'jwt_staff_token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(mockStaff));

    let activeTicket = {
      id: 201,
      ticketNumber: 'TKT-2026-000201',
      summary: 'Printer spooler crash on Floor 3',
      description: 'Network printer queues are stuck in error state.',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      status: 'NEW',
      categoryId: 2,
      category: { id: 2, name: 'Hardware' },
      relatedSystemId: 1,
      relatedSystem: { id: 1, name: 'Corporate Laptop' },
      requesterId: 1,
      requester: mockRequester,
      ownerId: null,
      owner: null,
      createdAt: '2026-09-18T08:00:00.000Z',
      updatedAt: '2026-09-18T08:00:00.000Z',
      attachments: [],
      activeAttachmentsCount: 0,
    };

    let publicCommentsList: any[] = [];
    let internalNotesList: any[] = [];

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();

      // Auth /me sync
      if (urlStr.includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify(mockStaff), { status: 200 }));
      }

      // GET /api/staff/tickets (Queue)
      if (urlStr.includes('/api/staff/tickets?')) {
        return Promise.resolve(new Response(JSON.stringify({
          data: [activeTicket],
          pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
          queueCounts: { total: 1, unassigned: 1, open: 0, inProgress: 0, waitingForRequester: 0 },
        }), { status: 200 }));
      }

      // GET /api/staff/tickets/201 (Detail)
      if (urlStr.includes('/api/staff/tickets/201')) {
        return Promise.resolve(new Response(JSON.stringify(activeTicket), { status: 200 }));
      }

      // PATCH /api/staff/tickets/201/claim
      if (urlStr.includes('/api/staff/tickets/201/claim')) {
        activeTicket = { ...activeTicket, ownerId: mockStaff.id, owner: mockStaff, status: 'OPEN' };
        return Promise.resolve(new Response(JSON.stringify(activeTicket), { status: 200 }));
      }

      // PATCH /api/staff/tickets/201/priority
      if (urlStr.includes('/api/staff/tickets/201/priority')) {
        const body = JSON.parse(init?.body as string);
        activeTicket = { ...activeTicket, itPriority: body.itPriority };
        return Promise.resolve(new Response(JSON.stringify(activeTicket), { status: 200 }));
      }

      // GET & POST comments
      if (urlStr.includes('/api/tickets/201/comments')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init?.body as string);
          const c = { id: publicCommentsList.length + 1, ticketId: 201, content: body.content, createdAt: new Date().toISOString(), author: mockStaff };
          publicCommentsList.push(c);
          return Promise.resolve(new Response(JSON.stringify(c), { status: 201 }));
        }
        return Promise.resolve(new Response(JSON.stringify(publicCommentsList), { status: 200 }));
      }

      // GET & POST notes
      if (urlStr.includes('/api/tickets/201/notes')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init?.body as string);
          const n = { id: internalNotesList.length + 1, ticketId: 201, content: body.content, createdAt: new Date().toISOString(), author: mockStaff };
          internalNotesList.push(n);
          return Promise.resolve(new Response(JSON.stringify(n), { status: 201 }));
        }
        return Promise.resolve(new Response(JSON.stringify(internalNotesList), { status: 200 }));
      }

      // Staff members & metadata
      if (urlStr.includes('/api/staff/members')) {
        return Promise.resolve(new Response(JSON.stringify([mockStaff]), { status: 200 }));
      }
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve(new Response(JSON.stringify([mockRequester]), { status: 200 }));
      }

      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<App />);

    // 1. Staff lands on Ticket Queue
    await waitFor(() => {
      expect(screen.getByTestId('staff-ticket-queue')).toBeInTheDocument();
      expect(screen.getAllByText('Printer spooler crash on Floor 3')[0]).toBeInTheDocument();
    });

    // 2. Click ticket row to open detail
    const ticketRow = screen.getByTestId('staff-queue-row-201');
    await user.click(ticketRow);

    // 3. Claim Ticket
    await waitFor(() => {
      expect(screen.getByTestId('staff-ticket-detail-container')).toBeInTheDocument();
    });
    const claimBtn = screen.getByTestId('claim-ticket-btn');
    await user.click(claimBtn);

    // 4. Update IT Priority to HIGH
    await waitFor(() => {
      expect(screen.getByTestId('it-priority-select')).toBeInTheDocument();
    });
    const prioritySelect = screen.getByTestId('it-priority-select');
    await user.selectOptions(prioritySelect, 'HIGH');

    // 5. Post Internal Note
    await user.click(screen.getByTestId('tab-notes-btn'));
    await user.type(screen.getByTestId('internal-note-input'), 'Restarted Windows Spooler service on print server 02.');
    await user.click(screen.getByTestId('submit-internal-note-btn'));

    await waitFor(() => {
      expect(internalNotesList.length).toBe(1);
      expect(screen.getByText('Restarted Windows Spooler service on print server 02.')).toBeInTheDocument();
    });

    // 6. Post Public Comment
    await user.click(screen.getByTestId('tab-comments-btn'));
    await user.type(screen.getByTestId('public-comment-input'), 'The printer queue has been cleared. Please test sending a print job.');
    await user.click(screen.getByTestId('submit-public-comment-btn'));

    await waitFor(() => {
      expect(publicCommentsList.length).toBe(1);
      expect(screen.getByText('The printer queue has been cleared. Please test sending a print job.')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // E2E-03: Administrator Flow (Create User -> Safety Alert Checks)
  // ============================================================================
  it('E2E-03: Administrator Flow: Manage Users -> Create Account -> Verify Safety Rules', async () => {
    const user = userEvent.setup();
    localStorage.setItem('toktickit_auth_token', 'jwt_admin_token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(mockAdmin));

    let usersList = [mockRequester, mockStaff, mockAdmin];

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();

      // Auth /me sync
      if (urlStr.includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify(mockAdmin), { status: 200 }));
      }

      // Requesters context sync
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve(new Response(JSON.stringify([mockRequester]), { status: 200 }));
      }

      // GET /api/admin/users
      if (urlStr.includes('/api/admin/users')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          const newUser = {
            id: usersList.length + 1,
            name: body.name,
            email: body.email,
            role: body.role,
            isActive: body.isActive ?? true,
            isPasswordChangeRequired: true,
          };
          usersList.push(newUser);
          return Promise.resolve(new Response(JSON.stringify(newUser), { status: 201 }));
        }
        return Promise.resolve(new Response(JSON.stringify(usersList), { status: 200 }));
      }

      return Promise.reject(new Error(`Unhandled: ${urlStr}`));
    });

    render(<App />);

    // 1. Admin lands on User Management directory
    await waitFor(() => {
      expect(screen.getByTestId('user-management-screen')).toBeInTheDocument();
      expect(screen.getByText('admin@toktickit.local')).toBeInTheDocument();
      expect(screen.getByText(/Jennifer Anderson/)).toBeInTheDocument();
    });

    // 2. Open Add User Modal and create new IT Staff user
    await user.click(screen.getByTestId('create-user-btn'));
    expect(screen.getByTestId('create-user-modal')).toBeInTheDocument();

    await user.type(screen.getByTestId('create-user-name'), 'Sarah Connor');
    await user.type(screen.getByTestId('create-user-email'), 'sarah@toktickit.local');
    await user.selectOptions(screen.getByTestId('create-user-role'), 'IT_STAFF');
    await user.type(screen.getByTestId('create-user-password'), 'InitialPass123!');
    await user.click(screen.getByTestId('create-user-submit'));

    await waitFor(() => {
      expect(screen.queryByTestId('create-user-modal')).not.toBeInTheDocument();
      expect(screen.getAllByText(/Sarah Connor/)[0]).toBeInTheDocument();
    });

    // 3. Open Edit Modal on currently logged-in Administrator account (Safety checks: BR-17, BR-18)
    const editAdminBtn = screen.getByTestId(`edit-user-btn-${mockAdmin.id}`);
    await user.click(editAdminBtn);

    expect(screen.getByTestId('edit-user-modal')).toBeInTheDocument();
    // Verify safety alert is shown explaining self-deactivation is disabled
    expect(screen.getByTestId('self-edit-alert')).toBeInTheDocument();
    const activeToggle = screen.getByTestId('edit-user-active-toggle') as HTMLInputElement;
    expect(activeToggle.disabled).toBe(true);
  });
});
