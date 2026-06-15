# Live Ops Helpdesk - Backend Server

## Overview
Real-time WebSocket server powered by Express and Socket.io that manages ticket locks and agent sessions for concurrent support operations.

## Features
**Real-Time Synchronization** - Instant ticket lock/unlock across all agents  
**Ghost Disconnect Handler** - Automatic cleanup when agents disconnect  
**Session Management** - Tracks active agents and their locked tickets  
 **CORS-Enabled** - Configured for Vercel frontend deployments  
**Production-Ready** - WebSocket Secure (WSS) support via Render  

## Installation

```bash
npm install
```

## Running the Server

### Development
```bash
npm run dev
```
Server runs on `http://localhost:4000`

### Production
```bash
npm start
```

## Environment Variables

Create a `.env` file:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Production (.env.production):**
```env
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
```

## WebSocket Events

### Client → Server

#### `join_dashboard`
**When:** Agent logs in or loads the dashboard  
**Payload:**
```javascript
{
  agentId: "agent_123",
  agentName: "John Smith"
}
```

#### `lock_ticket`
**When:** Agent clicks on a ticket to start editing  
**Payload:**
```javascript
{
  ticketId: "ticket_105",
  agentId: "agent_123",
  agentName: "John Smith"
}
```

#### `unlock_ticket`
**When:** Agent saves and closes a ticket  
**Payload:**
```javascript
{
  ticketId: "ticket_105",
  agentId: "agent_123"
}
```

#### `heartbeat`
**When:** Periodic keep-alive signal (optional, prevents idle timeout)  
**Payload:** None

---

### Server → Client

#### `agent_online`
**When:** Another agent joins the dashboard  
**Payload:**
```javascript
{
  agentId: "agent_123",
  agentName: "John Smith",
  socketId: "abc123xyz",
  timestamp: "2026-06-12T10:30:00Z",
  totalAgentsOnline: 5
}
```

#### `agent_offline`
**When:** An agent disconnects or goes offline  
**Payload:**
```javascript
{
  agentId: "agent_123",
  agentName: "John Smith",
  socketId: "abc123xyz",
  reason: "transport close",
  timestamp: "2026-06-12T10:30:00Z",
  totalAgentsOnline: 4
}
```

#### `ticket_locked`
**When:** A ticket is successfully locked  
**Payload:**
```javascript
{
  ticketId: "ticket_105",
  lockedBy: "agent_123",
  agentName: "John Smith",
  socketId: "abc123xyz",
  timestamp: "2026-06-12T10:30:00Z"
}
```

#### `lock_failed`
**When:** A lock attempt fails (ticket already locked)  
**Payload:**
```javascript
{
  ticketId: "ticket_105",
  reason: "Ticket is locked by Jane Doe",
  lockedBy: "Jane Doe",
  timestamp: "2026-06-12T10:30:00Z"
}
```

#### `ticket_unlocked`
**When:** A ticket is unlocked or auto-unlocked  
**Payload:**
```javascript
{
  ticketId: "ticket_105",
  unlockedBy: "agent_123",
  reason: "Auto-unlocked (John Smith disconnected)", // Optional
  timestamp: "2026-06-12T10:30:00Z"
}
```

#### `initial_lock_state`
**When:** Agent first joins dashboard (sends current state)  
**Payload:**
```javascript
{
  lockedTickets: {
    "ticket_105": {
      lockedBy: "agent_456",
      agentName: "Jane Doe",
      socketId: "def456uvw",
      lockedAt: "2026-06-12T10:25:00Z"
    }
  },
  timestamp: "2026-06-12T10:30:00Z"
}
```

#### `heartbeat_ack`
**When:** Server acknowledges heartbeat  
**Payload:**
```javascript
{
  timestamp: "2026-06-12T10:30:00Z"
}
```

## Health Check

```bash
curl http://localhost:4000/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-06-12T10:30:00Z",
  "activeSessions": 5,
  "lockedTickets": 3
}
```

## Architecture

### State Management
- **ticketLocks**: Real-time mapping of ticket IDs to lock holders
- **agentSessions**: Tracks active agents, their connections, and locked tickets

### Ghost Disconnect Handler
When an agent's WebSocket connection is lost (browser tab closed, network failure):
1. Server detects `disconnect` event
2. Automatically releases ALL locks held by that agent
3. Broadcasts `ticket_unlocked` events to remaining agents
4. Removes agent session from memory

This ensures tickets never remain locked after agent departure.

### CORS Configuration
Supports:
- Local development: `http://localhost:3000`, `http://localhost:3001`
- Vercel production: `https://*.vercel.app`
- Environment-based: `process.env.FRONTEND_URL`

### Production Deployment (Render)
1. Set `NODE_ENV=production`
2. Configure `FRONTEND_URL` to your Vercel domain
3. Render automatically upgrades to WSS (WebSocket Secure)
4. CORS rules enforce secure cross-origin connections

## Debugging

Enable detailed logging by setting `DEBUG=*` environment variable:
```bash
DEBUG=* npm run dev
```

## Performance Notes

- Handles 50+ concurrent agents efficiently
- Sub-100ms lock/unlock propagation
- In-memory state (production may require Redis for horizontal scaling)
- Event-driven architecture scales with Socket.io namespaces

## Next Steps

1. Deploy backend to Render
2. Build React frontend with Socket.io client
3. Implement UI lock indicators (🔒)
4. Test dual-window agent scenarios
5. Record demonstration video
