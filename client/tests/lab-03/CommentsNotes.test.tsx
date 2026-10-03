import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StaffTicketDetail } from '../../src/pages/StaffTicketDetail';
import { TicketDetail } from '../../src/pages/TicketDetail';
import { AuthProvider } from '../../src/context/AuthContext';
import { RequesterProvider } from '../../src/context/RequesterContext';

describe('UI-05: Tabbed Comments, Internal Notes & Requester Resolution', () => {
  const staffUser = {
    id: 2,
    name: 'Alex Thompson',
    email: 'alex@toktickit.local',
    role: 'IT_STAFF',
    isActive: true,
    isPasswordChangeRequired: false,
  };

  const requesterUser = {
    id: 10,
    name: 'John Doe',
    email: 'john@toktickit.local',
    department: 'Operations',
    role: 'REQUESTER',
    isActive: true,
  };

  const mockTicket = {
    id: 101,
    ticketNumber: 'TKT-2026-000101',
    summary: 'Core switch uplink flap',
    description: 'Switch port 24 on core switch drops packet periodically.',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    status: 'IN_PROGRESS',
    categoryId: 1,
    category: { id: 1, name: 'Network' },
    relatedSystemId: 1,
    relatedSystem: { id: 1, name: 'Core Network Switch' },
    requesterId: 10,
    requester: { id: 10, name: 'John Doe', email: 'john@toktickit.local', department: 'Operations' },
    ownerId: 2,
    owner: { id: 2, name: 'Alex Thompson', email: 'alex@toktickit.local' },
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T09:00:00.000Z',
    attachments: [],
    activeAttachmentsCount: 0,
  };

  const mockComments = [
    {
      id: 1,
      ticketId: 101,
      content: 'Can you provide the switch MAC address table?',
      createdAt: '2026-09-15T08:15:00.000Z',
      author: { id: 2, name: 'Alex Thompson', email: 'alex@toktickit.local', role: 'IT_STAFF' },
    },
    {
      id: 2,
      ticketId: 101,
      content: 'MAC table attached in the attachments tab.',
      createdAt: '2026-09-15T08:30:00.000Z',
      author: { id: 10, name: 'John Doe', email: 'john@toktickit.local', role: 'REQUESTER' },
    },
  ];

  const mockNotes = [
    {
      id: 1,
      ticketId: 101,
      content: 'Core switch ASIC is heating up. Scheduled fan replacement.',
      createdAt: '2026-09-15T08:45:00.000Z',
      author: { id: 2, name: 'Alex Thompson', email: 'alex@toktickit.local', role: 'IT_STAFF' },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('UI-05: Staff view renders distinct Public Comments and Amber Internal Notes tabs', async () => {
    const user = userEvent.setup();
    localStorage.setItem('toktickit_auth_token', 'mock_staff_token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(staffUser));

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/staff/tickets/101')) {
        return Promise.resolve(new Response(JSON.stringify(mockTicket), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/members')) {
        return Promise.resolve(new Response(JSON.stringify([staffUser]), { status: 200 }));
      }
      if (urlStr.includes('/api/tickets/101/comments')) {
        return Promise.resolve(new Response(JSON.stringify(mockComments), { status: 200 }));
      }
      if (urlStr.includes('/api/tickets/101/notes')) {
        return Promise.resolve(new Response(JSON.stringify(mockNotes), { status: 200 }));
      }
      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
    });

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={101} onBack={() => {}} />
      </AuthProvider>
    );

    // Wait for staff ticket detail to load
    await waitFor(() => {
      expect(screen.getByTestId('staff-ticket-detail-container')).toBeInTheDocument();
    });

    // 1. Switch to Public Comments tab
    const commentsTabBtn = screen.getByTestId('tab-comments-btn');
    await user.click(commentsTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('comments-tab-pane')).toBeInTheDocument();
      expect(screen.getByText('Can you provide the switch MAC address table?')).toBeInTheDocument();
      expect(screen.getByText('MAC table attached in the attachments tab.')).toBeInTheDocument();
    });

    // 2. Switch to Internal Notes tab
    const notesTabBtn = screen.getByTestId('tab-notes-btn');
    await user.click(notesTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId('notes-tab-pane')).toBeInTheDocument();
      expect(screen.getByTestId('internal-notes-banner')).toBeInTheDocument();
      expect(screen.getByText('Core switch ASIC is heating up. Scheduled fan replacement.')).toBeInTheDocument();
    });
  });

  it('UI-05: Staff can post public comment and internal note successfully', async () => {
    const user = userEvent.setup();
    localStorage.setItem('toktickit_auth_token', 'mock_staff_token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(staffUser));

    let createdCommentContent = '';
    let createdNoteContent = '';

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/staff/tickets/101')) {
        return Promise.resolve(new Response(JSON.stringify(mockTicket), { status: 200 }));
      }
      if (urlStr.includes('/api/staff/members')) {
        return Promise.resolve(new Response(JSON.stringify([staffUser]), { status: 200 }));
      }
      if (urlStr.includes('/api/tickets/101/comments')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          createdCommentContent = body.content;
          return Promise.resolve(new Response(JSON.stringify({
            id: 3,
            ticketId: 101,
            content: body.content,
            createdAt: new Date().toISOString(),
            author: staffUser,
          }), { status: 201 }));
        }
        return Promise.resolve(new Response(JSON.stringify(mockComments), { status: 200 }));
      }
      if (urlStr.includes('/api/tickets/101/notes')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          createdNoteContent = body.content;
          return Promise.resolve(new Response(JSON.stringify({
            id: 2,
            ticketId: 101,
            content: body.content,
            createdAt: new Date().toISOString(),
            author: staffUser,
          }), { status: 201 }));
        }
        return Promise.resolve(new Response(JSON.stringify(mockNotes), { status: 200 }));
      }
      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
    });

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={101} onBack={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('staff-ticket-detail-container')).toBeInTheDocument();
    });

    // 1. Post Public Comment
    await user.click(screen.getByTestId('tab-comments-btn'));
    const commentInput = screen.getByTestId('public-comment-input');
    await user.type(commentInput, 'Hardware replacement arrives tomorrow morning.');
    await user.click(screen.getByTestId('submit-public-comment-btn'));

    await waitFor(() => {
      expect(createdCommentContent).toBe('Hardware replacement arrives tomorrow morning.');
      expect(screen.getByText('Hardware replacement arrives tomorrow morning.')).toBeInTheDocument();
    });

    // 2. Post Internal Note
    await user.click(screen.getByTestId('tab-notes-btn'));
    const noteInput = screen.getByTestId('internal-note-input');
    await user.type(noteInput, 'Ordered part #C2960-FAN-01 under SLA warranty.');
    await user.click(screen.getByTestId('submit-internal-note-btn'));

    await waitFor(() => {
      expect(createdNoteContent).toBe('Ordered part #C2960-FAN-01 under SLA warranty.');
      expect(screen.getByText('Ordered part #C2960-FAN-01 under SLA warranty.')).toBeInTheDocument();
    });
  });

  it('UI-05: Requester view displays public comments, strictly omits internal notes, and supports problem resolution', async () => {
    const user = userEvent.setup();
    localStorage.setItem('toktickit_auth_token', 'mock_req_token');
    localStorage.setItem('toktickit_auth_user', JSON.stringify(requesterUser));
    localStorage.setItem('toktickit_dev_requester', JSON.stringify(requesterUser));

    let resolvedTriggered = false;

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/tickets/101/indicate-resolved')) {
        resolvedTriggered = true;
        return Promise.resolve(new Response(JSON.stringify({
          id: 101,
          status: 'RESOLVED',
          requesterResolvedIndication: true,
          updatedAt: new Date().toISOString(),
        }), { status: 200 }));
      }
      if (urlStr.includes('/api/tickets/101/comments')) {
        return Promise.resolve(new Response(JSON.stringify(mockComments), { status: 200 }));
      }
      if (urlStr.includes('/api/tickets/101')) {
        return Promise.resolve(new Response(JSON.stringify(mockTicket), { status: 200 }));
      }
      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <TicketDetail ticketId={101} onBack={() => {}} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('requester-ticket-detail-container')).toBeInTheDocument();
    });

    // 1. Verify Public Comments thread is present
    expect(screen.getByTestId('public-comments-section')).toBeInTheDocument();
    expect(screen.getByText('Can you provide the switch MAC address table?')).toBeInTheDocument();

    // 2. Verify Internal Notes tab and banner are STRICTLY ABSENT from DOM (BR-13, AC-04)
    expect(screen.queryByTestId('tab-notes-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('internal-notes-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('internal-note-input')).not.toBeInTheDocument();

    // 3. Problem Appears Resolved button triggers modal and updates status
    const resolveBtn = screen.getByTestId('indicate-resolved-btn');
    expect(resolveBtn).toBeInTheDocument();
    await user.click(resolveBtn);

    // Modal appears
    expect(screen.getByTestId('confirm-resolve-modal')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-resolve-btn'));

    await waitFor(() => {
      expect(resolvedTriggered).toBe(true);
      expect(screen.getByText('Thank you! Your ticket status has been updated to Resolved.')).toBeInTheDocument();
    });
  });
});

