import React, { useState } from 'react';
import { LoginCredentials } from '../../types/auth';

interface LoginProps {
  onLogin: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await onLogin(credentials);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="login-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#34495e'
    }}>
      <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
        <div className="card-header">
          <h1 className="card-title" style={{ textAlign: 'center', color: '#2c3e50' }}>
            MSP Inventory System
          </h1>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-input"
              value={credentials.username}
              onChange={handleInputChange}
              required
              autoFocus
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              value={credentials.password}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading || !credentials.username || !credentials.password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#7f8c8d' }}>
          Default credentials: admin / admin123
        </div>
      </div>
    </div>
  );
};

export default Login;