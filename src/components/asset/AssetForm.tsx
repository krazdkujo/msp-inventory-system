import React, { useState, useEffect } from 'react';
import { Asset, AssetFormData, AssetValidationError } from '../../types/asset';

interface AssetFormProps {
  asset: Asset | null;
  clientId: string;
  mode: 'create' | 'edit';
  onSubmit: (formData: AssetFormData) => void;
  onCancel: () => void;
  loading: boolean;
}

const AssetForm: React.FC<AssetFormProps> = ({
  asset,
  clientId,
  mode,
  onSubmit,
  onCancel,
  loading
}) => {
  const [formData, setFormData] = useState<AssetFormData>({
    clientId,
    assetTag: '',
    assetType: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    status: 'Active',
    location: '',
    assignedTo: '',
    purchaseDate: '',
    warrantyExpiry: '',
    notes: '',
    customFields: {}
  });

  const [errors, setErrors] = useState<AssetValidationError[]>([]);

  // Asset types for dropdown
  const assetTypes = [
    'Desktop Computer',
    'Laptop',
    'Server',
    'Network Equipment',
    'Printer',
    'Monitor',
    'Mobile Device',
    'Software License',
    'Other'
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Disposed', label: 'Disposed' }
  ];

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && asset) {
      setFormData({
        clientId: asset.clientId,
        assetTag: asset.assetTag,
        assetType: asset.assetType,
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        status: asset.status,
        location: asset.location || '',
        assignedTo: asset.assignedTo || '',
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : '',
        notes: asset.notes || '',
        customFields: asset.customFields || {}
      });
    }
  }, [mode, asset]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear related errors
    setErrors(prev => prev.filter(error => error.field !== name));
  };

  const validateForm = (): boolean => {
    const newErrors: AssetValidationError[] = [];

    if (!formData.assetTag.trim()) {
      newErrors.push({ field: 'assetTag', message: 'Asset tag is required' });
    }

    if (!formData.assetType.trim()) {
      newErrors.push({ field: 'assetType', message: 'Asset type is required' });
    }

    if (!formData.status) {
      newErrors.push({ field: 'status', message: 'Status is required' });
    }

    // Validate date formats
    if (formData.purchaseDate && isNaN(Date.parse(formData.purchaseDate))) {
      newErrors.push({ field: 'purchaseDate', message: 'Invalid purchase date' });
    }

    if (formData.warrantyExpiry && isNaN(Date.parse(formData.warrantyExpiry))) {
      newErrors.push({ field: 'warrantyExpiry', message: 'Invalid warranty expiry date' });
    }

    // Validate warranty expiry is after purchase date
    if (formData.purchaseDate && formData.warrantyExpiry) {
      const purchaseDate = new Date(formData.purchaseDate);
      const warrantyDate = new Date(formData.warrantyExpiry);
      if (warrantyDate < purchaseDate) {
        newErrors.push({ field: 'warrantyExpiry', message: 'Warranty expiry must be after purchase date' });
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const getFieldError = (fieldName: string): string | undefined => {
    const error = errors.find(e => e.field === fieldName);
    return error?.message;
  };

  const hasFieldError = (fieldName: string): boolean => {
    return errors.some(e => e.field === fieldName);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content asset-form-modal">
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Add New Asset' : 'Edit Asset'}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="modal-close"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="asset-form">
          <div className="form-grid">
            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>
              
              <div className="form-group">
                <label htmlFor="assetTag" className="form-label required">
                  Asset Tag
                </label>
                <input
                  type="text"
                  id="assetTag"
                  name="assetTag"
                  value={formData.assetTag}
                  onChange={handleInputChange}
                  className={`form-input ${hasFieldError('assetTag') ? 'error' : ''}`}
                  placeholder="e.g., LT-001, PC-045"
                  disabled={loading}
                  required
                />
                {getFieldError('assetTag') && (
                  <div className="field-error">{getFieldError('assetTag')}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="assetType" className="form-label required">
                  Asset Type
                </label>
                <select
                  id="assetType"
                  name="assetType"
                  value={formData.assetType}
                  onChange={handleInputChange}
                  className={`form-select ${hasFieldError('assetType') ? 'error' : ''}`}
                  disabled={loading}
                  required
                >
                  <option value="">Select Asset Type</option>
                  {assetTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {getFieldError('assetType') && (
                  <div className="field-error">{getFieldError('assetType')}</div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="manufacturer" className="form-label">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="e.g., Dell, HP, Cisco"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="model" className="form-label">
                    Model
                  </label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="e.g., OptiPlex 7090, EliteBook 840"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="serialNumber" className="form-label">
                  Serial Number
                </label>
                <input
                  type="text"
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Device serial number"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Status and Location */}
            <div className="form-section">
              <h3>Status & Location</h3>
              
              <div className="form-group">
                <label htmlFor="status" className="form-label required">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={`form-select ${hasFieldError('status') ? 'error' : ''}`}
                  disabled={loading}
                  required
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {getFieldError('status') && (
                  <div className="field-error">{getFieldError('status')}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="location" className="form-label">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., Office 205, Server Room, Remote"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="assignedTo" className="form-label">
                  Assigned To
                </label>
                <input
                  type="text"
                  id="assignedTo"
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="User or department name"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="form-section">
              <h3>Dates</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="purchaseDate" className="form-label">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    id="purchaseDate"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleInputChange}
                    className={`form-input ${hasFieldError('purchaseDate') ? 'error' : ''}`}
                    disabled={loading}
                  />
                  {getFieldError('purchaseDate') && (
                    <div className="field-error">{getFieldError('purchaseDate')}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="warrantyExpiry" className="form-label">
                    Warranty Expiry
                  </label>
                  <input
                    type="date"
                    id="warrantyExpiry"
                    name="warrantyExpiry"
                    value={formData.warrantyExpiry}
                    onChange={handleInputChange}
                    className={`form-input ${hasFieldError('warrantyExpiry') ? 'error' : ''}`}
                    disabled={loading}
                  />
                  {getFieldError('warrantyExpiry') && (
                    <div className="field-error">{getFieldError('warrantyExpiry')}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="form-section full-width">
              <h3>Additional Information</h3>
              
              <div className="form-group">
                <label htmlFor="notes" className="form-label">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Additional notes or comments about this asset..."
                  rows={4}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Create Asset' : 'Update Asset'}
            </button>
          </div>

          {/* Form Errors */}
          {errors.length > 0 && (
            <div className="form-errors">
              <h4>Please fix the following errors:</h4>
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AssetForm;