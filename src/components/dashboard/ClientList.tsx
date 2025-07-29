import React, { useState, useEffect } from 'react';
import { User } from '../../types/auth';

interface Client {
  id: string;
  name: string;
  description?: string;
  assetCount: number;
  lastScanDate?: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  tableName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface ClientListProps {
  user: User;
  onClientSelect?: (clientId: string) => void;
}

const ClientList: React.FC<ClientListProps> = ({ user, onClientSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDescription, setNewClientDescription] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      if (window.electronAPI?.airtable) {
        const result = await window.electronAPI.airtable.getCompanies();
        
        if (result.success && result.companies) {
          const clientsData = result.companies.map((company: any) => ({
            id: company.id,
            name: company.name,
            description: company.description || 'Asset tracking for ' + company.name,
            assetCount: company.assetCount || 0,
            lastScanDate: company.lastScanDate ? new Date(company.lastScanDate) : undefined,
            status: company.isActive ? 'active' : 'inactive',
            createdAt: company.createdAt ? new Date(company.createdAt) : new Date(),
            tableName: company.tableName,
            contactEmail: company.contactEmail,
            contactPhone: company.contactPhone,
          }));
          
          setClients(clientsData);
        } else {
          console.error('Failed to load companies:', result.error);
          setClients([]);
        }
      } else {
        console.warn('Airtable API not available');
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      alert('Please enter a client name');
      return;
    }

    setCreatingClient(true);
    
    try {
      if (window.electronAPI?.airtable) {
        const result = await window.electronAPI.airtable.createClientAssetTable(newClientName.trim());
        
        if (result.success) {
          alert(`✅ Client "${newClientName}" created successfully!`);
          setNewClientName('');
          setNewClientDescription('');
          setShowNewClientModal(false);
          
          // Reload the clients list to show the new client
          await loadClients();
        } else {
          alert(`❌ Failed to create client: ${result.error}`);
        }
      } else {
        alert('❌ Airtable API not available');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert(`❌ Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreatingClient(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#27ae60';
      case 'inactive':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  if (loading) {
    return <div className="loading">Loading clients...</div>;
  }

  return (
    <div className="content-area">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '24px', color: '#2c3e50' }}>
          Clients ({clients.length})
        </h1>
        
        {user.role === 'admin' && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowNewClientModal(true)}
          >
            + New Client
          </button>
        )}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {clients.map(client => (
          <div 
            key={client.id} 
            className="card" 
            style={{ cursor: 'pointer' }}
            onClick={() => onClientSelect?.(client.id)}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <h3 style={{ fontSize: '18px', color: '#2c3e50', margin: 0 }}>
                {client.name}
              </h3>
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                textTransform: 'uppercase',
                fontWeight: '600',
                backgroundColor: getStatusColor(client.status),
                color: 'white'
              }}>
                {client.status}
              </span>
            </div>
            
            {client.description && (
              <p style={{ 
                color: '#7f8c8d', 
                fontSize: '14px', 
                marginBottom: '16px',
                lineHeight: '1.4'
              }}>
                {client.description}
              </p>
            )}
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              fontSize: '14px'
            }}>
              <div>
                <div style={{ color: '#7f8c8d', marginBottom: '4px' }}>
                  Total Assets
                </div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
                  {client.assetCount.toLocaleString()}
                </div>
              </div>
              
              <div>
                <div style={{ color: '#7f8c8d', marginBottom: '4px' }}>
                  Last Scan
                </div>
                <div style={{ fontSize: '14px', color: '#2c3e50' }}>
                  {client.lastScanDate ? formatDate(client.lastScanDate) : 'Never'}
                </div>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #ecf0f1',
              fontSize: '12px',
              color: '#95a5a6'
            }}>
              Created {formatDate(client.createdAt)}
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#7f8c8d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <h3 style={{ marginBottom: '8px' }}>No clients found</h3>
          <p>Get started by creating your first client.</p>
          {user.role === 'admin' && (
            <button 
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setShowNewClientModal(true)}
            >
              Create Client
            </button>
          )}
        </div>
      )}

      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Client</h2>
              <button 
                onClick={() => setShowNewClientModal(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#7f8c8d'
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Optional description"
                  value={newClientDescription}
                  onChange={(e) => setNewClientDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowNewClientModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateClient}
                disabled={creatingClient || !newClientName.trim()}
              >
                {creatingClient ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;