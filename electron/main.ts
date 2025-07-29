import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class MainWindow {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.createWindow = this.createWindow.bind(this);
    this.setupEventHandlers();
    this.setupAutoUpdater();
  }

  private setupEventHandlers(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIpcHandlers();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      show: false,
    });

    // Use production build for now (development server issues)
    const startUrl = `file://${path.join(__dirname, '../index.html')}`;

    this.mainWindow.loadURL(startUrl);

    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Client',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu-new-client');
            },
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow?.webContents.send('menu-settings');
            },
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => {
              this.mainWindow?.webContents.send('menu-about');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIpcHandlers(): void {
    // Authentication handlers
    ipcMain.handle('auth:login', async (event, credentials) => {
      try {
        const { authService } = require('../src/services/AuthService');
        return await authService.login(credentials);
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Authentication service error' };
      }
    });

    ipcMain.handle('auth:logout', async () => {
      try {
        const { authService } = require('../src/services/AuthService');
        return await authService.logout();
      } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: 'Logout failed' };
      }
    });

    ipcMain.handle('auth:get-current-user', async () => {
      try {
        const { authService } = require('../src/services/AuthService');
        return authService.getCurrentUser();
      } catch (error) {
        console.error('Get current user error:', error);
        return null;
      }
    });

    ipcMain.handle('auth:create-user', async (event, userData) => {
      try {
        const { authService } = require('../src/services/AuthService');
        return await authService.createUser(userData);
      } catch (error) {
        console.error('Create user error:', error);
        return { success: false, error: 'Failed to create user' };
      }
    });

    ipcMain.handle('auth:get-users', async () => {
      try {
        const { authService } = require('../src/services/AuthService');
        return authService.getUsers();
      } catch (error) {
        console.error('Get users error:', error);
        return [];
      }
    });

    ipcMain.handle('auth:auto-login', async () => {
      try {
        const { authService } = require('../src/services/AuthService');
        return await authService.autoLoginAsAdmin();
      } catch (error) {
        console.error('Auto-login error:', error);
        return { success: false, error: 'Auto-login failed' };
      }
    });

    ipcMain.handle('auth:change-password', async (event, { userId, oldPassword, newPassword }) => {
      try {
        const { authService } = require('../src/services/AuthService');
        return await authService.changePassword(userId, oldPassword, newPassword);
      } catch (error) {
        console.error('Change password error:', error);
        return { success: false, error: 'Failed to change password' };
      }
    });

    ipcMain.handle('config:is-configured', () => {
      try {
        const { configService } = require('../src/services/ConfigService');
        return configService.isConfigured();
      } catch (error) {
        console.error('Config check error:', error);
        return false;
      }
    });

    ipcMain.handle('config:set-airtable', async (event, { pat, baseId }) => {
      try {
        const { configService } = require('../src/services/ConfigService');
        configService.setAirtablePAT(pat);
        configService.setAirtableBaseId(baseId);
        return { success: true };
      } catch (error) {
        console.error('Config set error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('config:validate', () => {
      try {
        const { configService } = require('../src/services/ConfigService');
        return configService.validateConfiguration();
      } catch (error) {
        console.error('Config validation error:', error);
        return { valid: false, errors: ['Configuration validation failed'] };
      }
    });

    ipcMain.handle('config:test-and-save', async (event, { pat, baseId }) => {
      try {
        const { configService } = require('../src/services/ConfigService');
        return await configService.testAndSaveAirtableCredentials(pat, baseId);
      } catch (error) {
        console.error('Config test and save error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Airtable service handlers
    ipcMain.handle('airtable:test-connection', async () => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.testConnection();
      } catch (error) {
        console.error('Airtable connection test error:', error);
        return { success: false, error: 'Connection test failed' };
      }
    });

    ipcMain.handle('airtable:get-assets', async (event, { tableName, filters }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.getAssets(tableName, filters);
      } catch (error) {
        console.error('Get assets error:', error);
        throw error;
      }
    });

    ipcMain.handle('airtable:get-asset', async (event, { tableName, assetId }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.getAssetById(tableName, assetId);
      } catch (error) {
        console.error('Get asset error:', error);
        throw error;
      }
    });

    ipcMain.handle('airtable:create-asset', async (event, { tableName, asset }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.createAsset(tableName, asset);
      } catch (error) {
        console.error('Create asset error:', error);
        throw error;
      }
    });

    ipcMain.handle('airtable:update-asset', async (event, { tableName, assetId, updates }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.updateAsset(tableName, assetId, updates);
      } catch (error) {
        console.error('Update asset error:', error);
        throw error;
      }
    });

    ipcMain.handle('airtable:delete-asset', async (event, { tableName, assetId }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.deleteAsset(tableName, assetId);
      } catch (error) {
        console.error('Delete asset error:', error);
        throw error;
      }
    });

    ipcMain.handle('airtable:search-assets', async (event, { tableName, query }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.searchAssets(tableName, query);
      } catch (error) {
        console.error('Search assets error:', error);
        throw error;
      }
    });

    ipcMain.handle('airtable:bulk-update-assets', async (event, { tableName, updates }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.bulkUpdateAssets(tableName, updates);
      } catch (error) {
        console.error('Bulk update assets error:', error);
        throw error;
      }
    });

    ipcMain.handle('airtable:create-initial-tables', async () => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.createInitialTables();
      } catch (error) {
        console.error('Create initial tables error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('airtable:create-client-asset-table', async (event, { clientName }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.createClientAssetTable(clientName);
      } catch (error) {
        console.error('Create client asset table error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('airtable:add-field-to-table', async (event, { tableName, fieldDefinition }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.addFieldToTable(tableName, fieldDefinition);
      } catch (error) {
        console.error('Add field to table error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('airtable:update-table-name', async (event, { oldName, newName }) => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.updateTableName(oldName, newName);
      } catch (error) {
        console.error('Update table name error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('airtable:get-companies', async () => {
      try {
        const { airtableService } = require('../src/services/AirtableService');
        return await airtableService.getCompanies();
      } catch (error) {
        console.error('Get companies error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // App info
    ipcMain.handle('app:get-version', () => {
      return app.getVersion();
    });

    // Window controls
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('window:close', () => {
      this.mainWindow?.close();
    });
  }

  private setupAutoUpdater(): void {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
      
      autoUpdater.on('update-available', () => {
        this.mainWindow?.webContents.send('update-available');
      });

      autoUpdater.on('update-downloaded', () => {
        this.mainWindow?.webContents.send('update-downloaded');
      });
    }
  }
}

new MainWindow();