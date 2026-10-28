import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './actions-taken.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
type Status = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
interface Person { id: number; name: string; role: string }
export interface ActionRecord {
  id: number; ticketId: number; description: string; status: Status; result: string | null;
  assignee: Person; createdBy: Person; updatedBy: Person; performedBy: Person | null;
  followUpRequired: boolean; followUpNote: string | null; attachmentNotes: string | null; cancelReason: string | null;
  actionAt: string; createdAt: string; updatedAt: string; completedAt?: string | null; cancelledAt?: string | null; version: number;
}
export interface ActionTicket { id: number; status: string; version: number; updatedAt: string }
interface Page { data: ActionRecord[]; ticket: ActionTicket; pagination: { page: number; totalItems: number; totalPages: number } }
interface Draft { description: string; result: string; assigneeId: number; status: Status;
  followUpRequired: boolean; followUpNote: string; attachmentNotes: string; cancelReason: string }
interface Props { ticketId: number; token: string; currentUser: Person; ticketStatus: string; ticketVersion: number;
  onTicketChange: (ticket: ActionTicket) => void }
const active = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'];
const next: Record<Status, Status[]> = { PLANNED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'], IN_PROGRESS: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] };
const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' }).format(new Date(value));

// Restore the triggering control and keep keyboard focus inside the active dialog.
export function ActionDialog({ title, onClose, children, testId }: { title: string; onClose: () => void; children: ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null); const id = useId(); const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    (ref.current?.querySelector<HTMLElement>('[data-initial-focus], button, textarea') || ref.current)?.focus();
    return () => { document.body.style.overflow = bodyOverflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="action-dialog-backdrop"><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id}
    tabIndex={-1} data-testid={testId} className="action-dialog zg-card" onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key === 'Tab') {
        const controls = Array.from(ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'))
          .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        const first = controls[0], last = controls.at(-1);
        if (!first) { e.preventDefault(); ref.current?.focus(); }
        else if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }}><div className="d-flex justify-content-between align-items-start gap-3 mb-3">
      <h3 id={id} className="h5 mb-0">{title}</h3><button type="button" className="btn btn-zg-secondary" aria-label="Close dialog" onClick={onClose}>×</button>
    </div>{children}</div></div>;
}

export function ActionsTaken(props: Props) {
  // Key the session so old requests/drafts cannot cross a Ticket/account boundary.
  return <ActionSession key={`${props.ticketId}:${props.token}:${props.currentUser.id}`} {...props} />;
}

function ActionSession({ ticketId, token, currentUser, ticketStatus, ticketVersion, onTicketChange }: Props) {
  const staff = currentUser.role === 'IT_STAFF' || currentUser.role === 'ADMINISTRATOR';
  const [page, setPage] = useState(1), [result, setResult] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true), [listError, setListError] = useState('');
  const [members, setMembers] = useState<Person[]>([]), [membersError, setMembersError] = useState(''), [membersLoading, setMembersLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null), [editing, setEditing] = useState<ActionRecord | null>(null), [view, setView] = useState<ActionRecord | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false), [uncertain, setUncertain] = useState(false), [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');
  const alive = useRef(true), inFlight = useRef(false), controllers = useRef(new Set<AbortController>());
  const key = useRef(''), parentVersion = useRef(ticketVersion), retry = useRef<{ url: string; method: string; body: string } | null>(null);
  const initialDraft = useRef(''); const form = useRef<HTMLFormElement>(null); const discardPrompt = useRef<HTMLDivElement>(null); const fieldPrefix = useId();
  const listSequence = useRef(0);
  const currentStatus = result && result.ticket.version >= ticketVersion ? result.ticket.status : ticketStatus;
  const canWrite = staff && active.includes(currentStatus);

  useEffect(() => { const pending = controllers.current; alive.current = true; return () => { alive.current = false; pending.forEach(c => c.abort()); }; }, []);
  useEffect(() => { if (discarding) discardPrompt.current?.focus(); }, [discarding]);
  const call = useCallback(async (url: string, init?: RequestInit) => {
    const controller = new AbortController(); controllers.current.add(controller);
    try { return await fetch(`${API_BASE}${url}`, { ...init, signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers } }); }
    finally { controllers.current.delete(controller); }
  }, [token]);
  const getPage = useCallback(async (requestedPage: number) => {
    const response = await call(`/api/tickets/${ticketId}/actions-taken?page=${requestedPage}&pageSize=20`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Unable to load Actions Taken.');
    return data as Page;
  }, [call, ticketId]);
  const load = useCallback(async () => {
    const sequence = ++listSequence.current;
    setLoading(true); setListError('');
    try { const data = await getPage(page); if (alive.current && sequence === listSequence.current) setResult(data); }
    catch (error) { if (alive.current && sequence === listSequence.current) setListError(error instanceof Error ? error.message : 'Unable to load Actions Taken.'); }
    finally { if (alive.current && sequence === listSequence.current) setLoading(false); }
  }, [getPage, page]);
  useEffect(() => { void load(); }, [load, ticketVersion, ticketStatus]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true); setMembersError('');
    try {
      const response = await call('/api/staff/members'), data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to load assignees.');
      if (alive.current) { setMembers(data); if (!data.length) setMembersError('No active staff are available.'); }
    } catch (error) { if (alive.current) setMembersError(error instanceof Error ? error.message : 'Unable to load assignees.'); }
    finally { if (alive.current) setMembersLoading(false); }
  }, [call]);

  function open(action?: ActionRecord) {
    const value: Draft = { description: action?.description || '', result: action?.result || '', assigneeId: action?.assignee.id || currentUser.id,
      status: action?.status || 'PLANNED', followUpRequired: action?.followUpRequired || false, followUpNote: action?.followUpNote || '',
      attachmentNotes: action?.attachmentNotes || '', cancelReason: action?.cancelReason || '' };
    setEditing(action || null); setDraft(value); initialDraft.current = JSON.stringify(value);
    parentVersion.current = result?.ticket.version ?? ticketVersion; key.current = crypto.randomUUID(); retry.current = null;
    setErrors({}); setConflict(false); setUncertain(false); setConfirming(false); setDiscarding(false); setStatusNotice(''); setMessage(''); void loadMembers();
  }
  function close() {
    if (inFlight.current) return;
    if (draft && JSON.stringify(draft) !== initialDraft.current) { setDiscarding(true); return; }
    setDraft(null); setConfirming(false);
  }
  function change<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft(prev => prev ? { ...prev, [field]: value, ...(field === 'followUpRequired' && !value ? { followUpNote: '' } : {}) } : null);
    setErrors(prev => ({ ...prev, [field]: '' })); setConfirming(false); setDiscarding(false);
    if (field === 'status') setStatusNotice('');
  }
  function validate() {
    if (!draft) return false;
    const fields: Record<string, string> = {};
    for (const field of ['description', 'result', 'followUpNote', 'attachmentNotes', 'cancelReason'] as const) {
      const value = draft[field].trim();
      const required = field === 'description' || (field === 'result' && draft.status === 'COMPLETED') || (field === 'followUpNote' && draft.followUpRequired) || (field === 'cancelReason' && draft.status === 'CANCELLED');
      if ((required || value) && (value.length < 2 || value.length > 2000)) fields[field] = 'Enter 2 to 2,000 characters.';
    }
    if (!members.some(member => member.id === draft.assigneeId) && (!editing || draft.assigneeId !== editing.assignee.id || draft.status === 'COMPLETED')) fields.assigneeId = 'Choose an active assignee.';
    setErrors(fields);
    const first = Object.keys(fields)[0]; if (first) form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    return !first;
  }
  async function save(confirmed = false) {
    if (!draft || inFlight.current || conflict) return;
    if (!uncertain) {
      if (!validate()) return;
      if (['COMPLETED', 'CANCELLED'].includes(draft.status) && !confirmed) { setConfirming(true); return; }
      const body = { ...draft, description: draft.description.trim(), result: draft.result.trim() || null,
        followUpNote: draft.followUpRequired ? draft.followUpNote.trim() : null, attachmentNotes: draft.attachmentNotes.trim() || null,
        ticketVersion: parentVersion.current, ...(editing ? { version: editing.version, cancelReason: draft.cancelReason.trim() || null } : { clientRequestId: key.current }) };
      if (!editing) delete (body as Partial<Draft>).cancelReason;
      // Retaining an inactive historical assignee is distinct from explicitly assigning one.
      if (editing && draft.assigneeId === editing.assignee.id) delete (body as Partial<Draft>).assigneeId;
      retry.current = { url: `/api/staff/tickets/${ticketId}/actions-taken${editing ? `/${editing.id}` : ''}`, method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) };
    }
    inFlight.current = true; setBusy(true); setErrors({});
    try {
      const attempt = retry.current!;
      const response = await call(attempt.url, { method: attempt.method, body: attempt.body });
      const data = await response.json(); if (!alive.current) return;
      if (!response.ok) {
        setUncertain(false); setConfirming(false);
        if (response.status === 409) setConflict(true);
        const fields: Record<string, string> = { form: data.error?.message || 'Unable to save this action.' };
        for (const detail of data.error?.details || []) fields[detail.field] = detail.message;
        setErrors(fields); return;
      }
      setDraft(null); setConfirming(false); setUncertain(false); setMessage(data.replayed ? 'Previous save confirmed. No duplicate action was created.' : 'Action saved successfully.');
      onTicketChange(data.ticket); await load();
    } catch {
      if (alive.current) {
        if (editing) { setConflict(true); setErrors({ form: 'Save result could not be confirmed. Reload the latest record and review your draft.' }); }
        else { setUncertain(true); setErrors({ form: 'Save result could not be confirmed. Retry the previous save to check it safely.' }); }
      }
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  async function reloadLatest() {
    if (inFlight.current) return;
    setBusy(true); inFlight.current = true;
    try {
      const latest = await getPage(page); if (!alive.current) return;
      setResult(latest); onTicketChange(latest.ticket); parentVersion.current = latest.ticket.version;
      setStatusNotice(''); setConfirming(false);
      if (editing) {
        const row = latest.data.find(item => item.id === editing.id);
        if (!row || !next[row.status].length) { setErrors({ form: 'This action is now read-only or unavailable. Your draft is retained for review.' }); return; }
        if (draft && draft.status !== row.status && !next[row.status].includes(draft.status)) {
          setDraft(previous => previous ? { ...previous, status: row.status } : null);
          setStatusNotice(`Your previous status (${label(draft.status)}) is no longer available. Status has been updated to ${label(row.status)}. Your other entries are unchanged. Review your draft before saving.`);
        }
        setEditing(row);
      }
      setConflict(false); setErrors({}); setMessage('Latest information loaded. Review your draft before saving.');
    } catch (error) { if (alive.current) setErrors({ form: error instanceof Error ? error.message : 'Unable to reload.' }); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  const badge = (status: Status) => <span className={`badge action-status-${status.toLowerCase()}`}>{label(status)}</span>;
  const buttons = (row: ActionRecord) => <div className="d-flex gap-2 flex-wrap"><button type="button" className="btn btn-zg-secondary" onClick={() => setView(row)}>View</button>
    {canWrite && next[row.status].length > 0 && <button type="button" className="btn btn-zg-secondary" onClick={() => open(row)}>Edit</button>}</div>;
  const textField = (field: 'description' | 'result' | 'followUpNote' | 'attachmentNotes' | 'cancelReason', title: string, required = false) => <div className="mb-3">
    <label className="zg-label" htmlFor={`${fieldPrefix}-${field}`}>{title}{required && <span aria-hidden="true" className="text-danger"> *</span>}</label>
    <textarea id={`${fieldPrefix}-${field}`} name={field} className={`zg-input action-textarea ${errors[field] ? 'is-invalid' : ''}`} rows={3} maxLength={2000}
      aria-required={required} aria-invalid={!!errors[field]} aria-describedby={`${fieldPrefix}-${field}-help${errors[field] ? ` ${fieldPrefix}-${field}-error` : ''}`}
      value={draft![field]} disabled={busy || uncertain} onChange={e => change(field, e.target.value)} />
    <small id={`${fieldPrefix}-${field}-help`} className="text-muted d-block">{required ? 'Required. ' : 'Optional. '}2 to 2,000 characters when provided.</small>
    {errors[field] && <div id={`${fieldPrefix}-${field}-error`} className="zg-error-text" role="alert">{errors[field]}</div>}
  </div>;

  return <section className="actions-taken" aria-label="Actions Taken">
    <div className="d-flex justify-content-between align-items-start gap-3 mb-3"><h2 className="h5">Actions Taken</h2>
      {canWrite && <button type="button" className="btn btn-zg-primary" onClick={() => open()} disabled={loading}>Add Action</button>}</div>
    {!canWrite && <p className="text-muted">{staff ? 'Actions are read-only while this Ticket is resolved, closed or cancelled.' : 'Work recorded by IT is shown here for your review.'}</p>}
    {message && <p role="status" className="alert alert-success">{message}</p>}
    {loading && <p role="status">Loading Actions Taken...</p>}
    {listError && <div className="alert alert-danger" role="alert">{listError} <button type="button" className="btn btn-zg-secondary" onClick={() => void load()}>Retry</button></div>}
    {!loading && !listError && result && <>
      {result.data.length === 0 ? <p>No actions recorded.</p> : <>
        <div className="d-none d-lg-block table-responsive"><table className="table align-middle"><caption className="visually-hidden">Recorded work, oldest first</caption>
          <thead><tr>{['Action Date/Time', 'Description', 'Assignee', 'Performed By', 'Status', 'Follow-up', 'Actions'].map(name => <th key={name} scope="col">{name}</th>)}</tr></thead>
          <tbody>{result.data.map(row => <tr key={row.id}><td>{date(row.actionAt)}</td><td className="action-description">{row.description}</td><td>{row.assignee.name}</td>
            <td>{row.performedBy?.name || 'Not completed'}</td><td>{badge(row.status)}</td><td>{row.followUpRequired ? 'Required' : 'No'}</td><td>{buttons(row)}</td></tr>)}</tbody></table></div>
        <div className="d-lg-none">{result.data.map(row => <article className="zg-card p-3 mb-3" key={row.id}>
          <div className="d-flex justify-content-between gap-2 mb-2">{badge(row.status)}<small>{date(row.actionAt)}</small></div><p className="action-description">{row.description}</p>
          <p>Assignee: {row.assignee.name}<br />Performed By: {row.performedBy?.name || 'Not completed'}<br />Follow-up: {row.followUpRequired ? 'Required' : 'No'}</p>{buttons(row)}</article>)}</div>
      </>}
      <nav className="d-flex gap-3 align-items-center flex-wrap" aria-label="Action pagination"><button type="button" className="btn btn-zg-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
        <span>Page {page} of {result.pagination.totalPages} · {result.pagination.totalItems} actions</span><button type="button" className="btn btn-zg-secondary" disabled={page >= result.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button></nav>
    </>}
    {view && <ActionDialog title="View Action" onClose={() => setView(null)}><dl className="action-details">
      {Object.entries({ 'Action Date/Time': date(view.actionAt), Description: view.description, Status: label(view.status), Assignee: view.assignee.name,
        'Performed By': view.performedBy?.name || 'Not completed', Result: view.result || 'Not recorded', 'Follow-Up Required?': view.followUpRequired ? 'Yes' : 'No',
        'Follow-up Note': view.followUpNote || 'None', 'Attachment Notes': view.attachmentNotes || 'None', 'Cancellation Reason': view.cancelReason || 'None',
        'Created By': view.createdBy.name, 'Last Edited By': view.updatedBy.name, 'Last Updated': date(view.updatedAt),
        ...(view.completedAt ? { 'Completed At': date(view.completedAt) } : {}), ...(view.cancelledAt ? { 'Cancelled At': date(view.cancelledAt) } : {}) }).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
    </dl><button type="button" className="btn btn-zg-secondary" onClick={() => setView(null)}>Close</button></ActionDialog>}
    {draft && <ActionDialog title={editing ? 'Edit Action' : 'Create Action'} onClose={close}>
      <p className="alert alert-info">Actions Taken are visible to the Requester. Use Internal Notes for confidential information.</p>
      <p className="text-muted">Fields marked * are required.</p>
      {errors.form && <div className="alert alert-danger" role="alert">{errors.form}</div>}
      {statusNotice && <div className="alert alert-info" role="status">{statusNotice}</div>}
      {conflict && <button type="button" className="btn btn-zg-secondary mb-3" disabled={busy} onClick={() => void reloadLatest()}>Reload Latest</button>}
      {discarding && <div ref={discardPrompt} role="alert" tabIndex={-1} className="alert alert-warning">
        <p>{uncertain ? 'The previous save may have succeeded. Close this draft and review the recorded actions?' : 'Discard unsaved changes?'}</p>
        <div className="d-flex gap-2 flex-wrap"><button type="button" className="btn btn-zg-secondary" onClick={() => setDiscarding(false)}>Keep Editing</button>
          <button type="button" className="btn btn-danger" onClick={() => { setDraft(null); setConfirming(false); setDiscarding(false); }}>Discard Draft</button></div>
      </div>}
      <form ref={form} noValidate onSubmit={e => { e.preventDefault(); void save(); }}>
        <div className="zg-readonly-field mb-3">Action Date/Time: {editing ? date(editing.actionAt) : 'Recorded when saved'}<br />Performed By: {editing?.performedBy?.name || 'Not completed'} (automatic completing user)</div>
        {textField('description', 'Action Description', true)}
        <div className="mb-3"><label htmlFor={`${fieldPrefix}-assignee`} className="zg-label">Assigned To <span aria-hidden="true" className="text-danger">*</span></label>
          <select id={`${fieldPrefix}-assignee`} name="assigneeId" className="zg-input" value={draft.assigneeId} disabled={busy || uncertain || membersLoading}
            aria-required="true" aria-invalid={!!errors.assigneeId} aria-describedby={errors.assigneeId ? `${fieldPrefix}-assignee-error` : undefined} onChange={e => change('assigneeId', Number(e.target.value))}>
            {editing && !members.some(m => m.id === editing.assignee.id) && <option value={editing.assignee.id}>{editing.assignee.name} (inactive or unavailable)</option>}
            {!editing && !members.length && <option value={currentUser.id}>{currentUser.name}</option>}
            {members.map(member => <option key={member.id} value={member.id}>{member.name} ({label(member.role)})</option>)}</select>
          {membersLoading && <p role="status">Loading assignees...</p>}
          {membersError && <div role="alert">{membersError} <button type="button" className="btn btn-zg-secondary" onClick={() => void loadMembers()}>Retry Assignees</button></div>}
          {errors.assigneeId && <div id={`${fieldPrefix}-assignee-error`} role="alert" className="zg-error-text">{errors.assigneeId}</div>}
        </div>
        <div className="mb-3"><label className="zg-label" htmlFor={`${fieldPrefix}-status`}>Status</label><select id={`${fieldPrefix}-status`} className="zg-input" value={draft.status} disabled={busy || uncertain} onChange={e => change('status', e.target.value as Status)}>
          {(editing ? [editing.status, ...next[editing.status]] : ['PLANNED', 'IN_PROGRESS', 'COMPLETED']).map(status => <option key={status} value={status}>{label(status)}</option>)}</select></div>
        {textField('result', 'Result', draft.status === 'COMPLETED')}
        <div className="form-check mb-3"><input id={`${fieldPrefix}-follow-up`} type="checkbox" className="form-check-input" checked={draft.followUpRequired} disabled={busy || uncertain} onChange={e => change('followUpRequired', e.target.checked)} />
          <label className="form-check-label" htmlFor={`${fieldPrefix}-follow-up`}>Follow-Up Required?</label></div>
        {draft.followUpRequired && textField('followUpNote', 'Follow-up Note', true)}
        {textField('attachmentNotes', 'Attachment Notes')}
        {draft.status === 'CANCELLED' && textField('cancelReason', 'Cancellation Reason', true)}
        {confirming && <div className="alert alert-warning"><p>This action will become read-only. Confirm the recorded {draft.status === 'COMPLETED' ? 'result' : 'reason'} before saving.</p>
          <button type="button" className="btn btn-zg-primary" disabled={busy} onClick={() => void save(true)}>{draft.status === 'COMPLETED' ? 'Confirm Completion' : 'Confirm Cancellation'}</button></div>}
        <div className="d-flex justify-content-between gap-3"><button type="button" className="btn btn-zg-secondary" disabled={busy} onClick={close}>Cancel</button>
          <button type="submit" className="btn btn-zg-primary" disabled={busy || conflict || membersLoading || !!membersError || confirming}>{busy ? 'Saving...' : uncertain ? 'Retry Previous Save' : editing ? 'Save Changes' : 'Save Action'}</button></div>
      </form>
    </ActionDialog>}
  </section>;
}
