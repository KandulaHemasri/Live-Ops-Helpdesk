const express = require('express');
const { createServer } = require('http');
const { Server: SocketIoServer } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

const io = new SocketIoServer(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',   
      'http://localhost:3001',      
      process.env.FRONTEND_URL || 'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'], 
});

app.use(cors());
app.use(express.json());

const ticketLocks = {};

const agentSessions = {};


app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    activeSessions: Object.keys(agentSessions).length,
    lockedTickets: Object.keys(ticketLocks).length,
  });
});


io.on('connection', (socket) => {
  console.log(`[CONNECTION] Agent connected: ${socket.id}`);

  socket.on('join_dashboard', (payload) => {
    const { agentId, agentName } = payload;

    // Register this agent's session
    agentSessions[socket.id] = {
      agentId,
      agentName,
      connectedAt: new Date(),
      lockedTickets: [],
    };

    console.log(`[JOIN_DASHBOARD] Agent "${agentName}" (${agentId}) joined - Socket: ${socket.id}`);

   
    io.emit('agent_online', {
      agentId,
      agentName,
      socketId: socket.id,
      timestamp: new Date(),
      totalAgentsOnline: Object.keys(agentSessions).length,
    });

    // Send the new agent the current state of all locked tickets
    socket.emit('initial_lock_state', {
      lockedTickets: ticketLocks,
      timestamp: new Date(),
    });

    console.log(`[DASHBOARD_UPDATED] Total agents online: ${Object.keys(agentSessions).length}`);
  });

  
  socket.on('lock_ticket', (payload) => {
    const { ticketId, agentId, agentName } = payload;
    const session = agentSessions[socket.id];

    if (!session) {
      socket.emit('lock_failed', {
        ticketId,
        reason: 'Session not found. Please rejoin the dashboard.',
        timestamp: new Date(),
      });
      return;
    }

    
    if (ticketLocks[ticketId] && ticketLocks[ticketId].socketId !== socket.id) {
      socket.emit('lock_failed', {
        ticketId,
        reason: `Ticket is locked by ${ticketLocks[ticketId].agentName}`,
        lockedBy: ticketLocks[ticketId].agentName,
        timestamp: new Date(),
      });
      console.log(
        `[LOCK_DENIED] Agent ${agentName} cannot lock ticket ${ticketId} (already locked by ${ticketLocks[ticketId].agentName})`
      );
      return;
    }

    ticketLocks[ticketId] = {
      lockedBy: agentId,
      socketId: socket.id,
      lockedAt: new Date(),
      agentName,
    };

    // Track locked ticket in agent session
    if (!session.lockedTickets.includes(ticketId)) {
      session.lockedTickets.push(ticketId);
    }

    console.log(`[LOCK_ACQUIRED] Ticket ${ticketId} locked by ${agentName}`);

    // Broadcast to all agents: ticket is now locked
    io.emit('ticket_locked', {
      ticketId,
      lockedBy: agentId,
      agentName,
      socketId: socket.id,
      timestamp: new Date(),
    });
  });


  socket.on('unlock_ticket', (payload) => {
    const { ticketId, agentId } = payload;
    const session = agentSessions[socket.id];

    if (!session) {
      return;
    }

    // Verify the agent trying to unlock actually has the lock
    if (ticketLocks[ticketId] && ticketLocks[ticketId].socketId !== socket.id) {
      console.log(
        `[UNLOCK_DENIED] Agent ${agentId} tried to unlock ticket ${ticketId} but doesn't own the lock`
      );
      return;
    }

    // Remove the lock
    if (ticketLocks[ticketId]) {
      delete ticketLocks[ticketId];
    }

    // Remove from agent's locked tickets list
    const ticketIndex = session.lockedTickets.indexOf(ticketId);
    if (ticketIndex > -1) {
      session.lockedTickets.splice(ticketIndex, 1);
    }

    console.log(`[LOCK_RELEASED] Ticket ${ticketId} unlocked by Agent ${agentId}`);

    // Broadcast to all agents: ticket is now unlocked
    io.emit('ticket_unlocked', {
      ticketId,
      unlockedBy: agentId,
      timestamp: new Date(),
    });
  });

 
  socket.on('disconnect', (reason) => {
    const session = agentSessions[socket.id];

    if (session) {
      console.log(
        `[DISCONNECT] Agent "${session.agentName}" (${session.agentId}) disconnected - Reason: ${reason}`
      );

  
      const lockedTickets = session.lockedTickets.slice(); // Create a copy
      lockedTickets.forEach((ticketId) => {
        if (ticketLocks[ticketId] && ticketLocks[ticketId].socketId === socket.id) {
          delete ticketLocks[ticketId];
          console.log(`[AUTO_UNLOCK] Ticket ${ticketId} auto-unlocked due to agent disconnect`);

          // Notify all remaining agents that this ticket was released
          io.emit('ticket_unlocked', {
            ticketId,
            unlockedBy: session.agentId,
            reason: `Auto-unlocked (${session.agentName} disconnected)`,
            timestamp: new Date(),
          });
        }
      });

   
      delete agentSessions[socket.id];
      console.log(
        `[SESSION_CLEANUP] Agent "${session.agentName}" session removed. Total agents online: ${
          Object.keys(agentSessions).length
        }`
      );

      io.emit('agent_offline', {
        agentId: session.agentId,
        agentName: session.agentName,
        socketId: socket.id,
        reason,
        timestamp: new Date(),
        totalAgentsOnline: Object.keys(agentSessions).length,
      });
    }
  });

  socket.on('heartbeat', () => {
    socket.emit('heartbeat_ack', { timestamp: new Date() });
  });

  socket.on('error', (error) => {
    console.error(`[SOCKET_ERROR] ${socket.id}: ${error.message}`);
  });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`
  Live Ops Helpdesk Backend Server Running            
  Port: ${PORT}         
  Node: ${process.version}         
  Socket.io: Ready for WebSocket connections      
  `);
});


process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] Received SIGTERM signal. Gracefully shutting down...');
  httpServer.close(() => {
    console.log('[SHUTDOWN] HTTP server closed.');
    process.exit(0);
  });
});

module.exports = { app, io, httpServer };
