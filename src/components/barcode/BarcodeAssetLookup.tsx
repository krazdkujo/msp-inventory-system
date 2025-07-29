import React, { useState } from 'react';
import { BarcodeResult } from '../../services/BarcodeService';
import BarcodeScanner from './BarcodeScanner';
import { assetService } from '../../services/AssetService';
import { Asset } from '../../types/asset';

interface BarcodeAssetLookupProps {
  clientId: string;
  onAssetFound: (asset: Asset) => void;
  onClose: () => void;
}

const BarcodeAssetLookup: React.FC<BarcodeAssetLookupProps> = ({
  clientId,
  onAssetFound,
  onClose
}) => {
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');

  const handleBarcodeScan = async (result: BarcodeResult) => {
    console.log('Barcode scanned:', result.code);
    setLastScannedCode(result.code);
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      // Search for assets by the scanned code
      // Check if it matches asset tag, serial number, or custom barcode field
      const searchFilters = {
        clientId,
        searchTerm: result.code
      };

      const assets = await assetService.searchAssets(searchFilters);
      
      // Convert search results to Asset format
      const mappedAssets: Asset[] = assets.map(asset => ({
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

      // Filter assets that match the barcode more precisely
      const exactMatches = mappedAssets.filter(asset => 
        asset.assetTag === result.code ||
        asset.serialNumber === result.code ||
        // Check custom fields for barcode matches
        Object.values(asset.customFields || {}).some(value => 
          String(value) === result.code
        )
      );

      if (exactMatches.length > 0) {
        setSearchResults(exactMatches);
      } else if (mappedAssets.length > 0) {
        // Show partial matches if no exact matches
        setSearchResults(mappedAssets);
      } else {
        setSearchError(`No assets found matching barcode: ${result.code}`);
      }
    } catch (error: any) {
      console.error('Error searching for asset:', error);
      setSearchError(`Search failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssetSelect = (asset: Asset) => {
    onAssetFound(asset);
  };

  const formatAssetInfo = (asset: Asset): string => {
    const parts = [asset.assetTag];
    if (asset.manufacturer) parts.push(asset.manufacturer);
    if (asset.model) parts.push(asset.model);
    return parts.join(' - ');
  };

  const getStatusColor = (status: Asset['status']): string => {
    switch (status) {
      case 'Active': return '#28a745';
      case 'Inactive': return '#6c757d';
      case 'Maintenance': return '#ffc107';
      case 'Disposed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="barcode-asset-lookup">
      <BarcodeScanner
        onScan={handleBarcodeScan}
        onClose={onClose}
        autoStart={true}
      />
      
      {/* Search Overlay */}
      {(isSearching || searchResults.length > 0 || searchError) && (
        <div className="search-overlay">
          <div className="search-panel">
            <div className="search-header">
              <h3>Asset Search Results</h3>
              {lastScannedCode && (
                <div className="scanned-code">
                  Scanned: <code>{lastScannedCode}</code>
                </div>
              )}
            </div>

            <div className="search-content">
              {isSearching && (
                <div className="search-loading">
                  <div className="loading-spinner"></div>
                  <p>Searching for assets...</p>
                </div>
              )}

              {searchError && (
                <div className="search-error">
                  <div className="error-icon">❌</div>
                  <p>{searchError}</p>
                  <button 
                    onClick={() => setSearchError(null)}
                    className="btn btn-sm btn-secondary"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="search-results">
                  <p className="results-count">
                    Found {searchResults.length} matching asset{searchResults.length !== 1 ? 's' : ''}:
                  </p>
                  
                  <div className="asset-list">
                    {searchResults.map((asset) => (
                      <div 
                        key={asset.id}
                        className="asset-card"
                        onClick={() => handleAssetSelect(asset)}
                      >
                        <div className="asset-header">
                          <div className="asset-tag">{asset.assetTag}</div>
                          <div 
                            className="asset-status"
                            style={{ backgroundColor: getStatusColor(asset.status) }}
                          >
                            {asset.status}
                          </div>
                        </div>
                        
                        <div className="asset-info">
                          <div className="asset-title">
                            {formatAssetInfo(asset)}
                          </div>
                          
                          {asset.serialNumber && (
                            <div className="asset-detail">
                              <span className="detail-label">S/N:</span>
                              <span className="detail-value">{asset.serialNumber}</span>
                            </div>
                          )}
                          
                          {asset.location && (
                            <div className="asset-detail">
                              <span className="detail-label">Location:</span>
                              <span className="detail-value">{asset.location}</span>
                            </div>
                          )}
                          
                          {asset.assignedTo && (
                            <div className="asset-detail">
                              <span className="detail-label">Assigned to:</span>
                              <span className="detail-value">{asset.assignedTo}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="asset-select-hint">
                          Click to select this asset
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .barcode-asset-lookup {
          position: relative;
        }

        .search-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
          padding: 20px;
        }

        .search-panel {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }

        .search-header {
          padding: 20px;
          border-bottom: 1px solid #e1e5e9;
          text-align: center;
        }

        .search-header h3 {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }

        .scanned-code {
          font-size: 14px;
          color: #6c757d;
        }

        .scanned-code code {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #495057;
        }

        .search-content {
          padding: 20px;
        }

        .search-loading {
          text-align: center;
          padding: 40px 20px;
          color: #6c757d;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .search-error {
          text-align: center;
          padding: 40px 20px;
          color: #721c24;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .search-results {
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .results-count {
          margin: 0 0 20px 0;
          color: #495057;
          font-weight: 500;
          text-align: center;
        }

        .asset-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .asset-card {
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .asset-card:hover {
          border-color: #007bff;
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
          transform: translateY(-2px);
        }

        .asset-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .asset-tag {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          font-family: monospace;
        }

        .asset-status {
          padding: 4px 8px;
          border-radius: 12px;
          color: white;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .asset-info {
          margin-bottom: 12px;
        }

        .asset-title {
          font-size: 16px;
          font-weight: 500;
          color: #495057;
          margin-bottom: 8px;
        }

        .asset-detail {
          display: flex;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 13px;
        }

        .detail-label {
          color: #6c757d;
          font-weight: 500;
          min-width: 80px;
        }

        .detail-value {
          color: #495057;
        }

        .asset-select-hint {
          text-align: center;
          font-size: 12px;
          color: #007bff;
          font-weight: 500;
          padding: 8px;
          background: #f8f9ff;
          border-radius: 4px;
          border: 1px solid #e3f2fd;
        }
      `}</style>
    </div>
  );
};

export default BarcodeAssetLookup;