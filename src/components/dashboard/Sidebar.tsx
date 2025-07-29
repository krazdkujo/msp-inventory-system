import React from 'react';
import { User } from '../../types/auth';

interface SidebarProps {
  user: User;
  activeView: 'clients' | 'assets' | 'users' | 'logs';
  onViewChange: (view: 'clients' | 'assets' | 'users' | 'logs') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeView, onViewChange }) => {
  const menuItems = [
    {
      id: 'clients' as const,
      label: 'Clients',
      icon: '🏢',
      roles: ['admin', 'technician', 'readonly'],
    },
    {
      id: 'assets' as const,
      label: 'Assets',
      icon: '📦',
      roles: ['admin', 'technician', 'readonly'],
    },
    {
      id: 'users' as const,
      label: 'Users',
      icon: '👥',
      roles: ['admin'],
    },
    {
      id: 'logs' as const,
      label: 'Audit Logs',
      icon: '📋',
      roles: ['admin', 'technician'],
    },
  ];

  const availableItems = menuItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="sidebar">
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '20px', opacity: 0.8 }}>
          Navigation
        </h2>
        
        <nav>
          {availableItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                marginBottom: '8px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeView === item.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                textAlign: 'left',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeView !== item.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeView !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        left: '20px', 
        right: '20px',
        padding: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px',
        fontSize: '12px',
        opacity: 0.7
      }}>
        <div>Role: <strong>{user.role}</strong></div>
        {user.assignedClients && user.assignedClients.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            Clients: {user.assignedClients.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;