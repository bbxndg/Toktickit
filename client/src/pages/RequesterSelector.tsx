import React, { useState, useEffect } from 'react';
import { useRequester, RequesterUser } from '../context/RequesterContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const RequesterSelector: React.FC = () => {
  const { currentRequester, setRequester, isSelectorOpen, closeSelector } = useRequester();
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>(currentRequester?.id || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchRequesters = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/requesters`);
      if (!res.ok) {
        throw new Error(`Failed to load requesters (${res.status})`);
      }
      const data: RequesterUser[] = await res.json();
      setRequesters(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSelectorOpen) {
      fetchRequesters();
      if (currentRequester) {
        setSelectedId(currentRequester.id);
      }
    }
  }, [isSelectorOpen]);

  if (!isSelectorOpen) {
    return null;
  }

  const handleContinue = () => {
    const selected = requesters.find((r) => r.id === Number(selectedId));
    if (selected) {
      setRequester(selected);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(3px)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
        <div className="modal-content zg-card shadow-lg border-0 p-4">
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
              style={{ width: '56px', height: '56px', backgroundColor: 'var(--zg-pale)', color: 'var(--zg-primary)', fontSize: '24px' }}
            >
              👤
            </div>
            <h3 className="fw-bold mb-2" style={{ color: 'var(--zg-text-primary)' }}>
              Select Development Requester
            </h3>
            <p className="text-muted small mb-0">
              Choose a development requester to simulate the current requester context for Lab 2.
              <br />
              <strong>This is for testing only and is not a login screen.</strong>
            </p>
          </div>

          {loading ? (
            <div className="text-center py-4" data-testid="selector-loading">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading requesters...</span>
              </div>
              <p className="mt-2 text-muted small">Loading active development requesters from database...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger py-3" role="alert" data-testid="selector-error">
              <strong>Error:</strong> {error}
              <div className="mt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={fetchRequesters}
                >
                  Retry Connection
                </button>
              </div>
            </div>
          ) : requesters.length === 0 ? (
            <div className="alert alert-warning text-center" data-testid="selector-empty">
              No active development requesters found in the database. Please run the database seed script.
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <label htmlFor="requester-dropdown" className="zg-label">
                  Development Requester <span className="text-danger">*</span>
                </label>
                <select
                  id="requester-dropdown"
                  className="form-select zg-input"
                  value={selectedId}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                  data-testid="requester-dropdown"
                >
                  {requesters.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.name} ({req.department}) — {req.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Informational Callout 1 */}
              <div className="zg-callout-info mb-3 d-flex align-items-center">
                <span className="me-2 fs-5">ℹ️</span>
                <div>Only active development requesters are shown.</div>
              </div>

              {/* Informational Callout 2 (Lab 3 Notice) */}
              <div className="zg-callout-notice mb-4 d-flex align-items-start">
                <span className="me-2 fs-5">🛡️</span>
                <div>
                  <strong>Authentication coming in Lab 3</strong>
                  <br />
                  <small>
                    In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.
                  </small>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                {currentRequester && (
                  <button
                    type="button"
                    className="btn btn-zg-secondary px-4"
                    onClick={closeSelector}
                    data-testid="selector-cancel-btn"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-zg-primary px-4"
                  onClick={handleContinue}
                  disabled={!selectedId}
                  data-testid="selector-continue-btn"
                >
                  <span>Continue</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
