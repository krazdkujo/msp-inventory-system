import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Authentication
  auth: {
    login: (credentials: { username: string; password: string }) => 
      ipcRenderer.invoke('auth:login', credentials),
    logout: () => 
      ipcRenderer.invoke('auth:logout'),
    getCurrentUser: () => 
      ipcRenderer.invoke('auth:get-current-user'),
    autoLogin: () => 
      ipcRenderer.invoke('auth:auto-login'),
    createUser: (userData: any) => 
      ipcRenderer.invoke('auth:create-user', userData),
    getUsers: () => 
      ipcRenderer.invoke('auth:get-users'),
    changePassword: (data: { userId: number; oldPassword: string; newPassword: string }) => 
      ipcRenderer.invoke('auth:change-password', data),
  },

  // Configuration
  config: {
    isConfigured: () => 
      ipcRenderer.invoke('config:is-configured'),
    setAirtable: (data: { pat: string; baseId: string }) => 
      ipcRenderer.invoke('config:set-airtable', data),
    save: (data: { airtablePAT: string; airtableBaseId: string }) => 
      ipcRenderer.invoke('config:save', data),
    testConnection: (pat: string, baseId: string) => 
      ipcRenderer.invoke('config:test-connection', { pat, baseId }),
    testAndSave: (pat: string, baseId: string) => 
      ipcRenderer.invoke('config:test-and-save', { pat, baseId }),
    validate: () => 
      ipcRenderer.invoke('config:validate'),
  },

  // Airtable operations
  airtable: {
    testConnection: () => 
      ipcRenderer.invoke('airtable:test-connection'),
    getAssets: (data: { tableName: string; filters?: any }) => 
      ipcRenderer.invoke('airtable:get-assets', data),
    getAsset: (data: { tableName: string; assetId: string }) => 
      ipcRenderer.invoke('airtable:get-asset', data),
    createAsset: (data: { tableName: string; asset: any }) => 
      ipcRenderer.invoke('airtable:create-asset', data),
    updateAsset: (data: { tableName: string; assetId: string; updates: any }) => 
      ipcRenderer.invoke('airtable:update-asset', data),
    deleteAsset: (data: { tableName: string; assetId: string }) => 
      ipcRenderer.invoke('airtable:delete-asset', data),
    searchAssets: (data: { tableName: string; query: string }) => 
      ipcRenderer.invoke('airtable:search-assets', data),
    bulkUpdateAssets: (data: { tableName: string; updates: any[] }) => 
      ipcRenderer.invoke('airtable:bulk-update-assets', data),
    createInitialTables: () => 
      ipcRenderer.invoke('airtable:create-initial-tables'),
  },

  // App information
  app: {
    getVersion: () => 
      ipcRenderer.invoke('app:get-version'),
  },

  // Window controls
  window: {
    minimize: () => 
      ipcRenderer.invoke('window:minimize'),
    maximize: () => 
      ipcRenderer.invoke('window:maximize'),
    close: () => 
      ipcRenderer.invoke('window:close'),
  },

  // Barcode scanning (graceful fallback if not available)
  barcode: {
    getDevices: () => 
      ipcRenderer.invoke('barcode:get-devices').catch(() => ({ success: false, devices: [] })),
    connect: (deviceId: string) => 
      ipcRenderer.invoke('barcode:connect', deviceId).catch(() => ({ success: false, error: 'Barcode scanning not available' })),
    disconnect: (deviceId: string) => 
      ipcRenderer.invoke('barcode:disconnect', deviceId).catch(() => ({ success: false, error: 'Barcode scanning not available' })),
  },

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'menu-new-client',
      'menu-settings',
      'menu-about',
      'update-available',
      'update-downloaded',
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;