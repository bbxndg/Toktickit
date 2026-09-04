import React, { useState, useEffect, useCallback } from 'react';
import { useRequester } from '../context/RequesterContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  activeAttachmentsCount: number;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface OptionItem {
  id: number;
  name: string;
}

interface MyTicketsProps {
  onCreateTicket: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

export const MyTickets: React.FC<MyTicketsProps> = ({ onCreateTicket, onSelectTicket }) => {
  const { currentRequester, openSelector } = useRequester();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 8,
    totalItems: 0,
    totalPages: 1,
  });

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [requestedPriority, setRequestedPriority] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Load categories for filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (e) {
        console.error('Failed to load categories for filter:', e);
      }
    };
    fetchCategories();
  }, []);

  // Fetch tickets for active requester
  const fetchTickets = useCallback(async () => {
    if (!currentRequester) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        requesterId: String(currentRequester.id),
        page: String(page),
        pageSize: '8',
      });

      if (search.trim()) params.append('search', search.trim());
      if (categoryId) params.append('categoryId', categoryId);
      if (requestedPriority) params.append('requestedPriority', requestedPriority);
      if (status) params.append('status', status);

      const res = await fetch(`${API_BASE}/api/tickets?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load tickets (${res.status})`);
      }

      const json = await res.json();
      setTickets(json.data || []);
      setPagination(json.pagination || { page: 1, pageSize: 8, totalItems: 0, totalPages: 1 });
    } catch (err: any) {
      setError(err.message || 'Unable to connect to the server.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [currentRequester, search, categoryId, requestedPriority, status, page]);

  // Trigger fetch on filter / page / requester change
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearch('');
    setCategoryId('');
    setRequestedPriority('');
    setStatus('');
    setPage(1);
  };

  const isFiltered = Boolean(search || categoryId || requestedPriority || status);

  // Helper to format date
  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  // Helper for priority badges
  const renderPriorityBadge = (prio: string | null) => {
    if (!prio) return <span className="text-muted small">—</span>;
    const p = prio.toUpperCase();
    let badgeClass = 'badge-zg-priority-low';
    if (p === 'MEDIUM') badgeClass = 'badge-zg-priority-medium';
    if (p === 'HIGH') badgeClass = 'badge-zg-priority-high';
    if (p === 'CRITICAL') badgeClass = 'badge-zg-priority-critical';

    return <span className={`badge ${badgeClass} px-2 py-1`}>{prio}</span>;
  };

  // Helper for status badges
  const renderStatusBadge = (st: string) => {
    const s = st.toUpperCase();
    let badgeClass = 'badge-zg-status-new';
    if (s === 'OPEN') badgeClass = 'badge bg-info text-dark';
    if (s === 'IN_PROGRESS') badgeClass = 'badge-zg-status-inprogress';
    if (s === 'RESOLVED') badgeClass = 'badge-zg-status-resolved';
    if (s === 'CLOSED') badgeClass = 'badge bg-secondary';

    return <span className={`badge ${badgeClass} px-2 py-1`}>{st.replace('_', ' ')}</span>;
  };

  if (!currentRequester) {
    return (
      <div className="zg-card p-5 text-center shadow-sm">
        <div className="fs-1 mb-3">👤</div>
        <h4 className="fw-bold" style={{ color: 'var(--zg-text-primary)' }}>
          No Development Requester Selected
        </h4>
        <p className="text-muted col-md-6 mx-auto mb-4">
          Please select a simulated development requester context to view and manage tickets.
        </p>
        <button type="button" className="btn btn-zg-primary px-4" onClick={openSelector}>
          Select Requester
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0">
      {/* Header Row */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: 'var(--zg-text-primary)' }}>
            My Tickets
          </h2>
          <p className="text-muted small mb-0">View and track all of your support requests.</p>
        </div>
        <div className="d-flex gap-2">
          {isFiltered && (
            <button
              type="button"
              className="btn btn-sm btn-zg-secondary"
              onClick={handleClearFilters}
              data-testid="clear-filters-btn"
            >
              🔄 Clear Filters
            </button>
          )}
          <button
            type="button"
            className="btn btn-zg-primary"
            onClick={onCreateTicket}
            data-testid="create-ticket-cta"
          >
            ➕ Create Ticket
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="zg-card p-3 shadow-sm mb-4">
        <div className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-lg-4 col-md-6 col-12">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">🔍</span>
              <input
                type="text"
                className="form-control zg-input border-start-0"
                placeholder="Search by ticket number or summary..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="col-lg-3 col-md-6 col-6">
            <select
              className="form-select zg-input"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              data-testid="category-filter"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Requested Priority Dropdown */}
          <div className="col-lg-2 col-md-4 col-6">
            <select
              className="form-select zg-input"
              value={requestedPriority}
              onChange={(e) => {
                setRequestedPriority(e.target.value);
                setPage(1);
              }}
              data-testid="priority-filter"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="col-lg-3 col-md-4 col-6">
            <select
              className="form-select zg-input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              data-testid="status-filter"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="alert alert-danger shadow-sm mb-4" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn btn-sm btn-outline-danger ms-3" onClick={fetchTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="zg-card p-5 text-center shadow-sm" data-testid="tickets-loading">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading tickets...</span>
          </div>
          <p className="mt-2 text-muted small">Loading support tickets for {currentRequester.name}...</p>
        </div>
      ) : tickets.length === 0 ? (
        isFiltered ? (
          /* No Results State */
          <div className="zg-card p-5 text-center shadow-sm" data-testid="no-results-state">
            <div className="fs-1 mb-2">🔎</div>
            <h5 className="fw-bold" style={{ color: 'var(--zg-text-primary)' }}>
              No Tickets Found
            </h5>
            <p className="text-muted small col-md-6 mx-auto mb-3">
              No tickets match your search or filter criteria. Try changing or clearing your filters.
            </p>
            <button
              type="button"
              className="btn btn-zg-secondary btn-sm"
              onClick={handleClearFilters}
              data-testid="no-results-clear-btn"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          /* Empty State */
          <div className="zg-card p-5 text-center shadow-sm" data-testid="empty-state">
            <div className="fs-1 mb-2">🎫</div>
            <h5 className="fw-bold" style={{ color: 'var(--zg-text-primary)' }}>
              No Support Tickets Yet
            </h5>
            <p className="text-muted small col-md-6 mx-auto mb-3">
              You have not submitted any IT support requests yet.
            </p>
            <button
              type="button"
              className="btn btn-zg-primary"
              onClick={onCreateTicket}
              data-testid="empty-create-ticket-btn"
            >
              ➕ Submit Your First Ticket
            </button>
          </div>
        )
      ) : (
        <div>
          {/* Desktop Table View (>= 768px) */}
          <div className="d-none d-md-block zg-card shadow-sm overflow-hidden mb-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" data-testid="tickets-table">
                <thead style={{ backgroundColor: 'var(--zg-bg)', borderBottom: '2px solid var(--zg-border)' }}>
                  <tr className="small text-muted text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    <th className="py-3 px-3">Ticket No.</th>
                    <th className="py-3">Created Date</th>
                    <th className="py-3" style={{ minWidth: '220px' }}>Summary</th>
                    <th className="py-3">Category</th>
                    <th className="py-3 text-center">Req. Priority</th>
                    <th className="py-3 text-center">IT Priority</th>
                    <th className="py-3 text-center">Current Status</th>
                    <th className="py-3 text-end px-3">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      style={{ cursor: onSelectTicket ? 'pointer' : 'default' }}
                      onClick={() => onSelectTicket?.(t.id)}
                      data-testid={`ticket-row-${t.id}`}
                    >
                      <td className="py-3 px-3 fw-bold font-monospace" style={{ color: 'var(--zg-primary)' }}>
                        {t.ticketNumber}
                        {t.activeAttachmentsCount > 0 && (
                          <span className="ms-1 small text-muted" title={`${t.activeAttachmentsCount} attachments`}>
                            📎
                          </span>
                        )}
                      </td>
                      <td className="small text-muted">{formatDate(t.createdAt)}</td>
                      <td>
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '280px' }}>
                          {t.summary}
                        </div>
                        <small className="text-muted">{t.relatedSystem?.name}</small>
                      </td>
                      <td className="small">{t.category?.name}</td>
                      <td className="text-center">{renderPriorityBadge(t.requestedPriority)}</td>
                      <td className="text-center">{renderPriorityBadge(t.itPriority)}</td>
                      <td className="text-center">{renderStatusBadge(t.status)}</td>
                      <td className="text-end px-3 small text-muted">{formatDate(t.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (< 768px) */}
          <div className="d-block d-md-none mb-3" data-testid="tickets-mobile-cards">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="zg-card p-3 mb-3 shadow-sm"
                style={{ cursor: onSelectTicket ? 'pointer' : 'default' }}
                onClick={() => onSelectTicket?.(t.id)}
                data-testid={`ticket-card-${t.id}`}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold font-monospace text-success">{t.ticketNumber}</span>
                  <div>{renderStatusBadge(t.status)}</div>
                </div>

                <h6 className="fw-bold text-dark mb-1">{t.summary}</h6>
                <div className="d-flex justify-content-between align-items-center text-muted small mb-2">
                  <span>{t.category?.name} • {t.relatedSystem?.name}</span>
                  <div>{renderPriorityBadge(t.requestedPriority)}</div>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top text-muted small" style={{ fontSize: '0.75rem' }}>
                  <span>Created: {formatDate(t.createdAt)}</span>
                  {t.activeAttachmentsCount > 0 && <span>📎 {t.activeAttachmentsCount}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="zg-card p-3 shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-2">
            <small className="text-muted" data-testid="pagination-summary">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems} tickets
            </small>

            <nav aria-label="Ticket pagination">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link text-dark"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    data-testid="pagination-prev"
                  >
                    ‹ Previous
                  </button>
                </li>

                {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pNum) => (
                  <li key={pNum} className={`page-item ${pagination.page === pNum ? 'active' : ''}`}>
                    <button
                      type="button"
                      className={`page-link ${pagination.page === pNum ? 'btn-zg-primary border-0' : 'text-dark'}`}
                      onClick={() => setPage(pNum)}
                      data-testid={`pagination-page-${pNum}`}
                    >
                      {pNum}
                    </button>
                  </li>
                ))}

                <li className={`page-item ${pagination.page >= pagination.totalPages ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link text-dark"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    data-testid="pagination-next"
                  >
                    Next ›
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};
