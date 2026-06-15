import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import TicketList from './components/TicketList';
import TicketDetail from './components/TicketDetail';
import AgentStatus from './components/AgentStatus';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

function App() {
  const [socket, setSocket] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [agentName, setAgentName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const tickets = [
    { id: 'ticket_101', title: 'Shipment Delayed', description: 'Truck broke down on route 95', status: 'pending' },
    { id: 'ticket_102', title: 'Delivery Address Wrong', description: 'Customer entered incorrect address', status: 'open' },
    { id: 'ticket_103', title: 'Double Charge', description: 'Customer charged twice for order', status: 'pending' },
    { id: 'ticket_104', title: 'Missing Package', description: 'Package not found at warehouse', status: 'open' },
    { id: 'ticket_105', title: 'Damaged Goods', description: 'Box arrived with items damaged', status: 'pending' },
  ];
  
  const [lockedTickets, setLockedTickets] = useState({});
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [onlineAgents, setOnlineAgents] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Initialize Socket.io connection
  useEffect(() => {
    if (!isLoggedIn || !agentId) return;

    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection established
    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected:', newSocket.id);
      setConnectionStatus('connected');
      
      // Join dashboard and register agent
      newSocket.emit('join_dashboard', {
        agentId,
        agentName,
      });
    });

    // Receive initial lock state
    newSocket.on('initial_lock_state', (data) => {
      console.log('[SOCKET] Received initial lock state:', data.lockedTickets);
      setLockedTickets(data.lockedTickets);
    });

    // Ticket locked by another agent
    newSocket.on('ticket_locked', (data) => {
      console.log(`[SOCKET] Ticket ${data.ticketId} locked by ${data.agentName}`);
      setLockedTickets((prev) => ({
        ...prev,
        [data.ticketId]: data,
      }));
    });

    // Ticket unlocked
    newSocket.on('ticket_unlocked', (data) => {
      console.log(`[SOCKET] Ticket ${data.ticketId} unlocked`);
      setLockedTickets((prev) => {
        const updated = { ...prev };
        delete updated[data.ticketId];
        return updated;
      });
    });

    // Another agent went online
    newSocket.on('agent_online', (data) => {
      console.log(`[SOCKET] Agent online: ${data.agentName}`);
      setOnlineAgents(data.totalAgentsOnline);
    });

    // Another agent went offline
    newSocket.on('agent_offline', (data) => {
      console.log(`[SOCKET] Agent offline: ${data.agentName} (${data.reason})`);
      setOnlineAgents(data.totalAgentsOnline);
    });

    // Lock failed
    newSocket.on('lock_failed', (data) => {
      console.log(`[SOCKET] Lock failed for ${data.ticketId}: ${data.reason}`);
      alert(`Cannot edit this ticket: ${data.reason}`);
    });

    // Connection errors
    newSocket.on('error', (error) => {
      console.error('[SOCKET] Error:', error);
      setConnectionStatus('error');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isLoggedIn, agentId, agentName]);

  // Handle login
  const handleLogin = (id, name) => {
    setAgentId(id);
    setAgentName(name);
    setIsLoggedIn(true);
  };

  // Handle lock ticket
  const handleLockTicket = (ticketId) => {
    if (!socket) return;

    // Check if already locked by someone else
    if (lockedTickets[ticketId] && lockedTickets[ticketId].socketId !== socket.id) {
      alert(`This ticket is locked by ${lockedTickets[ticketId].agentName}`);
      return;
    }

    // Emit lock event
    socket.emit('lock_ticket', {
      ticketId,
      agentId,
      agentName,
    });

    setSelectedTicketId(ticketId);
  };

  // Handle unlock ticket
  const handleUnlockTicket = (ticketId) => {
    if (!socket) return;

    socket.emit('unlock_ticket', {
      ticketId,
      agentId,
    });

    setSelectedTicketId(null);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const selectedTicket = selectedTicketId ? tickets.find((t) => t.id === selectedTicketId) : null;
  const lockInfo = selectedTicketId ? lockedTickets[selectedTicketId] : null;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>🚚 Live Ops Helpdesk</h1>
          <p>RapidDispatch - Real-Time Collaborative Support</p>
        </div>
        <div className="header-right">
          <AgentStatus
            agentName={agentName}
            connectionStatus={connectionStatus}
            onlineAgents={onlineAgents}
          />
        </div>
      </header>

      <main className="app-main">
        <section className="sidebar">
          <TicketList
            tickets={tickets}
            lockedTickets={lockedTickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={handleLockTicket}
            currentAgentSocketId={socket?.id}
          />
        </section>

        <section className="content">
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              isLocked={!!lockInfo}
              lockInfo={lockInfo}
              currentSocketId={socket?.id}
              onUnlock={() => handleUnlockTicket(selectedTicket.id)}
              onClose={() => {
                if (lockInfo && lockInfo.socketId === socket.id) {
                  handleUnlockTicket(selectedTicket.id);
                } else {
                  setSelectedTicketId(null);
                }
              }}
            />
          ) : (
            <div className="empty-state">
              <h2>📋 Select a Ticket</h2>
              <p>Click on any ticket from the list to view details and help the customer.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [agentId, setAgentId] = useState('');
  const [agentName, setAgentName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (agentId.trim() && agentName.trim()) {
      onLogin(agentId, agentName);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🚚 Live Ops Helpdesk</h1>
        <p>RapidDispatch Support System</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Agent ID (e.g., agent_001)"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Agent Name (e.g., John Smith)"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <p className="login-hint">👥 For testing: Use different agent IDs in separate browser windows</p>
      </div>
    </div>
  );
}

export default App;
