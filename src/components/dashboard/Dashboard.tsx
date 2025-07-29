import React, { useState } from 'react';
import { User } from '../../types/auth';
import Sidebar from './Sidebar';
import ClientList from './ClientList';
import { AssetManagement } from '../asset';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeView, setActiveView] = useState<'clients' | 'assets' | 'users' | 'logs'>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setActiveView('assets');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'clients':
        return <ClientList user={user} onClientSelect={handleClientSelect} />;
      case 'assets':
        if (!selectedClientId) {
          return (
            <div className="content-area">
              <div className="empty-state">
                <h3>No Client Selected</h3>
                <p>Please select a client from the clients view to manage their assets.</p>
                <button 
                  onClick={() => setActiveView('clients')}
                  className="btn btn-primary"
                >
                  Go to Clients
                </button>
              </div>
            </div>
          );
        }
        return (
          <AssetManagement 
            clientId={selectedClientId} 
            userRole={user.role} 
          />
        );
      case 'users':
        return user.role === 'admin' 
          ? <div className="content-area">User management will be implemented here</div>
          : <div className="content-area">Access denied</div>;
      case 'logs':
        return <div className="content-area">Audit logs will be implemented here</div>;
      default:
        return <ClientList user={user} onClientSelect={handleClientSelect} />;
    }
  };

  return (
    <div className="main-content">
      <Sidebar 
        user={user} 
        activeView={activeView} 
        onViewChange={setActiveView} 
      />
      {renderContent()}
    </div>
  );
};

export default Dashboard;