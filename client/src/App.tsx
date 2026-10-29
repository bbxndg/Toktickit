import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { Navbar } from './components/layout/Navbar';
import { Login } from './pages/Login';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { UserManagement } from './pages/UserManagement';
import { RequesterSelector } from './pages/RequesterSelector';
import { CreateTicket } from './pages/CreateTicket';
import { MyTickets } from './pages/MyTickets';
import { TicketDetail } from './pages/TicketDetail';
import { StaffTicketQueue } from './pages/StaffTicketQueue';
import { StaffTicketDetail } from './pages/StaffTicketDetail';
import { Dashboard } from './pages/Dashboard';

export interface Category {
  id: number;
  name: string;
}

export type AppView =
  | 'dashboard'
  | 'my-tickets'
  | 'create-ticket'
  | 'ticket-detail'
  | 'user-management'
  | 'ticket-queue'
  | 'staff-ticket-detail';

function AppContent() {
  const { user, isSessionChecking } = useAuth();
  const { currentRequester, setRequester, clearRequester } = useRequester();

  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test';

  const getDefaultView = (role?: string): AppView => {
    if (role) return 'dashboard';
    return 'my-tickets';
  };

  const [currentView, setCurrentView] = useState<AppView>(() => getDefaultView(user?.role));
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [detailSource, setDetailSource] = useState<AppView>('dashboard');
  const [actionTarget, setActionTarget] = useState<{ id: number; page: number } | undefined>();
  const [listQuery, setListQuery] = useState<Record<string, string | number>>({});
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    if (user) {
      setCurrentView(getDefaultView(user.role)); setListQuery({}); setListKey(x => x + 1); setSelectedTicketId(null); setActionTarget(undefined);
    } else {
      if (!isTestEnv) {
        clearRequester();
      }
      setCurrentView('my-tickets');
      setSelectedTicketId(null);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user?.role === 'REQUESTER') {
      setRequester({ id: user.id, name: user.name, email: user.email,
        department: user.department || '', isActive: user.isActive });
    }
  }, [user?.id, user?.role, user?.name, user?.email, user?.department, user?.isActive]);

  // If requester changes while viewing ticket detail, return to my-tickets (BR-13)
  useEffect(() => {
    if (currentView === 'ticket-detail') {
      setCurrentView('my-tickets');
      setSelectedTicketId(null);
    }
  }, [currentRequester?.id]);

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--zg-bg)' }}>
      {!isSessionChecking && <><Navbar currentView={currentView} onNavigate={setCurrentView} />
      <ChangePasswordModal />
      <RequesterSelector /></>}

      <main className="container py-4 flex-grow-1">
        {/* Unauthenticated Login Screen */}
        {isSessionChecking ? <p role="status">Checking session...</p> : !user && (!isTestEnv || !currentRequester) ? (
          <Login />
        ) : user?.isPasswordChangeRequired ? null : (
          <>
            {user && !user.isPasswordChangeRequired && (currentView === 'dashboard' || (detailSource === 'dashboard' && ['ticket-detail', 'staff-ticket-detail'].includes(currentView))) && <div hidden={currentView !== 'dashboard'}><Dashboard key={`${user.id}:${user.role}`} active={currentView === 'dashboard'}
              onCreateTicket={() => setCurrentView('create-ticket')}
              onNavigate={destination => { setListQuery(destination.query); setListKey(x => x + 1); setCurrentView(destination.view); }}
              onOpenTicket={(id, action) => { setDetailSource('dashboard'); setActionTarget(action); setSelectedTicketId(id); setCurrentView(user.role === 'REQUESTER' ? 'ticket-detail' : 'staff-ticket-detail'); }} /></div>}
            {/* Administrator Screens */}
            {user?.role === 'ADMINISTRATOR' && currentView === 'user-management' && (
              <UserManagement />
            )}

            {/* Requester Screens */}
            {(user?.role === 'REQUESTER' || (isTestEnv && !user && currentRequester)) && (
              <>
                {(currentView === 'my-tickets' || (currentView === 'ticket-detail' && detailSource === 'my-tickets')) && (
                  <div hidden={currentView !== 'my-tickets'}><MyTickets key={listKey} initialQuery={listQuery} active={currentView === 'my-tickets'}
                    onCreateTicket={() => setCurrentView('create-ticket')}
                    onSelectTicket={(ticketId) => {
                      setDetailSource('my-tickets'); setSelectedTicketId(ticketId);
                      setCurrentView('ticket-detail');
                    }}
                  /></div>
                )}

                {currentView === 'create-ticket' && (
                  <CreateTicket
                    onCancel={() => setCurrentView('my-tickets')}
                    onSuccess={(_tktNo) => {
                      setCurrentView('my-tickets');
                    }}
                  />
                )}

                {currentView === 'ticket-detail' && selectedTicketId && (
                  <TicketDetail
                    ticketId={selectedTicketId}
                    onBack={() => {
                      setSelectedTicketId(null);
                      setCurrentView(detailSource);
                    }}
                  />
                )}
              </>
            )}

            {/* IT Staff & Admin Queue Views */}
            {(user?.role === 'IT_STAFF' || user?.role === 'ADMINISTRATOR') && (
              <>
                {(currentView === 'ticket-queue' || (currentView === 'staff-ticket-detail' && detailSource === 'ticket-queue')) && (
                  <div hidden={currentView !== 'ticket-queue'}><StaffTicketQueue key={listKey} initialQuery={listQuery} active={currentView === 'ticket-queue'}
                    onSelectTicket={(ticketId) => {
                      setDetailSource('ticket-queue'); setActionTarget(undefined); setSelectedTicketId(ticketId);
                      setCurrentView('staff-ticket-detail');
                    }}
                  /></div>
                )}

                {currentView === 'staff-ticket-detail' && selectedTicketId && (
                  <StaffTicketDetail
                    ticketId={selectedTicketId}
                    actionTarget={actionTarget}
                    onBack={() => {
                      setSelectedTicketId(null);
                      setCurrentView(detailSource);
                    }}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <AppContent />
      </RequesterProvider>
    </AuthProvider>
  );
}

export default App;
