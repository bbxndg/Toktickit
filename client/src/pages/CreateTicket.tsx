import React, { useState, useEffect, useRef } from 'react';
import { useRequester } from '../context/RequesterContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface OptionItem {
  id: number;
  name: string;
}

interface CreateTicketProps {
  onCancel: () => void;
  onSuccess: (ticketNumber: string) => void;
}

interface ValidationErrors {
  category?: string;
  relatedSystem?: string;
  priority?: string;
  summary?: string;
  description?: string;
  attachments?: string;
}

export const CreateTicket: React.FC<CreateTicketProps> = ({ onCancel, onSuccess }) => {
  const { currentRequester, openSelector } = useRequester();

  // Reference data state
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<OptionItem[]>([]);
  const [loadingRefData, setLoadingRefData] = useState<boolean>(true);

  // Form inputs state
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [relatedSystemId, setRelatedSystemId] = useState<number | ''>('');
  const [requestedPriority, setRequestedPriority] = useState<string>('MEDIUM');
  const [summary, setSummary] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);

  // Submission & Validation states
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string>('');
  const [successTicketNumber, setSuccessTicketNumber] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Categories and Related Systems
  useEffect(() => {
    const fetchRefData = async () => {
      setLoadingRefData(true);
      try {
        const [catRes, sysRes] = await Promise.all([
          fetch(`${API_BASE}/api/categories`),
          fetch(`${API_BASE}/api/related-systems`),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
          if (catData.length > 0) setCategoryId(catData[0].id);
        }

        if (sysRes.ok) {
          const sysData = await sysRes.json();
          setRelatedSystems(sysData);
          if (sysData.length > 0) setRelatedSystemId(sysData[0].id);
        }
      } catch (err) {
        console.error('Failed to load reference data:', err);
      } finally {
        setLoadingRefData(false);
      }
    };

    fetchRefData();
  }, []);

  // Format Current Date
  const formattedCurrentDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(new Date());

  // Handle Attachment Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    const newAttachments = [...attachments];
    let fileError = '';

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        fileError = `File "${file.name}" has an invalid type. Only JPG, PNG, WEBP, and PDF files are permitted.`;
        break;
      }
      if (file.size > maxSizeBytes) {
        fileError = `File "${file.name}" exceeds the 5 MB maximum size limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
        break;
      }
      if (newAttachments.length >= 5) {
        fileError = 'You can attach a maximum of 5 files per ticket.';
        break;
      }
      newAttachments.push(file);
    }

    if (fileError) {
      setErrors((prev) => ({ ...prev, attachments: fileError }));
    } else {
      setErrors((prev) => ({ ...prev, attachments: undefined }));
      setAttachments(newAttachments);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setErrors((prev) => ({ ...prev, attachments: undefined }));
  };

  // Client-side Validation
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!categoryId) {
      newErrors.category = 'Please select a ticket category.';
    }
    if (!relatedSystemId) {
      newErrors.relatedSystem = 'Please select an affected system.';
    }
    if (!requestedPriority) {
      newErrors.priority = 'Please choose a priority level.';
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      newErrors.summary = 'Ticket summary is required.';
    } else if (trimmedSummary.length < 5) {
      newErrors.summary = 'Summary must be at least 5 characters.';
    } else if (trimmedSummary.length > 100) {
      newErrors.summary = 'Summary cannot exceed 100 characters.';
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      newErrors.description = 'Description is required.';
    } else if (trimmedDesc.length < 10) {
      newErrors.description = 'Description must be at least 10 characters.';
    } else if (trimmedDesc.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!currentRequester) {
      openSelector();
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('requesterId', String(currentRequester.id));
      formData.append('categoryId', String(categoryId));
      formData.append('relatedSystemId', String(relatedSystemId));
      formData.append('requestedPriority', requestedPriority);
      formData.append('summary', summary.trim());
      formData.append('description', description.trim());

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.details) {
          const backendErrors: ValidationErrors = {};
          data.error.details.forEach((d: { field: string; message: string }) => {
            if (d.field === 'summary') backendErrors.summary = d.message;
            if (d.field === 'description') backendErrors.description = d.message;
            if (d.field === 'categoryId') backendErrors.category = d.message;
            if (d.field === 'relatedSystemId') backendErrors.relatedSystem = d.message;
            if (d.field === 'attachments') backendErrors.attachments = d.message;
          });
          setErrors(backendErrors);
          setServerError(data.error.message || 'Please fix the errors below.');
        } else {
          setServerError(data.error?.message || 'Failed to create ticket.');
        }
        return;
      }

      // Success
      setSuccessTicketNumber(data.ticketNumber);
      onSuccess(data.ticketNumber);
    } catch (err: any) {
      setServerError('Network error: Unable to connect to TokTickIT server. Your inputs have been preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  // If Ticket Created Successfully Modal / Banner
  if (successTicketNumber) {
    return (
      <div className="zg-card p-5 text-center shadow-sm mx-auto" style={{ maxWidth: '650px' }}>
        <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: '64px', height: '64px', backgroundColor: 'var(--zg-pale)', color: 'var(--zg-primary)', fontSize: '32px' }}>
          ✅
        </div>
        <h3 className="fw-bold mb-2" style={{ color: 'var(--zg-primary)' }}>Ticket Created Successfully</h3>
        <p className="text-muted mb-4">
          Your IT support request has been registered in the system.
        </p>

        <div className="p-3 mb-4 rounded bg-light border">
          <small className="text-muted d-block mb-1 text-uppercase fw-bold">Official Ticket Number</small>
          <span className="fs-3 fw-bold text-dark" data-testid="generated-ticket-number">{successTicketNumber}</span>
        </div>

        <div className="d-flex justify-content-center gap-3">
          <button
            type="button"
            className="btn btn-zg-primary px-4"
            onClick={onCancel}
            data-testid="view-my-tickets-btn"
          >
            View in My Tickets
          </button>
          <button
            type="button"
            className="btn btn-zg-secondary px-4"
            onClick={() => {
              setSuccessTicketNumber(null);
              setSummary('');
              setDescription('');
              setAttachments([]);
              setErrors({});
            }}
          >
            Create Another Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-2" style={{ maxWidth: '900px' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: 'var(--zg-text-primary)' }}>
            Create IT Support Ticket
          </h2>
          <p className="text-muted small mb-0">Fill in the details below to request IT service or report an issue.</p>
        </div>
        <button type="button" className="btn btn-sm btn-zg-secondary" onClick={onCancel}>
          ← Back to My Tickets
        </button>
      </div>

      {serverError && (
        <div className="alert alert-danger py-2 mb-3 shadow-sm" role="alert" data-testid="create-ticket-server-error">
          <span className="fw-bold me-2">⚠️ Error:</span> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="zg-card p-4 shadow-sm mb-4">
          {/* Header Metadata Section (Read-Only) */}
          <div className="row g-3 mb-4 p-3 rounded" style={{ backgroundColor: 'var(--zg-bg)' }}>
            <div className="col-md-4">
              <label className="zg-label">Ticket Number</label>
              <input
                type="text"
                className="form-control zg-input zg-readonly-field"
                value="[Generated after submission]"
                readOnly
                disabled
              />
            </div>
            <div className="col-md-4">
              <label className="zg-label">Ticket Date</label>
              <input
                type="text"
                className="form-control zg-input zg-readonly-field"
                value={formattedCurrentDate}
                readOnly
                disabled
              />
            </div>
            <div className="col-md-4">
              <label className="zg-label">Requester</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control zg-input zg-readonly-field"
                  value={currentRequester ? currentRequester.name : 'No user selected'}
                  readOnly
                  disabled
                  data-testid="ticket-requester-field"
                />
                {!currentRequester && (
                  <button
                    type="button"
                    className="btn btn-sm btn-zg-secondary"
                    onClick={openSelector}
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Classification Section */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label htmlFor="category-select" className="zg-label">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="category-select"
                className={`form-select zg-input ${errors.category ? 'is-invalid' : ''}`}
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                disabled={loadingRefData}
                data-testid="category-select"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category && <span className="zg-error-text" data-testid="error-category">{errors.category}</span>}
            </div>

            <div className="col-md-4">
              <label htmlFor="system-select" className="zg-label">
                Related System <span className="text-danger">*</span>
              </label>
              <select
                id="system-select"
                className={`form-select zg-input ${errors.relatedSystem ? 'is-invalid' : ''}`}
                value={relatedSystemId}
                onChange={(e) => setRelatedSystemId(Number(e.target.value))}
                disabled={loadingRefData}
                data-testid="system-select"
              >
                {relatedSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.relatedSystem && (
                <span className="zg-error-text" data-testid="error-relatedSystem">{errors.relatedSystem}</span>
              )}
            </div>

            <div className="col-md-4">
              <label htmlFor="priority-select" className="zg-label">
                Requested Priority <span className="text-danger">*</span>
              </label>
              <select
                id="priority-select"
                className={`form-select zg-input ${errors.priority ? 'is-invalid' : ''}`}
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value)}
                data-testid="priority-select"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              {errors.priority && <span className="zg-error-text" data-testid="error-priority">{errors.priority}</span>}
            </div>
          </div>

          {/* Ticket Summary */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="ticket-summary" className="zg-label mb-0">
                Ticket Summary <span className="text-danger">*</span>
              </label>
              <small className="text-muted">{summary.length}/100 characters</small>
            </div>
            <input
              id="ticket-summary"
              type="text"
              className={`form-control zg-input ${errors.summary ? 'is-invalid' : ''}`}
              placeholder="e.g., Laptop battery drains quickly or Cannot connect to VPN"
              maxLength={100}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              data-testid="ticket-summary-input"
            />
            {errors.summary && <span className="zg-error-text" data-testid="error-summary">{errors.summary}</span>}
          </div>

          {/* Description */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="ticket-description" className="zg-label mb-0">
                Description <span className="text-danger">*</span>
              </label>
              <small className="text-muted">{description.length}/2000 characters</small>
            </div>
            <textarea
              id="ticket-description"
              rows={5}
              className={`form-control zg-input ${errors.description ? 'is-invalid' : ''}`}
              placeholder="Please provide detailed information about the issue, error messages, and steps to reproduce..."
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical', minHeight: '120px' }}
              data-testid="ticket-description-input"
            />
            {errors.description && (
              <span className="zg-error-text" data-testid="error-description">{errors.description}</span>
            )}
          </div>

          {/* Attachment Upload Section */}
          <div className="mb-3">
            <label className="zg-label d-block">Supporting Attachments (Optional)</label>
            <div className="p-3 border rounded bg-light">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="d-none"
                  id="attachment-file-input"
                  data-testid="attachment-input"
                />
                <button
                  type="button"
                  className="btn btn-sm btn-zg-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= 5}
                >
                  📎 Choose Files ({attachments.length}/5)
                </button>
                <small className="text-muted">
                  Allowed: JPG, PNG, WEBP, PDF (Max 5 MB each, up to 5 files)
                </small>
              </div>

              {errors.attachments && (
                <div className="alert alert-danger py-2 mt-2 mb-2 small" data-testid="error-attachments">
                  {errors.attachments}
                </div>
              )}

              {attachments.length > 0 && (
                <ul className="list-group list-group-flush mt-2">
                  {attachments.map((file, idx) => (
                    <li
                      key={idx}
                      className="list-group-item d-flex justify-content-between align-items-center py-2 px-0 bg-transparent"
                    >
                      <div className="d-flex align-items-center text-truncate">
                        <span className="me-2">📄</span>
                        <span className="fw-medium text-dark text-truncate me-2">{file.name}</span>
                        <span className="badge bg-secondary rounded-pill me-2">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0 px-2"
                        onClick={() => removeAttachment(idx)}
                        title="Remove attachment"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-zg-secondary px-4"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-zg-primary px-5"
            disabled={submitting || !currentRequester}
            data-testid="submit-ticket-btn"
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <span>Submitting...</span>
              </>
            ) : (
              'Submit Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
