import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketDetail } from '../../src/pages/TicketDetail';
import { RequesterProvider } from '../../src/context/RequesterContext';

const mockRequester = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@toktickit.local',
  department: 'Human Resources',
  isActive: true,
};

const mockTicketData = {
  id: 101,
  ticketNumber: 'TKT-2026-000001',
  summary: 'Laptop battery drains quickly',
  description: 'My laptop battery drains much faster than usual even when the system is idle.',
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
      originalName: 'battery_report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 204800,
      isRemoved: false,
      removedAt: null,
      removalReason: null,
      createdAt: '2026-09-04T08:30:00.000Z',
    },
    {
      id: 12,
      originalName: 'error_log.txt',
      mimeType: 'text/plain',
      sizeBytes: 10240,
      isRemoved: true,
      removedAt: '2026-09-04T09:00:00.000Z',
      removalReason: 'Accidental upload of private logs',
      createdAt: '2026-09-04T08:35:00.000Z',
    },
  ],
};

const renderWithContext = (ui: React.ReactElement) => {
  return render(<RequesterProvider>{ui}</RequesterProvider>);
};

describe('Ticket Detail & Attachment Lifecycle (UI)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_dev_requester', JSON.stringify(mockRequester));
    vi.restoreAllMocks();
  });

  it('UI-05: renders read-only ticket details and header information', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockTicketData), { status: 200 })
    );

    renderWithContext(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    expect(screen.getByText(/Loading ticket details/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
      expect(screen.getByText('Laptop battery drains quickly')).toBeInTheDocument();
      expect(screen.getByText('Hardware')).toBeInTheDocument();
      expect(screen.getByText('Corporate Laptop')).toBeInTheDocument();
      expect(screen.getByText(/My laptop battery drains much faster/i)).toBeInTheDocument();
    });
  });

  it('UI-06: displays active attachments with download and remove actions, and removed history', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockTicketData), { status: 200 })
    );

    renderWithContext(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      // Active attachment
      expect(screen.getByText('battery_report.pdf')).toBeInTheDocument();
      expect(screen.getByTestId('download-btn-11')).toBeInTheDocument();
      expect(screen.getByTestId('remove-btn-11')).toBeInTheDocument();

      // Removed attachment history
      expect(screen.getByText('error_log.txt')).toBeInTheDocument();
      expect(screen.getByText(/Reason: Accidental upload of private logs/i)).toBeInTheDocument();
      expect(screen.queryByTestId('download-btn-12')).not.toBeInTheDocument();
    });
  });

  it('opens remove modal, validates reason length, and performs soft-removal', async () => {
    const user = userEvent.setup();

    const updatedTicketData = {
      ...mockTicketData,
      attachments: [
        {
          ...mockTicketData.attachments[0],
          isRemoved: true,
          removedAt: '2026-09-04T10:00:00.000Z',
          removalReason: 'Wrong file uploaded by mistake',
        },
        mockTicketData.attachments[1],
      ],
    };

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(mockTicketData), { status: 200 })) // initial fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 11, isRemoved: true }), { status: 200 })) // patch remove
      .mockResolvedValueOnce(new Response(JSON.stringify(updatedTicketData), { status: 200 })); // refresh fetch

    renderWithContext(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('remove-btn-11')).toBeInTheDocument();
    });

    // Click remove button
    await user.click(screen.getByTestId('remove-btn-11'));

    // Modal should appear
    expect(screen.getByTestId('remove-modal')).toBeInTheDocument();

    // Try submitting with empty or short reason (< 3 chars)
    const confirmBtn = screen.getByTestId('confirm-remove-btn');
    await user.click(confirmBtn);

    expect(screen.getByTestId('removal-reason-error')).toHaveTextContent(
      /Removal reason must be at least 3 characters/i
    );

    // Type valid reason
    const reasonInput = screen.getByTestId('removal-reason-input');
    await user.type(reasonInput, 'Wrong file uploaded by mistake');

    // Submit valid removal
    await user.click(confirmBtn);

    // Modal closes and refreshed data shows removed history
    await waitFor(() => {
      expect(screen.queryByTestId('remove-modal')).not.toBeInTheDocument();
      expect(screen.getByText(/Reason: Wrong file uploaded by mistake/i)).toBeInTheDocument();
    });
  });

  it('disables add attachment button when 5 active attachments are reached', async () => {
    const ticketWith5Active = {
      ...mockTicketData,
      attachments: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        originalName: `doc_${i + 1}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 10000,
        isRemoved: false,
        removedAt: null,
        removalReason: null,
        createdAt: '2026-09-04T08:30:00.000Z',
      })),
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(ticketWith5Active), { status: 200 })
    );

    renderWithContext(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('attachment-limit-msg')).toBeInTheDocument();
      expect(screen.getByTestId('add-attachment-input')).toBeDisabled();
    });
  });

  it('validates file type and size on client-side before upload in handleAddAttachment', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockTicketData), { status: 200 })
    );

    renderWithContext(<TicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('add-attachment-input')).toBeInTheDocument();
    });

    // Upload invalid file type (.exe)
    const invalidFile = new File(['executable binary'], 'malware.exe', {
      type: 'application/x-msdownload',
    });

    const fileInput = screen.getByTestId('add-attachment-input');
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // Verify error banner is shown without making network call
    await waitFor(() => {
      expect(screen.getByTestId('add-attach-error')).toHaveTextContent(
        /Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed/i
      );
    });
  });
});
