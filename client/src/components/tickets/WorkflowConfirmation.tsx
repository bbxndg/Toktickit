import { useRef, useState } from 'react';
import { ActionDialog } from './ActionsTaken';

interface Props {
  target: string; ticketNumber: string; busy: boolean; error: string; conflict: boolean; available: boolean;
  onReload: () => void; onClose: () => void; onConfirm: (text: string) => void;
}
export function WorkflowConfirmation({ target, ticketNumber, busy, error, conflict, available, onReload, onClose, onConfirm }: Props) {
  const [text, setText] = useState(''), [validation, setValidation] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const required = target === 'RESOLVED' || target === 'CANCELLED';
  const label = target === 'RESOLVED' ? 'Resolution Summary' : target === 'CANCELLED' ? 'Cancellation Reason' : 'Closure Reason (Optional)';
  function submit() {
    const value = text.trim();
    if ((required || value) && (value.length < 2 || value.length > 2000)) {
      setValidation('Enter 2 to 2,000 characters.'); field.current?.focus(); return;
    }
    setValidation(''); onConfirm(value);
  }
  return <ActionDialog title="Confirm Ticket Status Transition" testId="terminal-status-modal" onClose={() => { if (!busy) onClose(); }}>
    <p>Transition Ticket <strong>{ticketNumber}</strong> to <strong>{target.replace(/_/g, ' ')}</strong>?</p>
    {target === 'CANCELLED' && <p className="alert alert-warning">Pending actions will be cancelled together. Completed and cancelled work will be retained.</p>}
    {target === 'CLOSED' && <p>This Ticket will be closed. Workflow and Actions Taken will become read-only.</p>}
    <p className="text-muted">Summaries and reasons are visible to the Requester.</p>
    {error && <div role="alert" className="alert alert-danger">{error}</div>}
    {conflict && <button type="button" className="btn btn-zg-secondary mb-3" disabled={busy} onClick={onReload}>Reload Latest Ticket</button>}
    {!available && <p role="alert">This transition is no longer available. Your draft is retained; close it and review the current Ticket.</p>}
    <form noValidate onSubmit={event => { event.preventDefault(); submit(); }}>
      <label htmlFor="ticket-workflow-reason" className="zg-label">{label}{required && ' *'}</label>
      <textarea ref={field} id="ticket-workflow-reason" className="form-control mb-2" rows={4} maxLength={2000}
        value={text} onChange={event => { setText(event.target.value); setValidation(''); }} disabled={busy}
        aria-required={required} aria-invalid={!!validation} aria-describedby="ticket-workflow-help ticket-workflow-error" data-testid="terminal-reason-input" />
      <small id="ticket-workflow-help" className="d-block mb-3">{required ? 'Required. ' : 'Optional. '}2 to 2,000 characters when provided.</small>
      <div id="ticket-workflow-error">{validation && <p className="zg-error-text" role="alert">{validation}</p>}</div>
      <div className="d-flex justify-content-between gap-3">
        <button type="button" className="btn btn-zg-secondary" disabled={busy} onClick={onClose} data-testid="cancel-terminal-btn">Cancel</button>
        <button type="submit" className="btn btn-zg-primary" disabled={busy || conflict || !available} data-testid="confirm-terminal-btn">{busy ? 'Saving...' : 'Confirm & Update Status'}</button>
      </div>
    </form>
  </ActionDialog>;
}
