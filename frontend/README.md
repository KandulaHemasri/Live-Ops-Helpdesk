# Live Ops Helpdesk - React Frontend

## Overview
Real-time collaborative support ticket management interface powered by React and Socket.io. Enables instant lock/unlock synchronization across multiple agents.

## Features
✅ **Real-Time Ticket Locks** - 🔒 icon updates instantly across all agents  
✅ **Live Agent Status** - See who's online and currently editing  
✅ **Responsive Design** - Works on desktop, tablet, mobile  
✅ **Zero Refresh** - WebSocket-powered updates (no page refresh needed)  
✅ **Production-Ready** - Optimized for Vercel deployment  

## Installation

```bash
npm install
```

## Running Locally

### Development
```bash
npm start
```
Frontend runs on `http://localhost:3000`

**Important:** Make sure the backend is running on `http://localhost:4000`

### Build for Production
```bash
npm run build
```

## Environment Variables

### Local Development (`.env`)
```env
REACT_APP_SERVER_URL=http://localhost:4000
```

### Production (`.env.production`)
```env
REACT_APP_SERVER_URL=https://your-backend.onrender.com
```

## Project Structure

```
frontend/
├── public/
│   └── index.html              # Root HTML file
├── src/
│   ├── components/
│   │   ├── TicketList.js       # Sidebar ticket list with lock icons
│   │   ├── TicketList.css
│   │   ├── TicketDetail.js     # Main ticket editor view
│   │   ├── TicketDetail.css
│   │   ├── AgentStatus.js      # Connection status + online agents count
│   │   └── AgentStatus.css
│   ├── App.js                  # Main app component with Socket.io logic
│   ├── App.css                 # App styling
│   ├── index.js                # React entry point
│   ├── index.css               # Global styles
│   ├── .env                    # Local dev environment
│   └── .env.production         # Production environment
├── package.json
└── README.md
```

## Key Components

### **App.js**
- Main app logic with Socket.io connection management
- Handles login, ticket selection, and lock/unlock events
- Manages real-time state updates from server

### **TicketList.js**
- Lists all support tickets
- Shows 🔒 lock icons when tickets are being edited
- Prevents clicking tickets locked by other agents
- Highlights selected ticket

### **TicketDetail.js**
- Displays full ticket information
- Allows agents to add notes and write resolution
- Shows warning if ticket is locked by another agent
- Handles Save & Close workflow

### **AgentStatus.js**
- Shows current agent name
- Displays connection status (Connected/Disconnected/Error)
- Shows count of agents currently online

## WebSocket Events

### **Outgoing (Client → Server)**

```javascript
// Join dashboard when logged in
socket.emit('join_dashboard', { agentId, agentName });

// Lock a ticket when clicked
socket.emit('lock_ticket', { ticketId, agentId, agentName });

// Unlock a ticket when saving
socket.emit('unlock_ticket', { ticketId, agentId });
```

### **Incoming (Server → Client)**

```javascript
// Initial state of all locked tickets
socket.on('initial_lock_state', (data) => { ... });

// Another agent locked a ticket
socket.on('ticket_locked', (data) => { ... });

// A ticket was unlocked
socket.on('ticket_unlocked', (data) => { ... });

// Another agent came online
socket.on('agent_online', (data) => { ... });

// Another agent went offline
socket.on('agent_offline', (data) => { ... });

// Lock attempt failed (ticket already locked)
socket.on('lock_failed', (data) => { ... });
```

## Dual-Window Testing (For Video Demo)

To test concurrent agent scenarios:

1. **Window 1 (Agent A):**
   - Open `http://localhost:3000`
   - Login as `agent_001` / "Agent A"

2. **Window 2 (Agent B):**
   - Open `http://localhost:3000` in another window
   - Login as `agent_002` / "Agent B"

3. **Test Scenarios:**
   - Agent A clicks Ticket #101 → Watch for 🔒 lock icon in Window 2
   - Agent B tries to click Ticket #101 → Should be blocked
   - Agent A clicks Save & Close → 🔒 disappears in Window 2
   - Agent A locks Ticket #102, then closes entire Window 1
   - Watch Window 2 auto-unlock Ticket #102 (ghost disconnect handling)

## Production Deployment (Vercel)

### 1. Build Frontend
```bash
npm run build
```

### 2. Connect to Vercel
```bash
npm install -g vercel
vercel
```

### 3. Set Environment Variable
```bash
vercel env add REACT_APP_SERVER_URL https://your-backend.onrender.com
```

### 4. Deploy
```bash
vercel --prod
```

Frontend will be deployed to `https://your-project.vercel.app`

## CORS Configuration

The backend is already configured to accept requests from:
- `http://localhost:3000` (local dev)
- `https://*.vercel.app` (production)

Ensure your Render backend is deployed with:
```env
FRONTEND_URL=https://your-frontend.vercel.app
```

## Performance Optimization

- ✅ Minimal re-renders (React hooks + Socket.io state management)
- ✅ CSS animations for lock indicators (GPU-accelerated)
- ✅ Lazy component loading
- ✅ Production build minified (~150KB gzipped)

## Troubleshooting

### Connection Issues
- Check backend is running on port 4000
- Verify `REACT_APP_SERVER_URL` in `.env`
- Check browser console for CORS errors
- Ensure WebSocket connections aren't blocked by firewall

### Tickets Not Updating
- Verify Socket.io connection (check console)
- Check Network tab for WebSocket frames
- Ensure backend ghost disconnect handler is working

### Styling Issues
- Clear browser cache
- Run `npm start` to rebuild CSS
- Check browser DevTools for CSS errors

## Next Steps

1. ✅ Frontend built and ready
2. ✅ Socket.io integration complete
3. Deploy frontend to Vercel
4. Deploy backend to Render
5. Record dual-window video demo
6. Test production WSS (WebSocket Secure)

## License

MIT - RapidDispatch
