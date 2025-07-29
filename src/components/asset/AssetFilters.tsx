import React, { useState } from 'react';
import { AssetSearchFilters, AssetStats } from '../../types/asset';

interface AssetFiltersProps {
  filters: AssetSearchFilters;
  onFiltersChange: (filters: AssetSearchFilters) => void;
  stats: AssetStats;
}

const AssetFilters: React.FC<AssetFiltersProps> = ({
  filters,
  onFiltersChange,
  stats
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState<AssetSearchFilters>(filters);

  const assetTypes = Object.keys(stats.byType);
  const locations = Object.keys(stats.byLocation);
  const statusOptions = ['Active', 'Inactive', 'Maintenance', 'Disposed'];

  const handleFilterChange = (key: keyof AssetSearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleFilterChange('searchTerm', value || undefined);
  };

  const clearFilters = () => {
    const clearedFilters: AssetSearchFilters = {
      clientId: filters.clientId // Keep client ID
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = () => {
    return Object.keys(localFilters).some(key => {
      if (key === 'clientId') return false; // Don't count clientId as an active filter
      return localFilters[key as keyof AssetSearchFilters] !== undefined;
    });
  };

  return (
    <div className="asset-filters">
      <div className="filters-header">
        <div className="search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search assets by tag, manufacturer, model, or serial number..."
              value={localFilters.searchTerm || ''}
              onChange={handleSearchChange}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="filter-controls">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn btn-outline ${showAdvanced ? 'active' : ''}`}
          >
            Advanced Filters {showAdvanced ? '▲' : '▼'}
          </button>
          
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="btn btn-text"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filter-grid">
            {/* Asset Type Filter */}
            <div className="filter-group">
              <label className="filter-label">Asset Type</label>
              <select
                value={localFilters.assetType || ''}
                onChange={(e) => handleFilterChange('assetType', e.target.value || undefined)}
                className="filter-select"
              >
                <option value="">All Types</option>
                {assetTypes.map(type => (
                  <option key={type} value={type}>
                    {type} ({stats.byType[type]})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="filter-group">
              <label className="filter-label">Status</label>
              <select
                value={localFilters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="filter-select"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => {
                  const count = (stats as any)[status.toLowerCase()] || 0;
                  return (
                    <option key={status} value={status}>
                      {status} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Location Filter */}
            <div className="filter-group">
              <label className="filter-label">Location</label>
              <select
                value={localFilters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                className="filter-select"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>
                    {location} ({stats.byLocation[location]})
                  </option>
                ))}
              </select>
            </div>

            {/* Manufacturer Filter */}
            <div className="filter-group">
              <label className="filter-label">Manufacturer</label>
              <input
                type="text"
                placeholder="Filter by manufacturer"
                value={localFilters.manufacturer || ''}
                onChange={(e) => handleFilterChange('manufacturer', e.target.value || undefined)}
                className="filter-input"
              />
            </div>

            {/* Assigned To Filter */}
            <div className="filter-group">
              <label className="filter-label">Assigned To</label>
              <input
                type="text"
                placeholder="Filter by assignee"
                value={localFilters.assignedTo || ''}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value || undefined)}
                className="filter-input"
              />
            </div>

            {/* Date Range Filter */}
            <div className="filter-group date-range">
              <label className="filter-label">Date Range</label>
              <div className="date-inputs">
                <input
                  type="date"
                  placeholder="Start date"
                  value={localFilters.dateRange?.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    const startDate = e.target.value ? new Date(e.target.value) : undefined;
                    handleFilterChange('dateRange', {
                      start: startDate,
                      end: localFilters.dateRange?.end
                    });
                  }}
                  className="filter-input date-input"
                />
                <span className="date-separator">to</span>
                <input
                  type="date"
                  placeholder="End date"
                  value={localFilters.dateRange?.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    const endDate = e.target.value ? new Date(e.target.value) : undefined;
                    handleFilterChange('dateRange', {
                      start: localFilters.dateRange?.start,
                      end: endDate
                    });
                  }}
                  className="filter-input date-input"
                />
              </div>
            </div>
          </div>

          <div className="filter-summary">
            <div className="active-filters">
              {hasActiveFilters() && (
                <div className="filter-tags">
                  {localFilters.searchTerm && (
                    <span className="filter-tag">
                      Search: "{localFilters.searchTerm}"
                      <button onClick={() => handleFilterChange('searchTerm', undefined)}>×</button>
                    </span>
                  )}
                  {localFilters.assetType && (
                    <span className="filter-tag">
                      Type: {localFilters.assetType}
                      <button onClick={() => handleFilterChange('assetType', undefined)}>×</button>
                    </span>
                  )}
                  {localFilters.status && (
                    <span className="filter-tag">
                      Status: {localFilters.status}
                      <button onClick={() => handleFilterChange('status', undefined)}>×</button>
                    </span>
                  )}
                  {localFilters.location && (
                    <span className="filter-tag">
                      Location: {localFilters.location}
                      <button onClick={() => handleFilterChange('location', undefined)}>×</button>
                    </span>
                  )}
                  {localFilters.manufacturer && (
                    <span className="filter-tag">
                      Manufacturer: {localFilters.manufacturer}
                      <button onClick={() => handleFilterChange('manufacturer', undefined)}>×</button>
                    </span>
                  )}
                  {localFilters.assignedTo && (
                    <span className="filter-tag">
                      Assigned: {localFilters.assignedTo}
                      <button onClick={() => handleFilterChange('assignedTo', undefined)}>×</button>
                    </span>
                  )}
                  {localFilters.dateRange && (localFilters.dateRange.start || localFilters.dateRange.end) && (
                    <span className="filter-tag">
                      Date Range
                      <button onClick={() => handleFilterChange('dateRange', undefined)}>×</button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .asset-filters {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          margin-bottom: 20px;
          overflow: hidden;
        }

        .filters-header {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #e1e5e9;
        }

        .search-section {
          flex: 1;
        }

        .search-input-wrapper {
          position: relative;
          max-width: 400px;
        }

        .search-input {
          width: 100%;
          padding: 10px 40px 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .search-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
        }

        .filter-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .advanced-filters {
          padding: 20px;
          background: white;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group.date-range {
          grid-column: span 2;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 600;
          color: #495057;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-select,
        .filter-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .date-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .date-input {
          flex: 1;
        }

        .date-separator {
          font-size: 12px;
          color: #6c757d;
        }

        .filter-summary {
          border-top: 1px solid #e1e5e9;
          padding-top: 16px;
        }

        .filter-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
        }

        .filter-tag button {
          background: none;
          border: none;
          color: #1976d2;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 0;
          margin-left: 2px;
        }

        .filter-tag button:hover {
          color: #0d47a1;
        }
      `}</style>
    </div>
  );
};

export default AssetFilters;