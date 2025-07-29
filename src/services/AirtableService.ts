import Airtable from 'airtable';
import { configService } from './ConfigService';

// Import fetch for Node.js environments
const fetch = globalThis.fetch || require('node-fetch') as typeof globalThis.fetch;

// Asset types
export interface Asset {
  id?: string;
  assetTag: string;
  serialNumber?: string;
  make?: string;
  model?: string;
  assetType?: string;
  location?: string;
  assignedUser?: string;
  purchaseDate?: Date;
  warrantyExpiration?: Date;
  status: 'Active' | 'Retired' | 'In Repair' | 'Missing' | 'Disposed';
  notes?: string;
  createdDate?: Date;
  createdUser?: string;
  lastModifiedDate?: Date;
  lastModifiedUser?: string;
  customFields?: Record<string, any>;
}

export interface Client {
  id: string;
  name: string;
  description?: string;
  tableName: string;
  createdAt: Date;
  lastScanDate?: Date;
  isActive: boolean;
  customFields?: CustomField[];
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'longtext';
  options?: string[]; // For select/multiselect fields
  required?: boolean;
  description?: string;
}

export interface AirtableConfig {
  pat: string;
  baseId: string;
}

class AirtableService {
  private airtable: Airtable | null = null;
  private base: Airtable.Base | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const pat = configService.getAirtablePAT();
      const baseId = configService.getAirtableBaseId();

      if (!pat || !baseId) {
        console.warn('Airtable credentials not configured');
        return;
      }

      this.airtable = new Airtable({
        apiKey: pat,
      });

      this.base = this.airtable.base(baseId);
      this.isInitialized = true;
      
      console.log('Airtable service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Airtable service:', error);
      throw new Error('Airtable initialization failed');
    }
  }

  public async reinitialize(): Promise<void> {
    this.isInitialized = false;
    this.airtable = null;
    this.base = null;
    await this.initialize();
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.base) {
      throw new Error('Airtable service not initialized. Please configure your credentials.');
    }
  }

  // Client Management
  public async createClientTable(clientName: string, description?: string): Promise<Client> {
    this.ensureInitialized();

    const tableName = this.generateTableName(clientName);
    
    try {
      // Create the standard asset schema
      const standardFields = [
        { name: 'Asset Tag', type: 'singleLineText' },
        { name: 'Serial Number', type: 'singleLineText' },
        { name: 'Make', type: 'singleLineText' },
        { name: 'Model', type: 'singleLineText' },
        { name: 'Asset Type', type: 'singleSelect', options: { 
          choices: [
            { name: 'Desktop' },
            { name: 'Laptop' },
            { name: 'Server' },
            { name: 'Monitor' },
            { name: 'Printer' },
            { name: 'Network Equipment' },
            { name: 'Mobile Device' },
            { name: 'Other' }
          ]
        }},
        { name: 'Location', type: 'singleLineText' },
        { name: 'Assigned User', type: 'singleLineText' },
        { name: 'Purchase Date', type: 'date' },
        { name: 'Warranty Expiration', type: 'date' },
        { name: 'Status', type: 'singleSelect', options: {
          choices: [
            { name: 'Active' },
            { name: 'Retired' },
            { name: 'In Repair' },
            { name: 'Missing' },
            { name: 'Disposed' }
          ]
        }},
        { name: 'Notes', type: 'multilineText' },
        { name: 'Created Date', type: 'createdTime' },
        { name: 'Created User', type: 'singleLineText' },
        { name: 'Last Modified Date', type: 'lastModifiedTime' },
        { name: 'Last Modified User', type: 'singleLineText' }
      ];

      // Note: Airtable API doesn't support programmatic table creation
      // This would need to be done manually or through their Meta API (enterprise)
      // For now, we'll assume the table exists and validate it
      
      const client: Client = {
        id: this.generateClientId(),
        name: clientName,
        description,
        tableName,
        createdAt: new Date(),
        isActive: true,
      };

      return client;
    } catch (error) {
      console.error('Failed to create client table:', error);
      throw new Error(`Failed to create table for client: ${clientName}`);
    }
  }

  private generateTableName(clientName: string): string {
    // Convert client name to valid table name
    return clientName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase()
      .substring(0, 50); // Limit length
  }

  private generateClientId(): string {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Asset CRUD Operations
  public async getAssets(tableName: string, filters?: {
    assetType?: string;
    status?: string;
    assignedUser?: string;
    location?: string;
  }): Promise<Asset[]> {
    this.ensureInitialized();

    try {
      let formula = '';
      
      if (filters) {
        const conditions: string[] = [];
        
        if (filters.assetType) {
          conditions.push(`{Asset Type} = "${filters.assetType}"`);
        }
        if (filters.status) {
          conditions.push(`{Status} = "${filters.status}"`);
        }
        if (filters.assignedUser) {
          conditions.push(`{Assigned User} = "${filters.assignedUser}"`);
        }
        if (filters.location) {
          conditions.push(`{Location} = "${filters.location}"`);
        }
        
        if (conditions.length > 0) {
          formula = `AND(${conditions.join(', ')})`;
        }
      }

      const records = await this.base!(tableName)
        .select({
          filterByFormula: formula,
          sort: [{ field: 'Created Date', direction: 'desc' }]
        })
        .all();

      return records.map(record => this.mapRecordToAsset(record));
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      throw new Error('Failed to fetch assets from Airtable');
    }
  }

  public async getAssetById(tableName: string, assetId: string): Promise<Asset | null> {
    this.ensureInitialized();

    try {
      const record = await this.base!(tableName).find(assetId);
      return this.mapRecordToAsset(record);
    } catch (error) {
      console.error('Failed to fetch asset:', error);
      return null;
    }
  }

  public async createAsset(tableName: string, asset: Omit<Asset, 'id'>): Promise<Asset> {
    this.ensureInitialized();

    try {
      const record = await this.base!(tableName).create({
        'Asset Tag': asset.assetTag,
        'Serial Number': asset.serialNumber,
        'Make': asset.make,
        'Model': asset.model,
        'Asset Type': asset.assetType,
        'Location': asset.location,
        'Assigned User': asset.assignedUser,
        'Purchase Date': asset.purchaseDate?.toISOString().split('T')[0],
        'Warranty Expiration': asset.warrantyExpiration?.toISOString().split('T')[0],
        'Status': asset.status,
        'Notes': asset.notes,
        'Created User': asset.createdUser,
        'Last Modified User': asset.lastModifiedUser,
        ...asset.customFields,
      });

      return this.mapRecordToAsset(record);
    } catch (error) {
      console.error('Failed to create asset:', error);
      throw new Error('Failed to create asset in Airtable');
    }
  }

  public async updateAsset(tableName: string, assetId: string, updates: Partial<Asset>): Promise<Asset> {
    this.ensureInitialized();

    try {
      const updateFields: Record<string, any> = {};
      
      if (updates.assetTag !== undefined) updateFields['Asset Tag'] = updates.assetTag;
      if (updates.serialNumber !== undefined) updateFields['Serial Number'] = updates.serialNumber;
      if (updates.make !== undefined) updateFields['Make'] = updates.make;
      if (updates.model !== undefined) updateFields['Model'] = updates.model;
      if (updates.assetType !== undefined) updateFields['Asset Type'] = updates.assetType;
      if (updates.location !== undefined) updateFields['Location'] = updates.location;
      if (updates.assignedUser !== undefined) updateFields['Assigned User'] = updates.assignedUser;
      if (updates.purchaseDate !== undefined) updateFields['Purchase Date'] = updates.purchaseDate?.toISOString().split('T')[0];
      if (updates.warrantyExpiration !== undefined) updateFields['Warranty Expiration'] = updates.warrantyExpiration?.toISOString().split('T')[0];
      if (updates.status !== undefined) updateFields['Status'] = updates.status;
      if (updates.notes !== undefined) updateFields['Notes'] = updates.notes;
      if (updates.lastModifiedUser !== undefined) updateFields['Last Modified User'] = updates.lastModifiedUser;
      
      if (updates.customFields) {
        Object.assign(updateFields, updates.customFields);
      }

      const record = await this.base!(tableName).update(assetId, updateFields);
      return this.mapRecordToAsset(record);
    } catch (error) {
      console.error('Failed to update asset:', error);
      throw new Error('Failed to update asset in Airtable');
    }
  }

  public async deleteAsset(tableName: string, assetId: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.base!(tableName).destroy(assetId);
    } catch (error) {
      console.error('Failed to delete asset:', error);
      throw new Error('Failed to delete asset from Airtable');
    }
  }

  public async bulkUpdateAssets(tableName: string, updates: Array<{ id: string; fields: Partial<Asset> }>): Promise<Asset[]> {
    this.ensureInitialized();

    try {
      const updateRecords = updates.map(update => ({
        id: update.id,
        fields: this.mapAssetToFields(update.fields),
      }));

      const records = await this.base!(tableName).update(updateRecords);
      return records.map(record => this.mapRecordToAsset(record));
    } catch (error) {
      console.error('Failed to bulk update assets:', error);
      throw new Error('Failed to bulk update assets in Airtable');
    }
  }

  // Search and filtering
  public async searchAssets(tableName: string, query: string): Promise<Asset[]> {
    this.ensureInitialized();

    try {
      const searchFields = ['Asset Tag', 'Serial Number', 'Make', 'Model', 'Assigned User', 'Location'];
      const conditions = searchFields.map(field => `SEARCH("${query}", {${field}})`);
      const formula = `OR(${conditions.join(', ')})`;

      const records = await this.base!(tableName)
        .select({
          filterByFormula: formula,
          sort: [{ field: 'Created Date', direction: 'desc' }]
        })
        .all();

      return records.map(record => this.mapRecordToAsset(record));
    } catch (error) {
      console.error('Failed to search assets:', error);
      throw new Error('Failed to search assets in Airtable');
    }
  }

  // Utility methods
  private mapRecordToAsset(record: any): Asset {
    const fields = record.fields;
    
    return {
      id: record.id,
      assetTag: fields['Asset Tag'] || '',
      serialNumber: fields['Serial Number'],
      make: fields['Make'],
      model: fields['Model'],
      assetType: fields['Asset Type'],
      location: fields['Location'],
      assignedUser: fields['Assigned User'],
      purchaseDate: fields['Purchase Date'] ? new Date(fields['Purchase Date']) : undefined,
      warrantyExpiration: fields['Warranty Expiration'] ? new Date(fields['Warranty Expiration']) : undefined,
      status: fields['Status'] || 'Active',
      notes: fields['Notes'],
      createdDate: fields['Created Date'] ? new Date(fields['Created Date']) : undefined,
      createdUser: fields['Created User'],
      lastModifiedDate: fields['Last Modified Date'] ? new Date(fields['Last Modified Date']) : undefined,
      lastModifiedUser: fields['Last Modified User'],
    };
  }

  private mapAssetToFields(asset: Partial<Asset>): Record<string, any> {
    const fields: Record<string, any> = {};
    
    if (asset.assetTag !== undefined) fields['Asset Tag'] = asset.assetTag;
    if (asset.serialNumber !== undefined) fields['Serial Number'] = asset.serialNumber;
    if (asset.make !== undefined) fields['Make'] = asset.make;
    if (asset.model !== undefined) fields['Model'] = asset.model;
    if (asset.assetType !== undefined) fields['Asset Type'] = asset.assetType;
    if (asset.location !== undefined) fields['Location'] = asset.location;
    if (asset.assignedUser !== undefined) fields['Assigned User'] = asset.assignedUser;
    if (asset.purchaseDate !== undefined) fields['Purchase Date'] = asset.purchaseDate?.toISOString().split('T')[0];
    if (asset.warrantyExpiration !== undefined) fields['Warranty Expiration'] = asset.warrantyExpiration?.toISOString().split('T')[0];
    if (asset.status !== undefined) fields['Status'] = asset.status;
    if (asset.notes !== undefined) fields['Notes'] = asset.notes;
    if (asset.lastModifiedUser !== undefined) fields['Last Modified User'] = asset.lastModifiedUser;
    
    return fields;
  }

  // Validation and testing
  public async testConnection(): Promise<{ success: boolean; error?: string; tables?: string[] }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const pat = configService.getAirtablePAT();
      const baseId = configService.getAirtableBaseId();
      
      if (!pat || !baseId) {
        return { success: false, error: 'Airtable credentials not configured' };
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
      
      // Test base access by trying common table names
      const commonTableNames = ['Table 1', 'Assets', 'Main Table', 'Data', 'Records'];
      
      for (const tableName of commonTableNames) {
        try {
          const records = await this.base!(tableName).select({ maxRecords: 1 }).firstPage();
          return { 
            success: true, 
            tables: [tableName] // We found a working table
          };
        } catch (tableError: any) {
          // If this specific table doesn't exist or is forbidden, try the next one
          if (tableError.statusCode === 404 || tableError.statusCode === 403) {
            continue; // Try next table
          }
          // For other errors, this might be a real connection issue
          if (tableError.statusCode === 401) {
            return { success: false, error: 'Invalid Personal Access Token' };
          }
        }
      }
      
      // If we get here, we tried all common table names
      try {
        // One more attempt with a generic error catch
        const records = await this.base!('Table 1').select({ maxRecords: 1 }).firstPage();
        return { 
          success: true, 
          tables: ['Table 1']
        };
      } catch (baseError: any) {
        
        // Other errors indicate real connection problems
        if (baseError.statusCode === 401) {
          return { success: false, error: 'Invalid Personal Access Token' };
        } else if (baseError.statusCode === 403) {
          return { success: false, error: 'Access forbidden - check token permissions' };
        } else if (baseError.statusCode === 404) {
          return { success: false, error: 'Base not found or no access permission' };
        } else {
          return { success: false, error: `Connection failed: ${baseError.message}` };
        }
      }
    } catch (error) {
      console.error('Airtable connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  public async getTableSchema(tableName: string): Promise<any> {
    this.ensureInitialized();
    
    try {
      // Get a sample record to understand the schema
      const records = await this.base!(tableName).select({ maxRecords: 1 }).firstPage();
      
      if (records.length > 0) {
        return Object.keys(records[0].fields);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get table schema:', error);
      throw new Error('Failed to get table schema from Airtable');
    }
  }
}

// Export singleton instance
export const airtableService = new AirtableService();
export default AirtableService;