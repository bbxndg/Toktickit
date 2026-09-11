import { useState, useEffect } from 'react';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { Navbar } from './components/layout/Navbar';
import { RequesterSelector } from './pages/RequesterSelector';
import { CreateTicket } from './pages/CreateTicket';
import { MyTickets } from './pages/MyTickets';
import { TicketDetail } from './pages/TicketDetail';

export interface Category {
  id: number;
  name: string;
}

function AppContent() {
  const { currentRequester } = useRequester();
  const [currentView, setCurrentView] = useState<'my-tickets' | 'create-ticket' | 'ticket-detail'>('my-tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

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
      <RequesterSelector />

      <main className="container py-4 flex-grow-1">
        {currentRequester && currentView === 'my-tickets' && (
          <MyTickets
            onCreateTicket={() => setCurrentView('create-ticket')}
            onSelectTicket={(ticketId) => {
              setSelectedTicketId(ticketId);
              setCurrentView('ticket-detail');
            }}
          />
        )}

        {currentRequester && currentView === 'create-ticket' && (
          <CreateTicket
            onCancel={() => setCurrentView('my-tickets')}
            onSuccess={(_tktNo) => {
              // Redirect back to my tickets to see newly created ticket
              setCurrentView('my-tickets');
            }}
          />
        )}

        {currentRequester && currentView === 'ticket-detail' && selectedTicketId && (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={() => {
              setSelectedTicketId(null);
              setCurrentView('my-tickets');
            }}
          />
        )}
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
