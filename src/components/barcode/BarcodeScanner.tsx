import React, { useState, useEffect } from 'react';
import { barcodeService, BarcodeDevice, BarcodeResult } from '../../services/BarcodeService';

interface BarcodeScannerProps {
  onScan: (result: BarcodeResult) => void;
  onClose: () => void;
  autoStart?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onClose,
  autoStart = true
}) => {
  const [devices, setDevices] = useState<BarcodeDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<BarcodeResult | null>(null);
  const [scanHistory, setScanHistory] = useState<BarcodeResult[]>([]);

  useEffect(() => {
    loadDevices();
    setupEventListeners();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (autoStart && devices.length > 0 && !selectedDevice) {
      const keyboardDevice = devices.find(d => d.type === 'keyboard');
      if (keyboardDevice) {
        connectToDevice(keyboardDevice.id);
      }
    }
  }, [devices, autoStart]);

  const loadDevices = async () => {
    try {
      const availableDevices = await barcodeService.getAvailableDevices();
      setDevices(availableDevices);
    } catch (error: any) {
      setError('Failed to load barcode scanner devices');
      console.error('Error loading devices:', error);
    }
  };

  const setupEventListeners = () => {
    barcodeService.on('scan', handleScan);
    barcodeService.on('deviceConnected', handleDeviceConnected);
    barcodeService.on('deviceDisconnected', handleDeviceDisconnected);
    barcodeService.on('scanningStarted', () => setIsScanning(true));
    barcodeService.on('scanningStopped', () => setIsScanning(false));
  };

  const cleanup = () => {
    barcodeService.removeAllListeners();
    if (isScanning) {
      barcodeService.stopScanning();
    }
  };

  const connectToDevice = async (deviceId: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const result = await barcodeService.connectDevice(deviceId);
      
      if (result.success) {
        setSelectedDevice(deviceId);
        if (autoStart) {
          startScanning();
        }
      } else {
        setError(result.error || 'Failed to connect to device');
      }
    } catch (error: any) {
      setError(error.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (!selectedDevice) return;

    try {
      await barcodeService.disconnectDevice(selectedDevice);
      setSelectedDevice(null);
      setIsScanning(false);
    } catch (error: any) {
      setError(error.message || 'Disconnection failed');
    }
  };

  const startScanning = () => {
    setError(null);
    barcodeService.startScanning();
  };

  const stopScanning = () => {
    barcodeService.stopScanning();
  };

  const handleScan = (result: BarcodeResult) => {
    setLastScan(result);
    setScanHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 scans
    onScan(result);
  };

  const handleDeviceConnected = (device: BarcodeDevice) => {
    setDevices(prev => prev.map(d => 
      d.id === device.id ? { ...d, connected: true } : d
    ));
  };

  const handleDeviceDisconnected = (device: BarcodeDevice) => {
    setDevices(prev => prev.map(d => 
      d.id === device.id ? { ...d, connected: false } : d
    ));
  };

  const testScan = () => {
    barcodeService.simulateScan('TEST-ASSET-001', 'code128');
  };

  const getDeviceIcon = (device: BarcodeDevice) => {
    switch (device.type) {
      case 'usb': return '🔌';
      case 'serial': return '📡';
      case 'keyboard': return '⌨️';
      default: return '📷';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString();
  };

  return (
    <div className="barcode-scanner-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Barcode Scanner</h2>
            <button onClick={onClose} className="modal-close">×</button>
          </div>

          <div className="scanner-content">
            {/* Device Selection */}
            <div className="device-section">
              <h3>Scanner Devices</h3>
              
              {devices.length === 0 ? (
                <div className="no-devices">
                  <p>No barcode scanner devices found.</p>
                  <button onClick={loadDevices} className="btn btn-secondary">
                    Refresh Devices
                  </button>
                </div>
              ) : (
                <div className="device-list">
                  {devices.map(device => (
                    <div 
                      key={device.id} 
                      className={`device-item ${selectedDevice === device.id ? 'selected' : ''}`}
                    >
                      <div className="device-info">
                        <span className="device-icon">{getDeviceIcon(device)}</span>
                        <span className="device-name">{device.name}</span>
                        <span className={`device-status ${device.connected ? 'connected' : 'disconnected'}`}>
                          {device.connected ? '🟢 Connected' : '🔴 Disconnected'}
                        </span>
                      </div>
                      
                      <div className="device-actions">
                        {selectedDevice === device.id ? (
                          <button 
                            onClick={disconnectDevice}
                            className="btn btn-sm btn-secondary"
                            disabled={isConnecting}
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button 
                            onClick={() => connectToDevice(device.id)}
                            className="btn btn-sm btn-primary"
                            disabled={isConnecting || device.connected}
                          >
                            {isConnecting ? 'Connecting...' : 'Connect'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scanning Controls */}
            {selectedDevice && (
              <div className="scanning-section">
                <h3>Scanning Controls</h3>
                
                <div className="scanning-status">
                  <div className={`status-indicator ${isScanning ? 'active' : 'inactive'}`}>
                    {isScanning ? '🟢 Scanning Active' : '🔴 Scanning Stopped'}
                  </div>
                  
                  <div className="scan-controls">
                    {isScanning ? (
                      <button onClick={stopScanning} className="btn btn-danger">
                        Stop Scanning
                      </button>
                    ) : (
                      <button onClick={startScanning} className="btn btn-success">
                        Start Scanning
                      </button>
                    )}
                    
                    <button onClick={testScan} className="btn btn-secondary">
                      Test Scan
                    </button>
                  </div>
                </div>

                {/* Last Scan Result */}
                {lastScan && (
                  <div className="last-scan">
                    <h4>Last Scan</h4>
                    <div className="scan-result">
                      <div className="scan-code">{lastScan.code}</div>
                      <div className="scan-details">
                        <span className="scan-type">{lastScan.type.toUpperCase()}</span>
                        <span className="scan-time">{formatTimestamp(lastScan.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan History */}
                {scanHistory.length > 0 && (
                  <div className="scan-history">
                    <h4>Recent Scans</h4>
                    <div className="history-list">
                      {scanHistory.map((scan, index) => (
                        <div key={index} className="history-item">
                          <span className="history-code">{scan.code}</span>
                          <span className="history-time">{formatTimestamp(scan.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="instructions">
              <h4>Instructions</h4>
              <ul>
                <li>Connect a barcode scanner device above</li>
                <li>Click "Start Scanning" to begin</li>
                <li>Scan a barcode to capture asset information</li>
                <li>For keyboard wedge scanners, ensure this window has focus</li>
              </ul>
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-message">
                {error}
                <button onClick={() => setError(null)}>×</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .barcode-scanner-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
        }

        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e1e5e9;
        }

        .modal-header h2 {
          margin: 0;
          color: #2c3e50;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6c757d;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scanner-content {
          padding: 20px;
        }

        .device-section,
        .scanning-section {
          margin-bottom: 30px;
        }

        .device-section h3,
        .scanning-section h3 {
          margin: 0 0 15px 0;
          color: #495057;
          font-size: 16px;
        }

        .no-devices {
          text-align: center;
          padding: 40px 20px;
          color: #6c757d;
        }

        .device-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .device-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .device-item.selected {
          border-color: #007bff;
          background-color: #f8f9ff;
        }

        .device-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .device-icon {
          font-size: 20px;
        }

        .device-name {
          font-weight: 500;
          color: #2c3e50;
        }

        .device-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .device-status.connected {
          background-color: #d4edda;
          color: #155724;
        }

        .device-status.disconnected {
          background-color: #f8d7da;
          color: #721c24;
        }

        .scanning-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .status-indicator {
          font-size: 14px;
          font-weight: 600;
        }

        .status-indicator.active {
          color: #28a745;
        }

        .status-indicator.inactive {
          color: #dc3545;
        }

        .scan-controls {
          display: flex;
          gap: 10px;
        }

        .last-scan {
          margin-bottom: 20px;
        }

        .last-scan h4 {
          margin: 0 0 10px 0;
          color: #495057;
          font-size: 14px;
        }

        .scan-result {
          padding: 15px;
          background: #e8f5e8;
          border: 1px solid #c3e6c3;
          border-radius: 8px;
        }

        .scan-code {
          font-family: monospace;
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 8px;
        }

        .scan-details {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: #6c757d;
        }

        .scan-type {
          background: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }

        .scan-history h4 {
          margin: 0 0 10px 0;
          color: #495057;
          font-size: 14px;
        }

        .history-list {
          max-height: 150px;
          overflow-y: auto;
          border: 1px solid #e1e5e9;
          border-radius: 6px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #f1f3f4;
          font-size: 13px;
        }

        .history-item:last-child {
          border-bottom: none;
        }

        .history-code {
          font-family: monospace;
          font-weight: 500;
          color: #2c3e50;
        }

        .history-time {
          color: #6c757d;
          font-size: 11px;
        }

        .instructions {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
        }

        .instructions h4 {
          margin: 0 0 10px 0;
          color: #856404;
          font-size: 14px;
        }

        .instructions ul {
          margin: 0;
          padding-left: 20px;
          color: #856404;
        }

        .instructions li {
          margin-bottom: 5px;
          font-size: 13px;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 10px 15px;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          margin-top: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-message button {
          background: none;
          border: none;
          color: #721c24;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;