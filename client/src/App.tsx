import { useState } from 'react';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { Navbar } from './components/layout/Navbar';
import { RequesterSelector } from './pages/RequesterSelector';
import { CreateTicket } from './pages/CreateTicket';
import { MyTickets } from './pages/MyTickets';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

type SystemStatus = 'idle' | 'loading' | 'online' | 'offline';

export interface Category {
  id: number;
  name: string;
}

function AppContent() {
  const { currentRequester } = useRequester();
  const [currentView, setCurrentView] = useState<'my-tickets' | 'create-ticket' | 'health-diagnostic'>('my-tickets');

  // Diagnostic states
  const [status, setStatus] = useState<SystemStatus>('idle');
  const [serviceName, setServiceName] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkSystem = async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const healthRes = await fetch(`${API_BASE}/api/health`);
      if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);
      const healthData = await healthRes.json();

      const categoriesRes = await fetch(`${API_BASE}/api/categories`);
      if (!categoriesRes.ok) throw new Error(`Categories fetch failed: ${categoriesRes.status}`);
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
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--zg-bg)' }}>
      <Navbar currentView={currentView} onNavigate={setCurrentView} />
      <RequesterSelector />

      <main className="container py-4 flex-grow-1">
        {currentView === 'my-tickets' && (
          <MyTickets
            onCreateTicket={() => setCurrentView('create-ticket')}
            onSelectTicket={(ticketId) => {
              console.log('Selected ticket id:', ticketId);
              // Will navigate to detail in Issue 5
            }}
          />
        )}

        {currentView === 'create-ticket' && (
          <CreateTicket
            onCancel={() => setCurrentView('my-tickets')}
            onSuccess={(_tktNo) => {
              // Redirect back to my tickets to see newly created ticket
              setCurrentView('my-tickets');
            }}
          />
        )}

        {/* Hidden/Collapsible Diagnostic Section for backward compatibility & health checks */}
        <section className="mt-5 pt-4 border-top">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="text-muted text-uppercase fw-bold mb-0">System Health &amp; Diagnostics</h6>
            <button
              id="check-system-btn"
              className="btn btn-sm btn-outline-secondary"
              type="button"
              onClick={checkSystem}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Loading...' : 'Check System'}
            </button>
          </div>

          {status === 'loading' && (
            <div className="text-muted small" role="status">
              <span className="spinner-border spinner-border-sm text-primary me-2"></span>
              Checking system health and loading categories...
            </div>
          )}

          {status === 'online' && (
            <div className="mt-3">
              <div className="alert alert-success py-2 shadow-sm" role="alert">
                <div data-testid="status-message">
                  <strong>System Status: Online</strong> — Connected to {serviceName}
                </div>
              </div>

              <div className="card shadow-sm border-0">
                <ul className="list-group list-group-flush" data-testid="category-list">
                  {categories.map((category) => (
                    <li
                      key={category.id}
                      className="list-group-item d-flex justify-content-between align-items-center py-2 px-3"
                      data-testid="category-item"
                    >
                      <span>{category.name}</span>
                      <span className="badge bg-secondary">ID: #{category.id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {status === 'offline' && (
            <div className="alert alert-danger mt-3 py-2 shadow-sm" role="alert">
              <div data-testid="status-message">
                <strong>System Status: Offline</strong> — {errorMessage || 'Unable to connect to TokTickIT API'}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function App() {
  return (
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}

export default App;
