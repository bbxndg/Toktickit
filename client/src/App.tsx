import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

type SystemStatus = 'idle' | 'loading' | 'online' | 'offline';

export interface Category {
  id: number;
  name: string;
}

function App() {
  const [status, setStatus] = useState<SystemStatus>('idle');
  const [serviceName, setServiceName] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkSystem = async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      // 1. Fetch Health Check API
      const healthRes = await fetch(`${API_BASE}/api/health`);
      if (!healthRes.ok) {
        throw new Error(`Health check failed with status: ${healthRes.status}`);
      }
      const healthData = await healthRes.json();

      // 2. Fetch Categories API
      const categoriesRes = await fetch(`${API_BASE}/api/categories`);
      if (!categoriesRes.ok) {
        throw new Error(`Categories fetch failed with status: ${categoriesRes.status}`);
      }
      const categoriesData: Category[] = await categoriesRes.json();

      if (healthData.status === 'ok') {
        setServiceName(healthData.service || 'TokTickIT API');
        setCategories(categoriesData);
        setStatus('online');
      } else {
        setStatus('offline');
        setErrorMessage('Invalid health response received from server.');
      }
    } catch {
      setStatus('offline');
      setCategories([]);
      setErrorMessage('Unable to connect to TokTickIT API or Database.');
    }
  };

  return (
    <div className="container py-5">
      <header className="pb-3 mb-4 border-bottom text-center">
        <h1 className="display-5 fw-bold text-primary">TokTickIT</h1>
        <p className="lead text-muted">IT Request &amp; Service Portal</p>
      </header>

      <main>
        <div className="p-5 mb-4 bg-light rounded-3 shadow-sm border text-center">
          <div className="container-fluid py-2">
            <h2 className="display-6 fw-bold mb-3 text-dark">System Health &amp; Diagnostics</h2>
            <p className="col-md-10 col-lg-8 fs-5 text-secondary mb-4 mx-auto text-center">
              Click below to verify the connection status of the TokTickIT backend API service and load IT request categories.
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

            {/* Loading State */}
            {status === 'loading' && (
              <div className="mt-4 text-muted d-flex align-items-center justify-content-center" role="status">
                <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                <span>Checking system health and loading categories...</span>
              </div>
            )}

            {/* Success State (Online & Categories Loaded) */}
            {status === 'online' && (
              <div className="mt-4 text-start">
                <div className="alert alert-success d-flex align-items-center shadow-sm" role="alert">
                  <span className="fs-5 me-2">✅</span>
                  <div data-testid="status-message">
                    <strong>System Status: Online</strong> — Connected to {serviceName}
                  </div>
                </div>

                <div className="card mt-4 shadow-sm border-0">
                  <div className="card-header bg-white border-bottom py-3">
                    <h3 className="h5 mb-0 fw-bold text-dark">Available IT Request Categories</h3>
                  </div>
                  <div className="card-body p-0">
                    <ul className="list-group list-group-flush" data-testid="category-list">
                      {categories.map((category) => (
                        <li
                          key={category.id}
                          className="list-group-item d-flex justify-content-between align-items-center py-3 px-4"
                          data-testid="category-item"
                        >
                          <span className="fw-medium text-dark">{category.name}</span>
                          <span className="badge bg-secondary rounded-pill">ID: #{category.id}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Offline / Error State */}
            {status === 'offline' && (
              <div className="alert alert-danger mt-4 d-flex align-items-center shadow-sm text-start" role="alert">
                <span className="fs-5 me-2">❌</span>
                <div data-testid="status-message">
                  <strong>System Status: Offline</strong> — {errorMessage || 'Unable to connect to TokTickIT API'}
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
