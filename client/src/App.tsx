import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

type SystemStatus = 'idle' | 'loading' | 'online' | 'offline';

function App() {
  const [status, setStatus] = useState<SystemStatus>('idle');
  const [serviceName, setServiceName] = useState<string>('');

  const checkSystem = async () => {
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.status === 'ok') {
        setServiceName(data.service || 'TokTickIT API');
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    }
  };

  return (
    <div className="container py-5">
      <header className="pb-3 mb-4 border-bottom">
        <h1 className="display-5 fw-bold text-primary">TokTickIT</h1>
        <p className="lead text-muted">IT Request &amp; Service Portal</p>
      </header>

      <main>
        <div className="p-5 mb-4 bg-light rounded-3 shadow-sm border">
          <div className="container-fluid py-2">
            <h2 className="display-6 fw-bold mb-3">System Health &amp; Diagnostics</h2>
            <p className="col-md-8 fs-5 text-secondary mb-4">
              Click below to verify the connection status of the TokTickIT backend API service.
            </p>

            <button
              id="check-system-btn"
              className="btn btn-primary btn-lg px-4"
              type="button"
              onClick={checkSystem}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Loading...
                </>
              ) : (
                'Check System'
              )}
            </button>

            {status === 'loading' && (
              <div className="mt-4 text-muted d-flex align-items-center" role="status">
                <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                <span>Checking system health...</span>
              </div>
            )}

            {status === 'online' && (
              <div className="alert alert-success mt-4 d-flex align-items-center shadow-sm" role="alert">
                <span className="fs-5 me-2">✅</span>
                <div data-testid="status-message">
                  <strong>System Status: Online</strong> — Connected to {serviceName}
                </div>
              </div>
            )}

            {status === 'offline' && (
              <div className="alert alert-danger mt-4 d-flex align-items-center shadow-sm" role="alert">
                <span className="fs-5 me-2">❌</span>
                <div data-testid="status-message">
                  <strong>System Status: Offline</strong> — Unable to connect to TokTickIT API
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
