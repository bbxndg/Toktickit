import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

const mockRequester1 = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@toktickit.local',
  department: 'Human Resources',
  isActive: true,
};

const mockRequester2 = {
  id: 2,
  name: 'Michael Brown',
  email: 'michael.brown@toktickit.local',
  department: 'Engineering',
  isActive: true,
};

const mockCategories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
  { id: 3, name: 'Software' },
];

const mockSystems = [
  { id: 1, name: 'Corporate Laptop' },
  { id: 2, name: 'Email' },
  { id: 4, name: 'VPN' },
];

describe('Lab 2 End-to-End User Journeys (E2E)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_dev_requester', JSON.stringify(mockRequester1));
    vi.restoreAllMocks();
  });

  it('E2E-01: Full Creation & Listing Journey: Create Ticket -> Success Screen -> My Tickets Table -> Requester Isolation', async () => {
    const user = userEvent.setup();

    let serverTickets: any[] = [];

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();

      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
      }
      if (urlStr.includes('/api/requesters')) {
        return Promise.resolve(new Response(JSON.stringify([mockRequester1, mockRequester2]), { status: 200 }));
      }

      // POST /api/tickets
      if (urlStr.includes('/api/tickets') && init?.method === 'POST') {
        const createdTicket = {
          id: 101,
          ticketNumber: 'TKT-2026-000001',
          summary: 'Urgent Laptop Screen Replacement',
          description: 'The laptop display has multiple vertical lines and flickers continuously.',
          requestedPriority: 'HIGH',
          itPriority: 'HIGH',
          status: 'NEW',
          requesterId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: { id: 2, name: 'Hardware' },
          relatedSystem: { id: 1, name: 'Corporate Laptop' },
          activeAttachmentsCount: 0,
        };
        serverTickets.push(createdTicket);
        return Promise.resolve(new Response(JSON.stringify(createdTicket), { status: 201 }));
      }

      // GET /api/tickets
      if (urlStr.includes('/api/tickets')) {
        const isUser1 = urlStr.includes('requesterId=1');
        const data = isUser1 ? serverTickets : [];
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data,
              pagination: { page: 1, pageSize: 8, totalItems: data.length, totalPages: 1 },
            }),
            { status: 200 }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    render(<App />);

    // Step 1: Initial empty state for Jennifer
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    // Step 2: Click "+ Create Ticket" button
    const createBtn = screen.getByTestId('empty-create-ticket-btn');
    await user.click(createBtn);

    // Step 3: Fill in ticket creation form
    await waitFor(() => {
      expect(screen.getByTestId('ticket-summary-input')).toBeInTheDocument();
    });

    const summaryInput = screen.getByTestId('ticket-summary-input');
    const descInput = screen.getByTestId('ticket-description-input');
    const prioritySelect = screen.getByTestId('priority-select');

    await user.type(summaryInput, 'Urgent Laptop Screen Replacement');
    await user.type(descInput, 'The laptop display has multiple vertical lines and flickers continuously.');
    await user.selectOptions(prioritySelect, 'HIGH');

    // Step 4: Submit ticket
    const submitBtn = screen.getByTestId('submit-ticket-btn');
    await user.click(submitBtn);

    // Step 5: Verify success screen with generated Ticket Number
    await waitFor(() => {
      expect(screen.getByText('Ticket Created Successfully')).toBeInTheDocument();
      expect(screen.getByTestId('generated-ticket-number')).toHaveTextContent('TKT-2026-000001');
    });

    // Step 6: Navigate back to My Tickets via "View in My Tickets"
    const viewMyTicketsBtn = screen.getByTestId('view-my-tickets-btn');
    await user.click(viewMyTicketsBtn);

    // Step 7: Verify newly created ticket appears in My Tickets table
    await waitFor(() => {
      const table = screen.getByTestId('tickets-table');
      expect(within(table).getByText('TKT-2026-000001')).toBeInTheDocument();
      expect(within(table).getByText('Urgent Laptop Screen Replacement')).toBeInTheDocument();
    });

    // Step 8: Switch to Requester 2 (Michael Brown) and verify data isolation
    const changeUserBtn = screen.getByTestId('change-requester-btn');
    await user.click(changeUserBtn);

    await waitFor(() => {
      expect(screen.getByTestId('requester-dropdown')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('requester-dropdown'), '2');
    await user.click(screen.getByTestId('selector-continue-btn'));

    // Step 9: Verify Michael sees an empty state (cannot see Jennifer's ticket)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.queryByText('TKT-2026-000001')).not.toBeInTheDocument();
    });
  });

  it('E2E-02: Ticket Detail & Attachment Lifecycle Journey: Open Ticket -> Add Attachment -> Soft-Remove -> Verify History', async () => {
    const user = userEvent.setup();

    let ticketDetailState = {
      id: 101,
      ticketNumber: 'TKT-2026-000001',
      summary: 'Wi-Fi disconnects on 3rd floor',
      description: 'Campus Wi-Fi drops connection every time I walk to room 302.',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      status: 'NEW',
      requesterId: 1,
      createdAt: '2026-09-04T08:30:00.000Z',
      updatedAt: '2026-09-04T08:30:00.000Z',
      requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@toktickit.local', department: 'Human Resources' },
      category: { id: 2, name: 'Hardware' },
      relatedSystem: { id: 1, name: 'Corporate Laptop' },
      attachments: [
        {
          id: 11,
          originalName: 'wifi_signal_log.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 153600,
          isRemoved: false,
          removedAt: null,
          removalReason: null,
          createdAt: '2026-09-04T08:30:00.000Z',
        },
      ],
    };

    vi.spyOn(global, 'fetch').mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();

      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes('/api/related-systems')) {
        return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
      }

      // GET /api/tickets list
      if (urlStr.includes('/api/tickets?') || urlStr.endsWith('/api/tickets')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: ticketDetailState.id,
                  ticketNumber: ticketDetailState.ticketNumber,
                  summary: ticketDetailState.summary,
                  requestedPriority: ticketDetailState.requestedPriority,
                  itPriority: ticketDetailState.itPriority,
                  status: ticketDetailState.status,
                  createdAt: ticketDetailState.createdAt,
                  updatedAt: ticketDetailState.updatedAt,
                  category: ticketDetailState.category,
                  relatedSystem: ticketDetailState.relatedSystem,
                  activeAttachmentsCount: ticketDetailState.attachments.filter((a) => !a.isRemoved).length,
                },
              ],
              pagination: { page: 1, pageSize: 8, totalItems: 1, totalPages: 1 },
            }),
            { status: 200 }
          )
        );
      }

      // GET /api/tickets/:id
      if (urlStr.includes('/api/tickets/101')) {
        return Promise.resolve(new Response(JSON.stringify(ticketDetailState), { status: 200 }));
      }

      // DELETE /api/attachments/11 or PATCH /api/attachments/11/remove
      if (urlStr.includes('/api/attachments/11') && (init?.method === 'DELETE' || init?.method === 'PATCH')) {
        const body = JSON.parse(init.body as string);
        ticketDetailState = {
          ...ticketDetailState,
          attachments: [
            {
              ...ticketDetailState.attachments[0],
              isRemoved: true,
              removedAt: new Date().toISOString(),
              removalReason: body.reason || body.removalReason,
            },
          ],
        };
        return Promise.resolve(new Response(JSON.stringify(ticketDetailState.attachments[0]), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    render(<App />);

    // Step 1: Open My Tickets and click on ticket row
    await waitFor(() => {
      expect(screen.getByTestId('ticket-row-101')).toBeInTheDocument();
    });

    const ticketRow = screen.getByTestId('ticket-row-101');
    await user.click(ticketRow);

    // Step 2: Verify Ticket Detail view is displayed
    await waitFor(() => {
      expect(screen.getByText('Ticket Detail')).toBeInTheDocument();
      expect(screen.getByTestId('ticket-header')).toBeInTheDocument();
      expect(screen.getByText('wifi_signal_log.pdf')).toBeInTheDocument();
      expect(screen.getByTestId('download-btn-11')).toBeInTheDocument();
      expect(screen.getByTestId('remove-btn-11')).toBeInTheDocument();
    });

    // Step 3: Click Remove button on active attachment
    const removeBtn = screen.getByTestId('remove-btn-11');
    await user.click(removeBtn);

    // Step 4: Verify modal opens, enter removal reason and confirm
    expect(screen.getByTestId('remove-modal')).toBeInTheDocument();
    const reasonInput = screen.getByTestId('removal-reason-input');
    await user.type(reasonInput, 'Contains confidential internal network IPs');

    const confirmRemoveBtn = screen.getByTestId('confirm-remove-btn');
    await user.click(confirmRemoveBtn);

    // Step 5: Verify modal closes and attachment is moved to Removed Attachment History
    await waitFor(() => {
      expect(screen.queryByTestId('remove-modal')).not.toBeInTheDocument();
      expect(screen.getByText(/REMOVED ATTACHMENT HISTORY/i)).toBeInTheDocument();
      expect(screen.getByText(/Reason: Contains confidential internal network IPs/i)).toBeInTheDocument();
      // Verify download button is gone
      expect(screen.queryByTestId('download-btn-11')).not.toBeInTheDocument();
    });

    // Step 6: Click "Back to My Tickets" to return safely to list
    const backBtn = screen.getByRole('button', { name: /Back to My Tickets/i });
    await user.click(backBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    });
  });
});
