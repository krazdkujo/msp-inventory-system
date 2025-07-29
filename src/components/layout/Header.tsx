import React from 'react';
import { User } from '../../types/auth';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onShowConfig?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onShowConfig }) => {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '600' }}>
          MSP Inventory System
        </h1>
        <span style={{ fontSize: '14px', opacity: 0.8 }}>
          v1.0.0
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '14px' }}>
          Welcome, {user.username}
        </span>
        <span style={{ 
          fontSize: '12px', 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          padding: '2px 8px',
          borderRadius: '12px',
          textTransform: 'uppercase'
        }}>
          {user.role}
        </span>
        {user.role === 'admin' && onShowConfig && (
          <button
            onClick={onShowConfig}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '4px 12px' }}
          >
            Settings
          </button>
        )}
        <button
          onClick={onLogout}
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '4px 12px' }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;