import React, { useState, useEffect } from 'react';
import { Asset, AssetSearchFilters, AssetSortOptions, AssetStats } from '../../types/asset';
import AssetTable from './AssetTable';
import AssetForm from './AssetForm';
import AssetFilters from './AssetFilters';
import { assetService } from '../../services/AssetService';
import '../../styles/AssetManagement.css';

interface AssetManagementState {
  assets: Asset[];
  stats: AssetStats;
  loading: boolean;
  error: string | null;
  selectedAssets: string[];
  showForm: boolean;
  formMode: 'create' | 'edit';
  selectedAsset: Asset | null;
  filters: AssetSearchFilters;
  sortOptions: AssetSortOptions;
}

interface AssetManagementProps {
  clientId: string;
  userRole: 'admin' | 'technician' | 'readonly';
}

const AssetManagement: React.FC<AssetManagementProps> = ({ clientId, userRole }) => {
  const [state, setState] = useState<AssetManagementState>({
    assets: [],
    stats: { total: 0, active: 0, inactive: 0, maintenance: 0, disposed: 0, byType: {}, byLocation: {} },
    loading: true,
    error: null,
    selectedAssets: [],
    showForm: false,
    formMode: 'create',
    selectedAsset: null,
    filters: { clientId },
    sortOptions: { field: 'updatedAt', direction: 'desc' }
  });

  const isReadOnly = userRole === 'readonly';

  // Load initial data
  useEffect(() => {
    loadAssets();
    loadStats();
  }, [clientId, state.filters, state.sortOptions]);

  const updateState = (updates: Partial<AssetManagementState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const loadAssets = async () => {
    try {
      updateState({ loading: true, error: null });
      const assets = await assetService.searchAssets(state.filters, state.sortOptions);
      const mappedAssets = assets.map(asset => ({
        id: asset.id || '',
        clientId: asset.clientId,
        assetTag: asset.AssetTag || '',
        assetType: asset.AssetType || '',
        manufacturer: asset.Manufacturer,
        model: asset.Model,
        serialNumber: asset.SerialNumber,
        status: asset.Status as Asset['status'],
        location: asset.Location,
        assignedTo: asset.AssignedTo,
        purchaseDate: asset.PurchaseDate ? new Date(asset.PurchaseDate) : undefined,
        warrantyExpiry: asset.WarrantyExpiry ? new Date(asset.WarrantyExpiry) : undefined,
        notes: asset.Notes,
        customFields: {},
        createdAt: new Date(asset.CreatedAt || Date.now()),
        updatedAt: new Date(asset.UpdatedAt || Date.now()),
        createdBy: asset.CreatedBy || '',
        updatedBy: asset.UpdatedBy || ''
      }));
      updateState({ assets: mappedAssets, loading: false });
    } catch (error: any) {
      updateState({ error: error.message || 'Failed to load assets', loading: false });
    }
  };

  const loadStats = async () => {
    try {
      const stats = await assetService.getAssetStats(clientId);
      updateState({ stats });
    } catch (error) {
      console.error('Error loading asset stats:', error);
    }
  };

  const handleCreateAsset = () => {
    updateState({
      showForm: true,
      formMode: 'create',
      selectedAsset: null
    });
  };

  const handleEditAsset = (asset: Asset) => {
    updateState({
      showForm: true,
      formMode: 'edit',
      selectedAsset: asset
    });
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      updateState({ loading: true });
      const result = await assetService.deleteAsset(clientId, assetId);
      
      if (result.success) {
        await loadAssets();
        await loadStats();
      } else {
        updateState({ error: result.error || 'Failed to delete asset', loading: false });
      }
    } catch (error: any) {
      updateState({ error: error.message || 'Failed to delete asset', loading: false });
    }
  };

  const handleBulkDelete = async () => {
    if (state.selectedAssets.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${state.selectedAssets.length} assets?`)) return;

    try {
      updateState({ loading: true });
      
      const deletePromises = state.selectedAssets.map(assetId =>
        assetService.deleteAsset(clientId, assetId)
      );
      
      await Promise.all(deletePromises);
      
      updateState({ selectedAssets: [] });
      await loadAssets();
      await loadStats();
    } catch (error: any) {
      updateState({ error: error.message || 'Failed to delete assets', loading: false });
    }
  };

  const handleExportAssets = async () => {
    try {
      updateState({ loading: true });
      const result = await assetService.exportAssets(clientId, state.filters);
      
      if (result.success && result.csv) {
        // Create and download CSV file
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `assets-${clientId}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        updateState({ error: result.error || 'Export failed' });
      }
      
      updateState({ loading: false });
    } catch (error: any) {
      updateState({ error: error.message || 'Export failed', loading: false });
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      updateState({ loading: true });
      
      let result;
      if (state.formMode === 'create') {
        result = await assetService.createAsset(clientId, formData);
      } else if (state.selectedAsset) {
        result = await assetService.updateAsset(clientId, state.selectedAsset.id, formData);
      }
      
      if (result?.success) {
        updateState({ showForm: false, selectedAsset: null });
        await loadAssets();
        await loadStats();
      } else {
        updateState({ error: result?.error || 'Operation failed', loading: false });
      }
    } catch (error: any) {
      updateState({ error: error.message || 'Operation failed', loading: false });
    }
  };

  const handleFormCancel = () => {
    updateState({ showForm: false, selectedAsset: null });
  };

  const handleFiltersChange = (newFilters: AssetSearchFilters) => {
    updateState({ filters: { ...state.filters, ...newFilters } });
  };

  const handleSortChange = (sortOptions: AssetSortOptions) => {
    updateState({ sortOptions });
  };

  const handleSelectionChange = (selectedAssets: string[]) => {
    updateState({ selectedAssets });
  };

  return (
    <div className="asset-management">
      <div className="asset-header">
        <div className="header-content">
          <h1>Asset Management</h1>
          <div className="header-actions">
            {!isReadOnly && (
              <>
                <button
                  onClick={handleCreateAsset}
                  className="btn btn-primary"
                  disabled={state.loading}
                >
                  Add Asset
                </button>
                {state.selectedAssets.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="btn btn-danger"
                    disabled={state.loading}
                  >
                    Delete Selected ({state.selectedAssets.length})
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleExportAssets}
              className="btn btn-secondary"
              disabled={state.loading}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{state.stats.total}</div>
            <div className="stat-label">Total Assets</div>
          </div>
          <div className="stat-card active">
            <div className="stat-number">{state.stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card inactive">
            <div className="stat-number">{state.stats.inactive}</div>
            <div className="stat-label">Inactive</div>
          </div>
          <div className="stat-card maintenance">
            <div className="stat-number">{state.stats.maintenance}</div>
            <div className="stat-label">Maintenance</div>
          </div>
          <div className="stat-card disposed">
            <div className="stat-number">{state.stats.disposed}</div>
            <div className="stat-label">Disposed</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AssetFilters
        filters={state.filters}
        onFiltersChange={handleFiltersChange}
        stats={state.stats}
      />

      {/* Error Display */}
      {state.error && (
        <div className="error-banner">
          <span>{state.error}</span>
          <button onClick={() => updateState({ error: null })}>×</button>
        </div>
      )}

      {/* Loading State */}
      {state.loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading assets...</div>
        </div>
      )}

      {/* Asset Table */}
      <AssetTable
        assets={state.assets}
        selectedAssets={state.selectedAssets}
        sortOptions={state.sortOptions}
        onSelectionChange={handleSelectionChange}
        onSortChange={handleSortChange}
        onEditAsset={handleEditAsset}
        onDeleteAsset={handleDeleteAsset}
        userRole={userRole}
        loading={state.loading}
      />

      {/* Asset Form Modal */}
      {state.showForm && (
        <AssetForm
          asset={state.selectedAsset}
          clientId={clientId}
          mode={state.formMode}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          loading={state.loading}
        />
      )}
    </div>
  );
};

export default AssetManagement;