import React from 'react';
import { useRequester } from '../../context/RequesterContext';

interface NavbarProps {
  currentView: 'my-tickets' | 'create-ticket' | 'ticket-detail';
  onNavigate: (view: 'my-tickets' | 'create-ticket') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { currentRequester, openSelector } = useRequester();

  return (
    <nav className="navbar zg-navbar">
      <div className="container-fluid d-flex flex-column flex-lg-row justify-content-between align-items-center gap-2">
        {/* Brand */}
        <a
          className="navbar-brand text-white fw-bold d-flex align-items-center mb-0"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('my-tickets');
          }}
        >
          <span className="me-2 fs-4">🎫</span>
          <h1 className="h4 mb-0 text-white fw-bold d-inline" style={{ fontSize: '1.25rem' }}>
            TokTickIT
          </h1>
        </a>

        {/* Navigation Tabs */}
        {currentRequester && (
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
        )}

        {/* User Identity / Select Requester */}
        <div className="d-flex align-items-center justify-content-center">
          {currentRequester ? (
            <div className="zg-user-pill" data-testid="user-identity-badge">
              <span className="fs-6">👤</span>
              <div className="d-flex flex-column text-start">
                <strong style={{ fontSize: '0.875rem', lineHeight: '1.2' }}>{currentRequester.name}</strong>
                <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>{currentRequester.department}</small>
              </div>
              <button
                type="button"
                className="zg-user-pill-btn"
                onClick={openSelector}
                data-testid="change-requester-btn"
                title="Switch development requester"
              >
                (Change)
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-light fw-bold"
              onClick={openSelector}
              data-testid="select-requester-btn"
            >
              Select Requester
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
