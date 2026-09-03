import React from 'react';
import { useRequester } from '../../context/RequesterContext';

interface NavbarProps {
  currentView: 'my-tickets' | 'create-ticket' | 'ticket-detail' | 'health-diagnostic';
  onNavigate: (view: 'my-tickets' | 'create-ticket' | 'health-diagnostic') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { currentRequester, openSelector } = useRequester();

  return (
    <nav className="navbar navbar-expand-lg zg-navbar">
      <div className="container-fluid">
        <a
          className="navbar-brand text-white fw-bold d-flex align-items-center"
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

        <div className="d-flex align-items-center ms-4 me-auto gap-2">
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

        <div className="d-flex align-items-center">
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
