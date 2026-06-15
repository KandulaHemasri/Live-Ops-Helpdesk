import React from 'react';
import './AgentStatus.css';

function AgentStatus({ agentName, connectionStatus, onlineAgents }) {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4caf50';
      case 'disconnected':
        return '#f44336';
      case 'error':
        return '#ff9800';
      default:
        return '#999';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="agent-status">
      <div className="agent-info">
        <span className="agent-name">👤 {agentName}</span>
        <div className="status-indicator">
          <span
            className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
          ></span>
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>
      <div className="online-agents">
        <span className="agents-online">👥 {onlineAgents || 1} Agent{onlineAgents !== 1 ? 's' : ''} Online</span>
      </div>
    </div>
  );
}

export default AgentStatus;
