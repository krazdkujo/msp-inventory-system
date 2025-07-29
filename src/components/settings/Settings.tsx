import React, { useState, useEffect } from 'react';
import { User } from '../../types/auth';
import '../../styles/Settings.css';

interface SettingsProps {
  user: User;
  onClose: () => void;
}

interface ConnectionStatus {
  isConnected: boolean;
  lastChecked?: Date;
  error?: string;
  tables?: string[];
}

interface TableCreationStatus {
  companiesTable: 'pending' | 'creating' | 'success' | 'error';
  usersTable: 'pending' | 'creating' | 'success' | 'error';
  errors?: {
    companiesTable?: string;
    usersTable?: string;
  };
}

const Settings: React.FC<SettingsProps> = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'tables' | 'management' | 'advanced'>('connection');
  const [formData, setFormData] = useState({
    airtablePAT: '',
    airtableBaseId: '',
    autoSync: true,
    syncInterval: 300, // 5 minutes
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
  });
  const [tableStatus, setTableStatus] = useState<TableCreationStatus>({
    companiesTable: 'pending',
    usersTable: 'pending',
  });
  const [loading, setLoading] = useState({
    connection: false,
    tableCreation: false,
    save: false,
  });
  const [showPAT, setShowPAT] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [newFieldType, setNewFieldType] = useState('singleLineText');
  const [companies, setCompanies] = useState<any[]>([]);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
    checkConnectionStatus();
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      if (window.electronAPI?.airtable && connectionStatus.isConnected) {
        const result = await window.electronAPI.airtable.getCompanies();
        if (result.success) {
          setCompanies(result.companies || []);
        }
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const loadCurrentSettings = async () => {
    try {
      if (window.electronAPI) {
        // Check if we have existing configuration
        const isConfigured = await window.electronAPI.config.isConfigured();
        if (isConfigured) {
          // Show placeholder values to indicate there are saved credentials
          setFormData(prev => ({
            ...prev,
            airtablePAT: '••••••••••••••••••••••••••••••••••••',
            airtableBaseId: '••••••••••••••••',
          }));
          setIsEditingCredentials(false);
        } else {
          setIsEditingCredentials(true);
        }
      }
    } catch (error) {
      console.error('Failed to load current settings:', error);
    }
  };

  const checkConnectionStatus = async () => {
    setLoading(prev => ({ ...prev, connection: true }));
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.airtable.testConnection();
        setConnectionStatus({
          isConnected: result.success,
          lastChecked: new Date(),
          error: result.error,
          tables: result.tables,
        });
      }
    } catch (error) {
      setConnectionStatus({
        isConnected: false,
        lastChecked: new Date(),
        error: 'Failed to test connection',
      });
    } finally {
      setLoading(prev => ({ ...prev, connection: false }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveConnection = async () => {
    setLoading(prev => ({ ...prev, save: true }));
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.config.testAndSave(
          formData.airtablePAT.trim(),
          formData.airtableBaseId.trim()
        );
        
        if (result.success) {
          setConnectionStatus({
            isConnected: true,
            lastChecked: new Date(),
            tables: result.tables,
          });
        } else {
          setConnectionStatus({
            isConnected: false,
            lastChecked: new Date(),
            error: result.error,
          });
        }
      }
    } catch (error) {
      setConnectionStatus({
        isConnected: false,
        lastChecked: new Date(),
        error: 'Failed to save connection settings',
      });
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  const handleCreateTables = async () => {
    if (!connectionStatus.isConnected) {
      alert('Please establish a connection first');
      return;
    }

    setLoading(prev => ({ ...prev, tableCreation: true }));
    setTableStatus({
      companiesTable: 'creating',
      usersTable: 'creating',
    });

    try {
      if (window.electronAPI?.airtable) {
        const result = await window.electronAPI.airtable.createInitialTables();
        
        if (result.success) {
          setTableStatus({
            companiesTable: 'success',
            usersTable: 'success',
          });
          
          // Show success message
          setTimeout(() => {
            alert('✅ Tables created successfully! Your Airtable base now has the required "Companies" and "Users" tables with all necessary fields.');
          }, 500);
        } else {
          // Parse the error to provide better feedback
          let companiesError = result.error || 'Failed to create companies table';
          let usersError = result.error || 'Failed to create users table';
          
          // Check if it's a permissions error
          if (result.error?.includes('INSUFFICIENT_PERMISSIONS') || result.error?.includes('403')) {
            companiesError = 'Insufficient permissions. Please ensure your Airtable Personal Access Token has "schema.bases:write" permission.';
            usersError = companiesError;
          } else if (result.error?.includes('already exists')) {
            companiesError = 'Table may already exist. Please check your Airtable base.';
            usersError = companiesError;
          } else if (result.error?.includes('INVALID_REQUEST')) {
            companiesError = 'Invalid request. Please check your Airtable credentials and try again.';
            usersError = companiesError;
          }
          
          setTableStatus({
            companiesTable: 'error',
            usersTable: 'error',
            errors: {
              companiesTable: companiesError,
              usersTable: usersError,
            },
          });
        }
      } else {
        throw new Error('Airtable API not available');
      }
    } catch (error) {
      console.error('Table creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setTableStatus({
        companiesTable: 'error',
        usersTable: 'error',
        errors: {
          companiesTable: `Failed to create companies table: ${errorMessage}`,
          usersTable: `Failed to create users table: ${errorMessage}`,
        },
      });
    } finally {
      setLoading(prev => ({ ...prev, tableCreation: false }));
    }
  };

  const handleCreateClientTable = async () => {
    if (!newClientName.trim()) {
      alert('Please enter a client name');
      return;
    }

    if (!connectionStatus.isConnected) {
      alert('Please establish a connection first');
      return;
    }

    try {
      if (window.electronAPI?.airtable) {
        const result = await window.electronAPI.airtable.createClientAssetTable(newClientName.trim());
        
        if (result.success) {
          alert(`✅ Asset table created successfully for client "${newClientName}"! Table name: ${result.tableName}`);
          setNewClientName('');
        } else {
          alert(`❌ Failed to create client table: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Client table creation error:', error);
      alert(`❌ Failed to create client table: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddField = async () => {
    if (!newFieldName.trim()) {
      alert('Please enter a field name');
      return;
    }

    if (!selectedCompany && !selectedTable.trim()) {
      alert('Please select a company or enter a table name');
      return;
    }

    if (!connectionStatus.isConnected) {
      alert('Please establish a connection first');
      return;
    }

    try {
      if (window.electronAPI?.airtable) {
        // Determine which table to add the field to
        let tableName = selectedTable.trim();
        if (selectedCompany && !tableName) {
          const company = companies.find(c => c.id === selectedCompany);
          if (company) {
            tableName = company.tableName;
          }
        }

        if (!tableName) {
          alert('Could not determine target table');
          return;
        }

        const fieldDefinition = {
          name: newFieldName.trim(),
          type: newFieldType,
        };

        // Add options for select fields
        if (newFieldType === 'singleSelect' || newFieldType === 'multipleSelects') {
          (fieldDefinition as any).options = {
            choices: [
              { name: 'Option 1' },
              { name: 'Option 2' },
              { name: 'Option 3' }
            ]
          };
        }

        const result = await window.electronAPI.airtable.addFieldToTable(tableName, fieldDefinition);
        
        if (result.success) {
          const companyName = selectedCompany ? companies.find(c => c.id === selectedCompany)?.name : tableName;
          alert(`✅ Field "${newFieldName}" added successfully to ${companyName}!`);
          setNewFieldName('');
          setSelectedCompany('');
          setSelectedTable('');
        } else {
          alert(`❌ Failed to add field: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Add field error:', error);
      alert(`❌ Failed to add field: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = (isConnected: boolean, loading: boolean) => {
    if (loading) return '🔄';
    return isConnected ? '✅' : '❌';
  };

  const renderConnectionTab = () => (
    <div className="settings-tab-content">
      <div className={`connection-status ${connectionStatus.isConnected ? 'connected' : 'disconnected'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '18px' }}>
            {getStatusIcon(connectionStatus.isConnected, loading.connection)}
          </span>
          <strong>
            Connection Status: {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
          </strong>
          <button
            onClick={checkConnectionStatus}
            disabled={loading.connection}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '4px 8px', marginLeft: 'auto' }}
          >
            Test Connection
          </button>
        </div>
        
        {connectionStatus.lastChecked && (
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Last checked: {connectionStatus.lastChecked.toLocaleString()}
          </div>
        )}
        
        {connectionStatus.error && (
          <div style={{ color: '#721c24', fontSize: '14px', marginTop: '8px' }}>
            Error: {connectionStatus.error}
          </div>
        )}
        
        {connectionStatus.tables && connectionStatus.tables.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            <strong>Available tables:</strong> {connectionStatus.tables.join(', ')}
          </div>
        )}
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label htmlFor="airtablePAT" className="form-label" style={{ margin: 0 }}>
            Airtable Personal Access Token (PAT) *
          </label>
          {!isEditingCredentials && (
            <button
              type="button"
              onClick={() => {
                setIsEditingCredentials(true);
                setFormData(prev => ({ ...prev, airtablePAT: '', airtableBaseId: '' }));
              }}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              Edit
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={showPAT ? 'text' : 'password'}
            id="airtablePAT"
            name="airtablePAT"
            className="form-input"
            value={formData.airtablePAT}
            onChange={handleInputChange}
            placeholder="patT349brDhTR50NZ..."
            disabled={loading.save || !isEditingCredentials}
            style={{ paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowPAT(!showPAT)}
            className="pat-toggle-btn"
            disabled={!isEditingCredentials}
          >
            {showPAT ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="airtableBaseId" className="form-label">
          Airtable Base ID *
        </label>
        <input
          type="text"
          id="airtableBaseId"
          name="airtableBaseId"
          className="form-input"
          value={formData.airtableBaseId}
          onChange={handleInputChange}
          placeholder="appXXXXXXXXXXXXXX"
          disabled={loading.save || !isEditingCredentials}
        />
      </div>

      <button
        onClick={handleSaveConnection}
        disabled={loading.save || !formData.airtablePAT || !formData.airtableBaseId}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        {loading.save ? 'Testing & Saving...' : 'Test Connection & Save'}
      </button>
    </div>
  );

  const renderTablesTab = () => (
    <div className="settings-tab-content">
      <div style={{ marginBottom: '20px' }}>
        <h3>Required Tables Setup</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Create the necessary tables in your Airtable base for proper functionality.
        </p>
      </div>

      <div className="table-status-grid" style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
        <div className="table-status-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="status-icon">
              {tableStatus.companiesTable === 'success' ? '✅' : 
               tableStatus.companiesTable === 'creating' ? '🔄' : 
               tableStatus.companiesTable === 'error' ? '❌' : '⏳'}
            </span>
            <strong>Companies Table</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Tracks companies and their corresponding asset tables. Each company gets its own dedicated asset table.
          </div>
          {tableStatus.errors?.companiesTable && (
            <div className="info-box error">
              {tableStatus.errors.companiesTable}
            </div>
          )}
        </div>

        <div className="table-status-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="status-icon">
              {tableStatus.usersTable === 'success' ? '✅' : 
               tableStatus.usersTable === 'creating' ? '🔄' : 
               tableStatus.usersTable === 'error' ? '❌' : '⏳'}
            </span>
            <strong>Users Table</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Manages user accounts and permissions. Users can access multiple companies based on their role.
          </div>
          {tableStatus.errors?.usersTable && (
            <div className="info-box error">
              {tableStatus.errors.usersTable}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleCreateTables}
        disabled={loading.tableCreation || !connectionStatus.isConnected}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        {loading.tableCreation ? 'Creating Tables...' : 'Create Required Tables'}
      </button>

      {!connectionStatus.isConnected && (
        <div className="info-box warning" style={{ marginTop: '16px' }}>
          ⚠️ Please establish a connection first before creating tables.
        </div>
      )}
    </div>
  );

  const renderManagementTab = () => (
    <div className="settings-tab-content">
      <div style={{ marginBottom: '30px' }}>
        <h3>Company Table Management</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Create asset tables for new companies. Each company gets their own dedicated table for asset tracking, 
          and an entry is automatically added to the Companies table.
        </p>
        
        <div className="form-group">
          <label htmlFor="newClientName" className="form-label">
            Company Name
          </label>
          <input
            type="text"
            id="newClientName"
            className="form-input"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="Enter company name (e.g., 'Acme Corp')"
            style={{ marginBottom: '10px' }}
          />
          <button
            onClick={handleCreateClientTable}
            disabled={!connectionStatus.isConnected || !newClientName.trim()}
            className="btn btn-primary"
          >
            Create Company Asset Table
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Field Management</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Add custom fields to existing tables. This allows you to extend tables with additional data points.
        </p>
        
        <div className="form-group">
          <label htmlFor="selectedCompany" className="form-label">
            Select Company (for asset tables)
          </label>
          <select
            id="selectedCompany"
            className="form-input"
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setSelectedTable(''); // Clear manual table entry when company is selected
            }}
            style={{ marginBottom: '10px' }}
          >
            <option value="">-- Select a company --</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ textAlign: 'center', margin: '10px 0', color: '#666', fontSize: '14px' }}>
          OR
        </div>

        <div className="form-group">
          <label htmlFor="selectedTable" className="form-label">
            Manual Table Name
          </label>
          <input
            type="text"
            id="selectedTable"
            className="form-input"
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setSelectedCompany(''); // Clear company selection when manual table is entered
            }}
            placeholder="Enter table name (e.g., 'Companies', 'Users')"
            style={{ marginBottom: '10px' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="newFieldName" className="form-label">
            Field Name
          </label>
          <input
            type="text"
            id="newFieldName"
            className="form-input"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Enter field name (e.g., 'Department', 'Priority')"
            style={{ marginBottom: '10px' }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="newFieldType" className="form-label">
            Field Type
          </label>
          <select
            id="newFieldType"
            className="form-input"
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value)}
            style={{ marginBottom: '10px' }}
          >
            <option value="singleLineText">Single Line Text</option>
            <option value="multilineText">Multi-line Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="dateTime">Date & Time</option>
            <option value="singleSelect">Single Select</option>
            <option value="multipleSelects">Multiple Select</option>
            <option value="checkbox">Checkbox</option>
            <option value="email">Email</option>
            <option value="phoneNumber">Phone Number</option>
            <option value="url">URL</option>
            <option value="currency">Currency</option>
          </select>
        </div>

        <button
          onClick={handleAddField}
          disabled={!connectionStatus.isConnected || !newFieldName.trim() || (!selectedCompany && !selectedTable.trim())}
          className="btn btn-primary"
        >
          Add Field to Table
        </button>
      </div>

      {!connectionStatus.isConnected && (
        <div className="info-box warning">
          ⚠️ Please establish a connection first before managing tables and fields.
        </div>
      )}
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="settings-tab-content">
      <div className="form-group">
        <label htmlFor="autoSync" className="form-label">
          <input
            type="checkbox"
            id="autoSync"
            name="autoSync"
            checked={formData.autoSync}
            onChange={handleInputChange}
            style={{ marginRight: '8px' }}
          />
          Enable automatic synchronization
        </label>
      </div>

      {formData.autoSync && (
        <div className="form-group">
          <label htmlFor="syncInterval" className="form-label">
            Sync interval (seconds)
          </label>
          <input
            type="number"
            id="syncInterval"
            name="syncInterval"
            className="form-input"
            value={formData.syncInterval}
            onChange={handleInputChange}
            min="60"
            max="3600"
            step="60"
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Minimum: 60 seconds, Maximum: 3600 seconds (1 hour)
          </div>
        </div>
      )}

      <div className="info-box info" style={{ marginTop: '20px' }}>
        <strong>🔧 System Information</strong>
        <div style={{ marginTop: '8px' }}>
          <div>Current User: {user.username} ({user.role})</div>
          <div>Application Version: 1.0.0</div>
          <div>Electron API: {window.electronAPI ? 'Available' : 'Not Available'}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2 style={{ margin: 0, fontSize: '20px' }}>Settings</h2>
          <button
            onClick={onClose}
            className="settings-close-btn"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        <div className="settings-tabs">
          {[
            { key: 'connection', label: 'Connection' },
            { key: 'tables', label: 'Tables' },
            { key: 'management', label: 'Management' },
            { key: 'advanced', label: 'Advanced' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {activeTab === 'connection' && renderConnectionTab()}
          {activeTab === 'tables' && renderTablesTab()}
          {activeTab === 'management' && renderManagementTab()}
          {activeTab === 'advanced' && renderAdvancedTab()}
        </div>

        <div className="settings-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;