import React from 'react';
import { Asset, AssetSortOptions } from '../../types/asset';

interface AssetTableProps {
  assets: Asset[];
  selectedAssets: string[];
  sortOptions: AssetSortOptions;
  onSelectionChange: (selectedAssets: string[]) => void;
  onSortChange: (sortOptions: AssetSortOptions) => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (assetId: string) => void;
  userRole: 'admin' | 'technician' | 'readonly';
  loading: boolean;
}

const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  selectedAssets,
  sortOptions,
  onSelectionChange,
  onSortChange,
  onEditAsset,
  onDeleteAsset,
  userRole,
  loading
}) => {
  const isReadOnly = userRole === 'readonly';

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(assets.map(asset => asset.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedAssets, assetId]);
    } else {
      onSelectionChange(selectedAssets.filter(id => id !== assetId));
    }
  };

  const handleSort = (field: keyof Asset) => {
    const direction = sortOptions.field === field && sortOptions.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, direction });
  };

  const getSortIcon = (field: keyof Asset) => {
    if (sortOptions.field !== field) return '↕️';
    return sortOptions.direction === 'asc' ? '↑' : '↓';
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'maintenance': return 'status-maintenance';
      case 'disposed': return 'status-disposed';
      default: return 'status-unknown';
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="asset-table-loading">
        <div className="loading-spinner">Loading assets...</div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="asset-table-empty">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Assets Found</h3>
          <p>No assets match your current filters. Try adjusting your search criteria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="asset-table-container">
      <div className="table-wrapper">
        <table className="asset-table">
          <thead>
            <tr>
              {!isReadOnly && (
                <th className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedAssets.length === assets.length && assets.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              <th className="sortable" onClick={() => handleSort('assetTag')}>
                Asset Tag {getSortIcon('assetTag')}
              </th>
              <th className="sortable" onClick={() => handleSort('assetType')}>
                Type {getSortIcon('assetType')}
              </th>
              <th className="sortable" onClick={() => handleSort('manufacturer')}>
                Manufacturer {getSortIcon('manufacturer')}
              </th>
              <th className="sortable" onClick={() => handleSort('model')}>
                Model {getSortIcon('model')}
              </th>
              <th className="sortable" onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </th>
              <th className="sortable" onClick={() => handleSort('location')}>
                Location {getSortIcon('location')}
              </th>
              <th className="sortable" onClick={() => handleSort('assignedTo')}>
                Assigned To {getSortIcon('assignedTo')}
              </th>
              <th className="sortable" onClick={() => handleSort('updatedAt')}>
                Last Updated {getSortIcon('updatedAt')}
              </th>
              {!isReadOnly && <th className="actions-column">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className={selectedAssets.includes(asset.id) ? 'selected' : ''}>
                {!isReadOnly && (
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedAssets.includes(asset.id)}
                      onChange={(e) => handleSelectAsset(asset.id, e.target.checked)}
                    />
                  </td>
                )}
                <td className="asset-tag">
                  <strong>{asset.assetTag}</strong>
                  {asset.serialNumber && (
                    <div className="serial-number">S/N: {asset.serialNumber}</div>
                  )}
                </td>
                <td className="asset-type">{asset.assetType}</td>
                <td className="manufacturer">{asset.manufacturer || '-'}</td>
                <td className="model">{asset.model || '-'}</td>
                <td className="status">
                  <span className={`status-badge ${getStatusClass(asset.status)}`}>
                    {asset.status}
                  </span>
                </td>
                <td className="location">{asset.location || '-'}</td>
                <td className="assigned-to">{asset.assignedTo || '-'}</td>
                <td className="updated-at">
                  {formatDate(asset.updatedAt)}
                  <div className="updated-by">by {asset.updatedBy}</div>
                </td>
                {!isReadOnly && (
                  <td className="actions-column">
                    <div className="action-buttons">
                      <button
                        onClick={() => onEditAsset(asset)}
                        className="btn btn-sm btn-secondary"
                        title="Edit Asset"
                      >
                        ✏️
                      </button>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => onDeleteAsset(asset.id)}
                          className="btn btn-sm btn-danger"
                          title="Delete Asset"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="table-footer">
        <div className="table-info">
          Showing {assets.length} assets
          {selectedAssets.length > 0 && ` (${selectedAssets.length} selected)`}
        </div>
      </div>
    </div>
  );
};

export default AssetTable;