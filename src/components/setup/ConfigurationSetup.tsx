import React, { useState } from 'react';

interface ConfigurationSetupProps {
  onComplete: () => void;
}

const ConfigurationSetup: React.FC<ConfigurationSetupProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    airtablePAT: '',
    airtableBaseId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tables, setTables] = useState<any[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear errors when user starts typing
    if (error) setError(null);
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.airtablePAT.trim()) {
      errors.push('Airtable Personal Access Token is required');
    } else if (!formData.airtablePAT.startsWith('pat')) {
      errors.push('Invalid Airtable PAT format (should start with "pat")');
    }
    
    if (!formData.airtableBaseId.trim()) {
      errors.push('Airtable Base ID is required');
    } else if (!formData.airtableBaseId.startsWith('app')) {
      errors.push('Invalid Airtable Base ID format (should start with "app")');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Test connection and save credentials in one step
      const result = await window.electronAPI.config.testAndSave(
        formData.airtablePAT.trim(),
        formData.airtableBaseId.trim()
      );
      
      if (result.success) {
        setSuccessMessage('✅ Connection successful! Credentials saved securely.');
        setTables(result.tables || []);
        
        // Complete setup after a brief delay to show success message
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError(result.error || 'Failed to connect to Airtable');
      }
    } catch (err) {
      console.error('Configuration setup error:', err);
      setError('An unexpected error occurred while testing connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#34495e',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
        <div className="card-header">
          <h1 className="card-title" style={{ textAlign: 'center', color: '#2c3e50' }}>
            Setup MSP Inventory System
          </h1>
          <p style={{ textAlign: 'center', color: '#7f8c8d', margin: '8px 0 0 0', fontSize: '14px' }}>
            Configure your Airtable integration to get started
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error">
              {error}
            </div>
          )}
          
          {validationErrors.length > 0 && (
            <div className="error">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {validationErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          
          {successMessage && (
            <div style={{
              backgroundColor: '#d4edda',
              color: '#155724',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #c3e6cb',
              marginBottom: '16px'
            }}>
              {successMessage}
              {tables.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                  <strong>Available tables:</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                    {tables.map((table, index) => (
                      <li key={index}>{table.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="airtablePAT" className="form-label">
              Airtable Personal Access Token (PAT) *
            </label>
            <input
              type="password"
              id="airtablePAT"
              name="airtablePAT"
              className="form-input"
              value={formData.airtablePAT}
              onChange={handleInputChange}
              placeholder="patT349brDhTR50NZ..."
              disabled={loading}
              autoComplete="off"
            />
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
              Your Personal Access Token from Airtable (starts with "pat")
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
              disabled={loading}
              autoComplete="off"
            />
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
              Your Airtable Base ID (starts with "app")
            </div>
          </div>
          
          <div style={{ 
            backgroundColor: '#e8f4fd', 
            border: '1px solid #bee5eb',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '13px',
            lineHeight: '1.4'
          }}>
            <strong>🔒 Security Note:</strong> Your credentials are encrypted and stored securely on your local machine. 
            They are never transmitted to any third parties except Airtable for API calls.
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading || !formData.airtablePAT || !formData.airtableBaseId}
          >
{loading ? '🔄 Testing Connection...' : successMessage ? '✅ Setup Complete!' : '🔧 Test Connection & Save'}
          </button>
        </form>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '12px',
          lineHeight: '1.4'
        }}>
          <strong>Need help?</strong><br />
          • Get your PAT from: Airtable → Account → Developer hub → Personal access tokens<br />
          • Find your Base ID in the Airtable API documentation for your base<br />
          • Contact your system administrator if you need assistance
        </div>
      </div>
    </div>
  );
};

export default ConfigurationSetup;