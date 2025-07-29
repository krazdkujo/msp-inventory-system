export interface Asset {
  id: string;
  clientId: string;
  assetTag: string;
  assetType: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Disposed';
  location?: string;
  assignedTo?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  notes?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface AssetSearchFilters {
  clientId?: string;
  assetType?: string;
  status?: string;
  manufacturer?: string;
  location?: string;
  assignedTo?: string;
  searchTerm?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AssetSortOptions {
  field: keyof Asset;
  direction: 'asc' | 'desc';
}

export interface AssetStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  disposed: number;
  byType: Record<string, number>;
  byLocation: Record<string, number>;
}

export interface BulkAssetOperation {
  type: 'update' | 'delete' | 'export';
  assetIds: string[];
  updates?: Partial<Asset>;
}

export interface AssetFormData {
  clientId: string;
  assetTag: string;
  assetType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: Asset['status'];
  location: string;
  assignedTo: string;
  purchaseDate: string;
  warrantyExpiry: string;
  notes: string;
  customFields: Record<string, any>;
}

export interface AssetValidationError {
  field: string;
  message: string;
}

export interface AssetImportResult {
  success: boolean;
  imported: number;
  errors: Array<{
    row: number;
    errors: AssetValidationError[];
  }>;
}