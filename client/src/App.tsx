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

export interface Category {
  id: number;
  name: string;
}

export type AppView =
  | 'my-tickets'
  | 'create-ticket'
  | 'ticket-detail'
  | 'user-management'
  | 'ticket-queue'
  | 'staff-ticket-detail';

function AppContent() {
  const { user } = useAuth();
  const { currentRequester, setRequester, clearRequester } = useRequester();

  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test';

  const getDefaultView = (role?: string): AppView => {
    if (role === 'ADMINISTRATOR') return 'user-management';
    if (role === 'IT_STAFF') return 'ticket-queue';
    return 'my-tickets';
  };

  const [currentView, setCurrentView] = useState<AppView>(() => getDefaultView(user?.role));
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentView(getDefaultView(user.role));
      if (user.role === 'REQUESTER') {
        setRequester({
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department || '',
          isActive: user.isActive,
        });
      }
    } else {
      if (!isTestEnv) {
        clearRequester();
      }
      setCurrentView('my-tickets');
      setSelectedTicketId(null);
    }
  }, [user]);

  // If requester changes while viewing ticket detail, return to my-tickets (BR-13)
  useEffect(() => {
    if (currentView === 'ticket-detail') {
      setCurrentView('my-tickets');
      setSelectedTicketId(null);
    }
  }, [currentRequester]);

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--zg-bg)' }}>
      <Navbar currentView={currentView} onNavigate={setCurrentView} />
      <ChangePasswordModal />
      <RequesterSelector />

      <main className="container py-4 flex-grow-1">
        {/* Unauthenticated Login Screen */}
        {!user && (!isTestEnv || !currentRequester) ? (
          <Login />
        ) : (
          <>
            {/* Administrator Screens */}
            {user?.role === 'ADMINISTRATOR' && currentView === 'user-management' && (
              <UserManagement />
            )}

            {/* Requester Screens */}
            {(user?.role === 'REQUESTER' || (isTestEnv && !user && currentRequester)) && (
              <>
                {currentView === 'my-tickets' && (
                  <MyTickets
                    onCreateTicket={() => setCurrentView('create-ticket')}
                    onSelectTicket={(ticketId) => {
                      setSelectedTicketId(ticketId);
                      setCurrentView('ticket-detail');
                    }}
                  />
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
                      setCurrentView('my-tickets');
                    }}
                  />
                )}
              </>
            )}

            {/* IT Staff & Admin Queue Views */}
            {(user?.role === 'IT_STAFF' || user?.role === 'ADMINISTRATOR') && (
              <>
                {currentView === 'ticket-queue' && (
                  <StaffTicketQueue
                    onSelectTicket={(ticketId) => {
                      setSelectedTicketId(ticketId);
                      setCurrentView('staff-ticket-detail');
                    }}
                  />
                )}

                {currentView === 'staff-ticket-detail' && selectedTicketId && (
                  <StaffTicketDetail
                    ticketId={selectedTicketId}
                    onBack={() => {
                      setSelectedTicketId(null);
                      setCurrentView('ticket-queue');
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
