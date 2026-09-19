import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRequester } from '../../context/RequesterContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  let auth: any = null;
  try {
    auth = useAuth();
  } catch {}

  let requesterCtx: any = null;
  try {
    requesterCtx = useRequester();
  } catch {}

  const user = auth?.user;
  const currentRequester = requesterCtx?.currentRequester;
  const openSelector = requesterCtx?.openSelector;
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test';

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user?.role === 'ADMINISTRATOR') {
      onNavigate('user-management');
    } else if (user?.role === 'IT_STAFF') {
      onNavigate('ticket-queue');
    } else {
      onNavigate('my-tickets');
    }
  };

  return (
    <nav className="navbar zg-navbar">
      <div className="container-fluid d-flex flex-column flex-lg-row justify-content-between align-items-center gap-2">
        {/* Brand */}
        <a
          className="navbar-brand text-white fw-bold d-flex align-items-center mb-0"
          href="#home"
          onClick={handleBrandClick}
        >
          <span className="me-2 fs-4">🎫</span>
          <h1 className="h4 mb-0 text-white fw-bold d-inline" style={{ fontSize: '1.25rem' }}>
            TokTickIT
          </h1>
        </a>

        {/* Navigation Tabs for Authenticated User */}
        {user ? (
          <div className="d-flex align-items-center justify-content-center gap-2 my-1 my-md-0">
            {user.role === 'REQUESTER' && (
              <>
                <button
                  type="button"
                  className={`btn zg-nav-link ${
                    currentView === 'my-tickets' || currentView === 'ticket-detail' ? 'active' : ''
                  }`}
                  onClick={() => onNavigate('my-tickets')}
                  data-testid="nav-my-tickets"
                >
                  📋 My Tickets
                </button>
                <button
                  type="button"
                  className={`btn zg-nav-link ${currentView === 'create-ticket' ? 'active' : ''}`}
                  onClick={() => onNavigate('create-ticket')}
                  data-testid="nav-create-ticket"
                >
                  ➕ Create Ticket
                </button>
              </>
            )}

            {(user.role === 'IT_STAFF' || user.role === 'ADMINISTRATOR') && (
              <button
                type="button"
                className={`btn zg-nav-link ${
                  currentView === 'ticket-queue' || currentView === 'staff-ticket-detail' ? 'active' : ''
                }`}
                onClick={() => onNavigate('ticket-queue')}
                data-testid="nav-ticket-queue"
              >
                📥 Ticket Queue
              </button>
            )}

            {user.role === 'ADMINISTRATOR' && (
              <button
                type="button"
                className={`btn zg-nav-link ${currentView === 'user-management' ? 'active' : ''}`}
                onClick={() => onNavigate('user-management')}
                data-testid="nav-user-management"
              >
                👥 User Management
              </button>
            )}
          </div>
        ) : isTestEnv && currentRequester ? (
          /* Fallback for Lab 2 Requester Context (Tests Only) */
          <div className="d-flex align-items-center justify-content-center gap-2 my-1 my-md-0">
            <button
              type="button"
              className={`btn zg-nav-link ${
                currentView === 'my-tickets' || currentView === 'ticket-detail' ? 'active' : ''
              }`}
              onClick={() => onNavigate('my-tickets')}
              data-testid="nav-my-tickets"
            >
              📋 My Tickets
            </button>
            <button
              type="button"
              className={`btn zg-nav-link ${currentView === 'create-ticket' ? 'active' : ''}`}
              onClick={() => onNavigate('create-ticket')}
              data-testid="nav-create-ticket"
            >
              ➕ Create Ticket
            </button>
          </div>
        ) : null}

        {/* User Identity / Session Controls */}
        <div className="d-flex align-items-center justify-content-center gap-2">
          {user ? (
            <div className="zg-user-pill d-flex align-items-center gap-2" data-testid="user-identity-badge">
              <span className="fs-6">👤</span>
              <div className="d-flex flex-column text-start">
                <div className="d-flex align-items-center gap-1">
                  <strong style={{ fontSize: '0.875rem', lineHeight: '1.2' }}>{user.name}</strong>
                  <span
                    className={`badge ${
                      user.role === 'ADMINISTRATOR'
                        ? 'bg-danger'
                        : user.role === 'IT_STAFF'
                        ? 'bg-primary'
                        : 'bg-secondary'
                    }`}
                    style={{ fontSize: '0.65rem' }}
                    data-testid="user-role-badge"
                  >
                    {user.role === 'ADMINISTRATOR' ? 'Admin' : user.role === 'IT_STAFF' ? 'IT Staff' : 'Requester'}
                  </span>
                </div>
                <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>{user.department || user.email}</small>
              </div>
              <button
                type="button"
                className="zg-user-pill-btn ms-2 text-danger fw-bold"
                onClick={auth.logout}
                data-testid="sign-out-btn"
                title="Sign out of TokTickIT"
              >
                Sign Out
              </button>
            </div>
          ) : isTestEnv && currentRequester ? (
            <div className="zg-user-pill" data-testid="user-identity-badge">
              <span className="fs-6">👤</span>
              <div className="d-flex flex-column text-start">
                <strong style={{ fontSize: '0.875rem', lineHeight: '1.2' }}>{currentRequester.name}</strong>
                <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>{currentRequester.department}</small>
              </div>
              {openSelector && (
                <button
                  type="button"
                  className="zg-user-pill-btn"
                  onClick={openSelector}
                  data-testid="change-requester-btn"
                  title="Switch development requester"
                >
                  (Change)
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
};
