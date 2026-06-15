import React from 'react';
import './TicketList.css';

function TicketList({ tickets, lockedTickets, selectedTicketId, onSelectTicket, currentAgentSocketId }) {
  const getTicketLockStatus = (ticketId) => {
    const lock = lockedTickets[ticketId];
    if (!lock) return null;

    return {
      isLocked: true,
      isLockedByMe: lock.socketId === currentAgentSocketId,
      lockedBy: lock.agentName,
    };
  };

  return (
    <div className="ticket-list">
      <h2>Support Tickets</h2>
      <div className="ticket-list-items">
        {tickets.map((ticket) => {
          const lockStatus = getTicketLockStatus(ticket.id);
          const isSelected = selectedTicketId === ticket.id;
          const isLockedByOther = lockStatus && !lockStatus.isLockedByMe;

          return (
            <div
              key={ticket.id}
              className={`ticket-item ${isSelected ? 'selected' : ''} ${isLockedByOther ? 'locked-by-other' : ''}`}
              onClick={() => !isLockedByOther && onSelectTicket(ticket.id)}
              style={{
                cursor: isLockedByOther ? 'not-allowed' : 'pointer',
                opacity: isLockedByOther ? 0.6 : 1,
              }}
            >
              <div className="ticket-header">
                <div className="ticket-id-title">
                  <span className="ticket-id">{ticket.id.replace('ticket_', '#')}</span>
                  <span className="ticket-title">{ticket.title}</span>
                </div>
                {lockStatus && (
                  <span className="lock-icon" title={`Locked by ${lockStatus.lockedBy}`}>
                    🔒
                  </span>
                )}
              </div>
              <p className="ticket-description">{ticket.description}</p>
              <div className="ticket-status">
                <span className={`status-badge status-${ticket.status}`}>
                  {ticket.status.toUpperCase()}
                </span>
                {lockStatus && (
                  <span className="lock-status">
                    {lockStatus.isLockedByMe ? '🔴 Your Lock' : `🔒 ${lockStatus.lockedBy}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TicketList;
