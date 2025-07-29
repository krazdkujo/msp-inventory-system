import { Asset, AssetSearchFilters, AssetSortOptions, AssetStats, AssetFormData, AssetValidationError } from '../types/asset';

interface ClientAssetRecord {
  AssetTag: string;
  AssetType: string;
  Manufacturer?: string;
  Model?: string;
  SerialNumber?: string;
  Status: 'Active' | 'Inactive' | 'Maintenance' | 'Disposed';
  Location?: string;
  AssignedTo?: string;
  PurchaseDate?: string;
  WarrantyExpiry?: string;
  Notes?: string;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string;
  UpdatedBy: string;
  [key: string]: any; // For custom fields
}

class AssetService {
  private isElectron = typeof window !== 'undefined' && window.electronAPI;

  // Create new asset
  async createAsset(clientId: string, assetData: AssetFormData): Promise<{ success: boolean; asset?: Asset; error?: string }> {
    try {
      if (!this.isElectron || !window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }

      // Validate asset data
      const validation = this.validateAssetData(assetData);
      if (!validation.valid) {
        return { success: false, error: validation.errors.map(e => e.message).join(', ') };
      }

      // Check for duplicate asset tag within client
      const existing = await this.getAssetByTag(clientId, assetData.assetTag);
      if (existing) {
        return { success: false, error: 'Asset tag already exists for this client' };
      }

      // Create asset record
      const record: ClientAssetRecord = {
        AssetTag: assetData.assetTag,
        AssetType: assetData.assetType,
        Manufacturer: assetData.manufacturer,
        Model: assetData.model,
        SerialNumber: assetData.serialNumber,
        Status: assetData.status,
        Location: assetData.location,
        AssignedTo: assetData.assignedTo,
        PurchaseDate: assetData.purchaseDate,
        WarrantyExpiry: assetData.warrantyExpiry,
        Notes: assetData.notes,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
        CreatedBy: 'current-user', // TODO: Get from auth service
        UpdatedBy: 'current-user',
        ...assetData.customFields
      };

      const result = await window.electronAPI.airtable.createAsset({ 
        tableName: `${clientId}_Assets`, 
        asset: record 
      });
      
      if (result.success && result.record) {
        const asset = this.mapRecordToAsset(clientId, result.record);
        return { success: true, asset };
      }

      return { success: false, error: result.error || 'Failed to create asset' };
    } catch (error: any) {
      console.error('Error creating asset:', error);
      return { success: false, error: error.message || 'Unexpected error occurred' };
    }
  }

  // Get asset by tag
  async getAssetByTag(clientId: string, assetTag: string): Promise<Asset | null> {
    try {
      if (!this.isElectron || !window.electronAPI) {
        return null;
      }

      const result = await window.electronAPI.airtable.searchAssets({ 
        tableName: `${clientId}_Assets`, 
        query: assetTag 
      });

      if (result.success && result.records && result.records.length > 0) {
        return this.mapRecordToAsset(clientId, result.records[0]);
      }

      return null;
    } catch (error) {
      console.error('Error getting asset by tag:', error);
      return null;
    }
  }

  // Search assets with filters and sorting
  async searchAssets(
    filters: AssetSearchFilters, 
    sort?: AssetSortOptions
  ): Promise<(ClientAssetRecord & { clientName: string; clientId: string })[]> {
    try {
      if (!this.isElectron || !window.electronAPI) {
        return [];
      }

      // Build filter formula
      let filterFormula = '';
      const conditions: string[] = [];

      if (filters.clientId) {
        // For single client, get records directly
        const result = await window.electronAPI.airtable.getAssets({ 
          tableName: `${filters.clientId}_Assets`,
          filters: filters 
        });

        if (result.success && result.records) {
          return result.records.map((record: any) => ({
            ...record,
            clientId: filters.clientId!,
            clientName: 'Current Client' // TODO: Get actual client name
          }));
        }
        return [];
      }

      // For cross-client search, we'd need to iterate through all clients
      // This is a simplified version - in practice, you'd want to optimize this
      return [];
    } catch (error) {
      console.error('Error searching assets:', error);
      return [];
    }
  }

  // Get asset statistics
  async getAssetStats(clientId: string): Promise<AssetStats> {
    try {
      if (!this.isElectron || !window.electronAPI) {
        return this.getEmptyStats();
      }

      const result = await window.electronAPI.airtable.getAssets({ 
        tableName: `${clientId}_Assets` 
      });
      
      if (!result.success || !result.records) {
        return this.getEmptyStats();
      }

      const records = result.records as ClientAssetRecord[];
      const stats: AssetStats = {
        total: records.length,
        active: 0,
        inactive: 0,
        maintenance: 0,
        disposed: 0,
        byType: {},
        byLocation: {}
      };

      records.forEach(record => {
        // Count by status
        switch (record.Status) {
          case 'Active':
            stats.active++;
            break;
          case 'Inactive':
            stats.inactive++;
            break;
          case 'Maintenance':
            stats.maintenance++;
            break;
          case 'Disposed':
            stats.disposed++;
            break;
        }

        // Count by type
        if (record.AssetType) {
          stats.byType[record.AssetType] = (stats.byType[record.AssetType] || 0) + 1;
        }

        // Count by location
        if (record.Location) {
          stats.byLocation[record.Location] = (stats.byLocation[record.Location] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting asset stats:', error);
      return this.getEmptyStats();
    }
  }

  // Update asset
  async updateAsset(clientId: string, assetId: string, updates: Partial<AssetFormData>): Promise<{ success: boolean; asset?: Asset; error?: string }> {
    try {
      if (!this.isElectron || !window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }

      // Prepare update record
      const updateRecord: Partial<ClientAssetRecord> = {};
      
      if (updates.assetTag) updateRecord.AssetTag = updates.assetTag;
      if (updates.assetType) updateRecord.AssetType = updates.assetType;
      if (updates.manufacturer) updateRecord.Manufacturer = updates.manufacturer;
      if (updates.model) updateRecord.Model = updates.model;
      if (updates.serialNumber) updateRecord.SerialNumber = updates.serialNumber;
      if (updates.status) updateRecord.Status = updates.status;
      if (updates.location) updateRecord.Location = updates.location;
      if (updates.assignedTo) updateRecord.AssignedTo = updates.assignedTo;
      if (updates.purchaseDate) updateRecord.PurchaseDate = updates.purchaseDate;
      if (updates.warrantyExpiry) updateRecord.WarrantyExpiry = updates.warrantyExpiry;
      if (updates.notes) updateRecord.Notes = updates.notes;
      if (updates.customFields) Object.assign(updateRecord, updates.customFields);

      updateRecord.UpdatedAt = new Date().toISOString();
      updateRecord.UpdatedBy = 'current-user'; // TODO: Get from auth service

      const result = await window.electronAPI.airtable.updateAsset({ 
        tableName: `${clientId}_Assets`, 
        assetId, 
        updates: updateRecord 
      });
      
      if (result.success && result.record) {
        const asset = this.mapRecordToAsset(clientId, result.record);
        return { success: true, asset };
      }

      return { success: false, error: result.error || 'Failed to update asset' };
    } catch (error: any) {
      console.error('Error updating asset:', error);
      return { success: false, error: error.message || 'Unexpected error occurred' };
    }
  }

  // Delete asset
  async deleteAsset(clientId: string, assetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isElectron || !window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }

      const result = await window.electronAPI.airtable.deleteAsset({ 
        tableName: `${clientId}_Assets`, 
        assetId 
      });
      return result;
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      return { success: false, error: error.message || 'Unexpected error occurred' };
    }
  }

  // Export assets to CSV
  async exportAssets(clientId: string, filters?: AssetSearchFilters): Promise<{ success: boolean; csv?: string; error?: string }> {
    try {
      const assets = await this.searchAssets(filters || { clientId });
      
      if (assets.length === 0) {
        return { success: false, error: 'No assets found to export' };
      }

      // Define CSV headers
      const headers = [
        'Asset Tag', 'Asset Type', 'Manufacturer', 'Model', 'Serial Number',
        'Status', 'Location', 'Assigned To', 'Purchase Date', 'Warranty Expiry',
        'Notes', 'Created At', 'Updated At'
      ];

      // Convert assets to CSV rows
      const rows = assets.map(asset => [
        asset.AssetTag || '',
        asset.AssetType || '',
        asset.Manufacturer || '',
        asset.Model || '',
        asset.SerialNumber || '',
        asset.Status || '',
        asset.Location || '',
        asset.AssignedTo || '',
        asset.PurchaseDate || '',
        asset.WarrantyExpiry || '',
        asset.Notes || '',
        asset.CreatedAt || '',
        asset.UpdatedAt || ''
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return { success: true, csv: csvContent };
    } catch (error: any) {
      console.error('Error exporting assets:', error);
      return { success: false, error: error.message || 'Export failed' };
    }
  }

  // Private helper methods
  private validateAssetData(data: AssetFormData): { valid: boolean; errors: AssetValidationError[] } {
    const errors: AssetValidationError[] = [];

    if (!data.assetTag?.trim()) {
      errors.push({ field: 'assetTag', message: 'Asset tag is required' });
    }

    if (!data.assetType?.trim()) {
      errors.push({ field: 'assetType', message: 'Asset type is required' });
    }

    if (!data.status) {
      errors.push({ field: 'status', message: 'Status is required' });
    }

    if (!data.clientId?.trim()) {
      errors.push({ field: 'clientId', message: 'Client is required' });
    }

    return { valid: errors.length === 0, errors };
  }

  private buildFilterFormula(filters: AssetSearchFilters): string {
    const conditions: string[] = [];

    if (filters.assetType) {
      conditions.push(`{AssetType} = '${filters.assetType}'`);
    }

    if (filters.status) {
      conditions.push(`{Status} = '${filters.status}'`);
    }

    if (filters.manufacturer) {
      conditions.push(`{Manufacturer} = '${filters.manufacturer}'`);
    }

    if (filters.location) {
      conditions.push(`{Location} = '${filters.location}'`);
    }

    if (filters.assignedTo) {
      conditions.push(`{AssignedTo} = '${filters.assignedTo}'`);
    }

    if (filters.searchTerm) {
      const searchConditions = [
        `FIND('${filters.searchTerm}', {AssetTag}) > 0`,
        `FIND('${filters.searchTerm}', {Manufacturer}) > 0`,
        `FIND('${filters.searchTerm}', {Model}) > 0`,
        `FIND('${filters.searchTerm}', {SerialNumber}) > 0`
      ];
      conditions.push(`OR(${searchConditions.join(', ')})`);
    }

    return conditions.length > 0 ? `AND(${conditions.join(', ')})` : '';
  }

  private mapRecordToAsset(clientId: string, record: any): Asset {
    return {
      id: record.id,
      clientId,
      assetTag: record.AssetTag || '',
      assetType: record.AssetType || '',
      manufacturer: record.Manufacturer,
      model: record.Model,
      serialNumber: record.SerialNumber,
      status: record.Status || 'Active',
      location: record.Location,
      assignedTo: record.AssignedTo,
      purchaseDate: record.PurchaseDate ? new Date(record.PurchaseDate) : undefined,
      warrantyExpiry: record.WarrantyExpiry ? new Date(record.WarrantyExpiry) : undefined,
      notes: record.Notes,
      customFields: this.extractCustomFields(record),
      createdAt: new Date(record.CreatedAt || Date.now()),
      updatedAt: new Date(record.UpdatedAt || Date.now()),
      createdBy: record.CreatedBy || '',
      updatedBy: record.UpdatedBy || ''
    };
  }

  private extractCustomFields(record: any): Record<string, any> {
    const standardFields = [
      'id', 'AssetTag', 'AssetType', 'Manufacturer', 'Model', 'SerialNumber',
      'Status', 'Location', 'AssignedTo', 'PurchaseDate', 'WarrantyExpiry',
      'Notes', 'CreatedAt', 'UpdatedAt', 'CreatedBy', 'UpdatedBy'
    ];

    const customFields: Record<string, any> = {};
    Object.keys(record).forEach(key => {
      if (!standardFields.includes(key)) {
        customFields[key] = record[key];
      }
    });

    return customFields;
  }

  private getEmptyStats(): AssetStats {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      maintenance: 0,
      disposed: 0,
      byType: {},
      byLocation: {}
    };
  }
}

// Export singleton instance
export const assetService = new AssetService();
export default AssetService;