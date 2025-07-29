import React, { useState, useEffect } from 'react';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import Header from './components/layout/Header';
import ConfigurationSetup from './components/setup/ConfigurationSetup';
import Settings from './components/settings/Settings';
import { User } from './types/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    initializeApp();
    
    // Listen for menu events
    if (window.electronAPI) {
      window.electronAPI.on('menu-settings', () => {
        setShowSettings(true);
      });
    }
    
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-settings');
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Wait for electronAPI to be available
      if (!window.electronAPI) {
        console.log('Waiting for electronAPI...');
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!window.electronAPI) {
          throw new Error('ElectronAPI not available');
        }
      }

      // Check if the application is configured
      const configured = await window.electronAPI.config.isConfigured();
      setIsConfigured(configured);
      
      if (configured) {
        // Check for existing session
        const currentUser = await window.electronAPI.auth.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Auto-login as default admin if no user is logged in
          console.log('No current user, attempting auto-login...');
          const autoLoginResult = await window.electronAPI.auth.autoLogin();
          if (autoLoginResult.success && autoLoginResult.user) {
            setUser(autoLoginResult.user);
            console.log('Auto-login successful');
          } else {
            console.warn('Auto-login failed:', autoLoginResult.error);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('App initialization failed:', error);
      setLoading(false);
    }
  };

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Application not ready' };
      }
      const result = await window.electronAPI.auth.login(credentials);
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const handleLogout = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.auth.logout();
      }
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleConfigurationComplete = async () => {
    setShowConfig(false);
    setIsConfigured(true);
    // Refresh the app state after configuration
    await initializeApp();
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Show configuration setup if not configured or explicitly requested
  if (!isConfigured || showConfig) {
    return (
      <div className="app">
        <ConfigurationSetup onComplete={handleConfigurationComplete} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header 
        user={user} 
        onLogout={handleLogout}
        onShowSettings={() => setShowSettings(true)}
      />
      <Dashboard user={user} />
      {showSettings && (
        <Settings 
          user={user} 
          onClose={handleSettingsClose}
        />
      )}
    </div>
  );
};

export default App;