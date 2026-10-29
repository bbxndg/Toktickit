import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
type Query = Record<string, string | number>;
type Destination = { view: 'my-tickets' | 'ticket-queue'; query: Query };
type Ticket = { id: number; ticketNumber: string; summary: string; status: string; updatedAt: string; owner?: { name: string } | null };
type Action = { id: number; ticketId: number; ticketNumber: string; description: string; status: string; actionAt: string; page?: number };
type DashboardData = { generatedAt: string; metrics: Record<string, number>; drillDown: Record<string, Destination>; recentTickets: Ticket[];
  window?: { recentResolvedSince: string; recentResolvedUntil: string }; byStatus?: Record<string, number>; byItPriority?: Record<string, number>;
  myPendingActions?: { totalItems: number; data: Action[] } };
const labels: Record<string, string> = { totalTickets: 'Total Tickets', activeTickets: 'Active Tickets', waitingForRequester: 'Waiting for Requester',
  recentlyResolved: 'Recently Resolved (7 days)', unassignedTickets: 'Unassigned Tickets', myAssignedTickets: 'My Assigned Tickets' };
const human = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' }).format(new Date(value));
export function Dashboard({ onNavigate, onOpenTicket, onCreateTicket, active = true }: { onNavigate: (destination: Destination) => void;
  onOpenTicket: (id: number, action?: { id: number; page: number }) => void; onCreateTicket: () => void; active?: boolean }) {
  const { user, token } = useAuth();
  const staff = user?.role === 'IT_STAFF' || user?.role === 'ADMINISTRATOR';
  const userId = user?.id, passwordRequired = user?.isPasswordChangeRequired;
  const [data, setData] = useState<DashboardData | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active || !token || !userId || passwordRequired) return;
    const controller = new AbortController(); let alive = true;
    setLoading(true); setError('');
    void (async () => { try {
      const response = await fetch(`${API_BASE}/api/dashboard/${staff ? 'staff' : 'requester'}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (!response.ok) throw new Error(`Unable to load dashboard (${response.status}).`);
      const snapshot = await response.json(); if (alive) setData(snapshot);
    } catch (err) { if (alive) setError(err instanceof Error ? err.message : 'Unable to load dashboard.'); }
    finally { if (alive) setLoading(false); } })();
    return () => { alive = false; controller.abort(); };
  }, [token, userId, passwordRequired, retry, staff, active]);
  const navigate = (destination: Destination | undefined) => {
    if (!destination || destination.view !== (staff ? 'ticket-queue' : 'my-tickets')) return;
    const allowed = ['page', 'status', 'statusGroup', 'ownerId', 'itPriority', 'resolvedSince', 'resolvedUntil'];
    const query = Object.fromEntries(Object.entries(destination.query || {}).filter(([key, value]) => allowed.includes(key) && (typeof value === 'string' || typeof value === 'number')));
    onNavigate({ view: destination.view, query: { ...query, page: 1 } });
  };
  return <section aria-label="Dashboard" style={{ overflowWrap: 'anywhere' }}>
    <div className="d-flex justify-content-between align-items-center mb-3"><h2>Dashboard</h2>
      <button type="button" className="btn btn-zg-secondary" disabled={loading} onClick={() => setRetry(x => x + 1)}>Refresh</button></div>
    {loading && <p role="status">Loading dashboard...</p>}
    {error && <div role="alert" className="alert alert-danger">{data ? 'Could not refresh. Showing previously loaded data. ' : ''}{error} <button type="button" className="btn btn-zg-secondary" onClick={() => setRetry(x => x + 1)}>Retry</button></div>}
    {data && <><p className="text-muted">Updated: {date(data.generatedAt)}</p><p className="visually-hidden" aria-live="polite">{!loading && !error ? 'Dashboard updated.' : ''}</p>
      <div className="row g-3 mb-4">{Object.entries(data.metrics).map(([key, count]) => <div className="col-12 col-md-6 col-lg-3" key={key}>
        <div className="zg-card h-100 p-3"><h3 className="h6">{!staff && key === 'waitingForRequester' ? 'Waiting for You' : labels[key]}</h3><p className="fs-3 fw-bold">{count}</p>
          <button type="button" className="btn btn-zg-secondary" onClick={() => navigate(data.drillDown[key])}>View {labels[key]}</button></div></div>)}</div>
      {!staff && <><p>Active: New, Open, In Progress, Waiting for Requester and Reopened.</p>{data.window && <p>Recent resolution window: {date(data.window.recentResolvedSince)} – {date(data.window.recentResolvedUntil)}</p>}
        <div className="d-flex flex-wrap gap-2 mb-3"><button className="btn btn-zg-secondary" onClick={() => navigate({ view: 'my-tickets', query: { page: 1 } })}>View My Tickets</button><button className="btn btn-zg-primary" onClick={onCreateTicket}>Create Ticket</button></div></>}
      {staff && <><section className="mb-3"><h3 className="h5">Tickets by Status</h3><div className="d-flex flex-wrap gap-2">{Object.entries(data.byStatus || {}).map(([key, count]) => <button key={key} className="btn btn-zg-secondary" onClick={() => navigate({ view: 'ticket-queue', query: { status: key, page: 1 } })}>{human(key)}: {count}</button>)}</div></section>
        <section className="mb-3"><h3 className="h5">Active Tickets by IT Priority</h3><div className="d-flex flex-wrap gap-2">{Object.entries(data.byItPriority || {}).map(([key, count]) => <button key={key} className="btn btn-zg-secondary" onClick={() => navigate({ view: 'ticket-queue', query: { statusGroup: 'active', itPriority: key, page: 1 } })}>{human(key)}: {count}</button>)}</div></section></>}
      <div className="row g-3"><section className={staff ? 'col-12 col-lg-6' : 'col-12'}><div className="zg-card p-3 h-100"><h3 className="h5">Recent Tickets</h3>
        {data.recentTickets.length === 0 ? <p>No tickets yet.</p> : <ul className="list-unstyled">{data.recentTickets.map(t => <li key={t.id} className="border-bottom py-2"><strong>{t.ticketNumber}</strong> · {t.summary}<br/><span>{human(t.status)} · {date(t.updatedAt)}{staff && ` · ${t.owner?.name || 'Unassigned'}`}</span><br/><button className="btn btn-zg-secondary mt-1" onClick={() => onOpenTicket(t.id)}>Open {t.ticketNumber}</button></li>)}</ul>}</div></section>
        {staff && data.myPendingActions && <section className="col-12 col-lg-6"><div className="zg-card p-3 h-100"><h3 className="h5">My Pending Actions</h3><p>Showing {data.myPendingActions.data.length} of {data.myPendingActions.totalItems} pending actions</p>
          {!data.myPendingActions.data.length ? <p>No pending actions.</p> : <ul className="list-unstyled">{data.myPendingActions.data.map(a => <li key={a.id} className="border-bottom py-2"><strong>{a.ticketNumber}</strong> · {a.description}<br/>{human(a.status)} · {date(a.actionAt)}<br/><button className="btn btn-zg-secondary mt-1" onClick={() => onOpenTicket(a.ticketId, { id: a.id, page: a.page || 1 })}>Open Ticket {a.ticketNumber}</button></li>)}</ul>}</div></section>}</div>
    </>}
  </section>;
}
