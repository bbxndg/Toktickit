import { useEffect, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
interface Event { id: number; fromStatus: string; toStatus: string; actor: { id: number; name: string; role: string }; createdAt: string; reason: string | null }
interface Page { data: Event[]; pagination: { page: number; totalPages: number; totalItems: number } }
const label = (status: string) => status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
export function StatusHistory(props: { ticketId: number; token: string; version: number }) {
  return <HistorySession key={`${props.ticketId}:${props.token}`} {...props} />;
}
function HistorySession({ ticketId, token, version }: { ticketId: number; token: string; version: number }) {
  const [page, setPage] = useState(1), [result, setResult] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setLoading(true); setError('');
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/tickets/${ticketId}/status-history?page=${page}&pageSize=20`, {
          headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Unable to load Status History.');
        if (active) setResult(data);
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load Status History.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [ticketId, token, page, retry, version]);
  return <section aria-label="Status History"><h2 className="h5">Status History</h2>
    {loading && <p role="status">Loading Status History...</p>}
    {error && <div role="alert" className="alert alert-danger">{error} <button type="button" className="btn btn-zg-secondary" onClick={() => setRetry(n => n + 1)}>Retry History</button></div>}
    {!loading && !error && result && <>
      {result.data.length === 0 ? <p>No recorded status changes.</p> : <ol className="list-unstyled">{result.data.map(event => <li key={event.id} className="zg-card p-3 mb-3" style={{ overflowWrap: 'anywhere' }}>
        <strong>{label(event.fromStatus)} → {label(event.toStatus)}</strong>
        <p className="mb-1">{event.actor.name} · <time dateTime={event.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' }).format(new Date(event.createdAt))}</time></p>
        {event.reason && <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{event.reason}</p>}
      </li>)}</ol>}
      <nav aria-label="History pagination" className="d-flex align-items-center flex-wrap gap-3">
        <button type="button" className="btn btn-zg-secondary" style={{ minHeight: 44 }} disabled={page <= 1} onClick={() => setPage(n => n - 1)}>Previous</button>
        <span>Page {page} of {result.pagination.totalPages} · {result.pagination.totalItems} changes</span>
        <button type="button" className="btn btn-zg-secondary" style={{ minHeight: 44 }} disabled={page >= result.pagination.totalPages} onClick={() => setPage(n => n + 1)}>Next</button>
      </nav>
    </>}
  </section>;
}
