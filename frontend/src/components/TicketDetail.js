import React, { useState } from 'react';
import './TicketDetail.css';

function TicketDetail({ ticket, isLocked, lockInfo, currentSocketId, onUnlock, onClose }) {
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');

  const handleSaveAndClose = () => {
    // Save the ticket data (in a real app, this would send to backend)
    console.log('Ticket Saved:', { ticket: ticket.id, resolution, notes });
    alert(`✅ Ticket #${ticket.id.replace('ticket_', '')} saved successfully!`);
    
    // Unlock and close
    onUnlock();
    onClose();
  };

  const isEditingByOther = isLocked && lockInfo && lockInfo.socketId !== currentSocketId;

  return (
    <div className="ticket-detail">
      <div className="detail-header">
        <div className="detail-title">
          <h2>
            Ticket #{ticket.id.replace('ticket_', '')} - {ticket.title}
          </h2>
          {isLocked && lockInfo && (
            <span className={`lock-indicator ${isEditingByOther ? 'locked-other' : 'locked-me'}`}>
              🔒 {isEditingByOther ? `Locked by ${lockInfo.agentName}` : 'Your Lock'}
            </span>
          )}
        </div>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {isEditingByOther && (
        <div className="warning-banner">
          ⚠️ This ticket is currently being edited by <strong>{lockInfo.agentName}</strong>. You cannot make changes.
        </div>
      )}

      <div className="detail-content">
        <section className="detail-section">
          <h3>📋 Ticket Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Status:</label>
              <span className={`status-badge status-${ticket.status}`}>
                {ticket.status.toUpperCase()}
              </span>
            </div>
            <div className="info-item">
              <label>Priority:</label>
              <span>🔴 High</span>
            </div>
            <div className="info-item">
              <label>Created:</label>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <label>Customer:</label>
              <span>RapidDispatch Customer</span>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3>📝 Description</h3>
          <p className="description-text">{ticket.description}</p>
        </section>

        <section className="detail-section">
          <h3>💬 Notes</h3>
          <textarea
            className="notes-input"
            placeholder="Add internal notes about this ticket..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isEditingByOther}
            rows="4"
          />
        </section>

        <section className="detail-section">
          <h3>✅ Resolution</h3>
          <textarea
            className="resolution-input"
            placeholder="Provide the resolution or action taken..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            disabled={isEditingByOther}
            rows="6"
          />
        </section>

        {!isEditingByOther && (
          <div className="action-buttons">
            <button className="save-btn" onClick={handleSaveAndClose}>
              ✅ Save & Close
            </button>
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}

        {isEditingByOther && (
          <div className="locked-message">
            <p>Please wait for {lockInfo.agentName} to finish editing this ticket.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketDetail;
