import Store from 'electron-store';
import * as crypto from 'crypto';

interface AppConfig {
  airtablePAT?: string;
  airtableBaseId?: string;
  encryptionKey?: string;
  lastUser?: string;
  theme?: 'light' | 'dark';
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

class ConfigService {
  private store: any;
  private encryptionKey: string;

  constructor() {
    // Initialize encrypted store
    this.encryptionKey = this.getOrCreateEncryptionKey();
    
    this.store = new Store({
      name: 'msp-inventory-config',
      encryptionKey: this.encryptionKey,
      fileExtension: 'dat',
      defaults: {
        theme: 'light',
        windowBounds: {
          x: 100,
          y: 100,
          width: 1200,
          height: 800,
        },
      },
    });
  }

  private getOrCreateEncryptionKey(): string {
    const keyStore = new Store({
      name: 'msp-inventory-key',
      fileExtension: 'key',
    }) as any;

    let key = keyStore.get('encryptionKey') as string | undefined;
    
    if (!key) {
      // Generate a new 32-byte encryption key
      key = crypto.randomBytes(32).toString('hex');
      keyStore.set('encryptionKey', key);
    }
    
    return key;
  }

  // Airtable configuration
  public getAirtablePAT(): string | undefined {
    // First check environment variable (for development)
    if (process.env.AIRTABLE_PAT) {
      return process.env.AIRTABLE_PAT;
    }
    
    // Then check encrypted store
    return this.store.get('airtablePAT');
  }

  public setAirtablePAT(pat: string): void {
    if (!pat || pat.trim().length === 0) {
      throw new Error('Airtable PAT cannot be empty');
    }
    
    // Validate PAT format (should start with 'pat' and be reasonable length)
    if (!pat.startsWith('pat') || pat.length < 10) {
      throw new Error('Invalid Airtable PAT format');
    }
    
    this.store.set('airtablePAT', pat);
  }

  public getAirtableBaseId(): string | undefined {
    if (process.env.AIRTABLE_BASE_ID) {
      return process.env.AIRTABLE_BASE_ID;
    }
    
    return this.store.get('airtableBaseId');
  }

  public setAirtableBaseId(baseId: string): void {
    if (!baseId || baseId.trim().length === 0) {
      throw new Error('Airtable Base ID cannot be empty');
    }
    
    // Validate base ID format (should start with 'app' and be reasonable length)
    if (!baseId.startsWith('app') || baseId.length < 10) {
      throw new Error('Invalid Airtable Base ID format');
    }
    
    this.store.set('airtableBaseId', baseId);
  }

  // User preferences
  public getLastUser(): string | undefined {
    return this.store.get('lastUser');
  }

  public setLastUser(username: string): void {
    this.store.set('lastUser', username);
  }

  public getTheme(): 'light' | 'dark' {
    return this.store.get('theme', 'light');
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.store.set('theme', theme);
  }

  // Window state
  public getWindowBounds(): { x: number; y: number; width: number; height: number } {
    return this.store.get('windowBounds', {
      x: 100,
      y: 100,
      width: 1200,
      height: 800,
    });
  }

  public setWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.store.set('windowBounds', bounds);
  }

  // Configuration validation
  public isConfigured(): boolean {
    const pat = this.getAirtablePAT();
    const baseId = this.getAirtableBaseId();
    
    return !!(pat && baseId);
  }

  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const pat = this.getAirtablePAT();
    if (!pat) {
      errors.push('Airtable Personal Access Token is required');
    } else if (!pat.startsWith('pat') || pat.length < 10) {
      errors.push('Invalid Airtable Personal Access Token format');
    }
    
    const baseId = this.getAirtableBaseId();
    if (!baseId) {
      errors.push('Airtable Base ID is required');
    } else if (!baseId.startsWith('app') || baseId.length < 10) {
      errors.push('Invalid Airtable Base ID format');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Test and save Airtable credentials
  public async testAndSaveAirtableCredentials(pat: string, baseId: string): Promise<{ success: boolean; error?: string; tables?: any[] }> {
    try {
      // Validate format first
      if (!pat.startsWith('pat') || pat.length < 10) {
        return { success: false, error: 'Invalid Airtable Personal Access Token format' };
      }
      
      if (!baseId.startsWith('app') || baseId.length < 10) {
        return { success: false, error: 'Invalid Airtable Base ID format' };
      }

      // First test basic authentication
      const authResponse = await fetch('https://api.airtable.com/v0/meta/whoami', {
        headers: {
          'Authorization': `Bearer ${pat}`
        }
      });

      if (!authResponse.ok) {
        return { success: false, error: 'Invalid Personal Access Token' };
      }

      // Test base access using the Airtable client directly
      const Airtable = require('airtable');
      const airtable = new Airtable({ apiKey: pat });
      const base = airtable.base(baseId);

      // Try common table names to test base access
      const commonTableNames = ['Table 1', 'Assets', 'Main Table', 'Data', 'Records'];
      let foundTable = null;

      for (const tableName of commonTableNames) {
        try {
          await base(tableName).select({ maxRecords: 1 }).firstPage();
          foundTable = tableName;
          break;
        } catch (tableError: any) {
          if (tableError.statusCode === 404 || tableError.statusCode === 403) {
            continue; // Try next table
          }
          if (tableError.statusCode === 401) {
            return { success: false, error: 'Invalid Personal Access Token' };
          }
        }
      }

      if (!foundTable) {
        return { success: false, error: 'Base not found or no access permission' };
      }
      
      // If successful, save the credentials
      this.setAirtablePAT(pat);
      this.setAirtableBaseId(baseId);
      
      return { 
        success: true, 
        tables: [{ name: foundTable }] 
      };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown connection error' 
      };
    }
  }

  // Clear sensitive data
  public clearAirtableConfig(): void {
    this.store.delete('airtablePAT');
    this.store.delete('airtableBaseId');
  }

  public clearAllConfig(): void {
    this.store.clear();
  }

  // Get all config (excluding sensitive data for logging)
  public getConfigSummary(): Partial<AppConfig> {
    return {
      theme: this.getTheme(),
      windowBounds: this.getWindowBounds(),
      lastUser: this.getLastUser(),
      // Note: Never include PAT or Base ID in summaries for security
    };
  }
}

// Export singleton instance
export const configService = new ConfigService();
export default ConfigService;