import { EventEmitter } from 'events';

export interface BarcodeDevice {
  id: string;
  name: string;
  type: 'usb' | 'serial' | 'keyboard';
  connected: boolean;
  vendorId?: string;
  productId?: string;
  serialNumber?: string;
}

export interface BarcodeResult {
  code: string;
  type: 'qr' | 'code128' | 'code39' | 'ean13' | 'unknown';
  timestamp: Date;
  deviceId?: string;
}

class BarcodeService extends EventEmitter {
  private devices: Map<string, BarcodeDevice> = new Map();
  private activeDevices: Map<string, any> = new Map();
  private isElectron = typeof window !== 'undefined' && window.electronAPI;
  private keyboardBuffer = '';
  private keyboardTimeout: NodeJS.Timeout | null = null;
  private isKeyboardListening = false;

  constructor() {
    super();
    this.setupKeyboardWedgeListener();
  }

  // Get list of available barcode scanner devices
  async getAvailableDevices(): Promise<BarcodeDevice[]> {
    if (this.isElectron && window.electronAPI?.barcode) {
      try {
        const devices = await window.electronAPI.barcode.getDevices();
        devices.forEach((device: BarcodeDevice) => {
          this.devices.set(device.id, device);
        });
        return devices;
      } catch (error: any) {
        console.error('Failed to get barcode devices:', error);
        return [];
      }
    }

    // For web environments, return keyboard wedge as available option
    const keyboardDevice: BarcodeDevice = {
      id: 'keyboard-wedge',
      name: 'Keyboard Wedge Scanner',
      type: 'keyboard',
      connected: true
    };
    
    this.devices.set(keyboardDevice.id, keyboardDevice);
    return [keyboardDevice];
  }

  // Connect to a barcode scanner device
  async connectDevice(deviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      if (device.type === 'keyboard') {
        this.startKeyboardWedgeListening();
        device.connected = true;
        this.emit('deviceConnected', device);
        return { success: true };
      }

      if (this.isElectron && window.electronAPI?.barcode) {
        const result = await window.electronAPI.barcode.connect(deviceId);
        if (result.success) {
          device.connected = true;
          this.activeDevices.set(deviceId, result.connection);
          this.emit('deviceConnected', device);
          
          // Listen for scans from this device
          this.setupDeviceListener(deviceId);
        }
        return result;
      }

      return { success: false, error: 'Barcode scanning not supported in this environment' };
    } catch (error: any) {
      console.error('Failed to connect to barcode device:', error);
      return { success: false, error: error.message || 'Connection failed' };
    }
  }

  // Disconnect from a barcode scanner device
  async disconnectDevice(deviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }

      if (device.type === 'keyboard') {
        this.stopKeyboardWedgeListening();
        device.connected = false;
        this.emit('deviceDisconnected', device);
        return { success: true };
      }

      if (this.isElectron && window.electronAPI?.barcode) {
        const result = await window.electronAPI.barcode.disconnect(deviceId);
        if (result.success) {
          device.connected = false;
          this.activeDevices.delete(deviceId);
          this.emit('deviceDisconnected', device);
        }
        return result;
      }

      return { success: false, error: 'Barcode scanning not supported in this environment' };
    } catch (error: any) {
      console.error('Failed to disconnect barcode device:', error);
      return { success: false, error: error.message || 'Disconnection failed' };
    }
  }

  // Start listening for barcode scans
  startScanning(): void {
    this.emit('scanningStarted');
    
    // If using keyboard wedge, ensure it's listening
    if (this.devices.has('keyboard-wedge')) {
      this.startKeyboardWedgeListening();
    }
  }

  // Stop listening for barcode scans
  stopScanning(): void {
    this.emit('scanningStopped');
    this.stopKeyboardWedgeListening();
  }

  // Simulate a barcode scan (for testing)
  simulateScan(code: string, type: BarcodeResult['type'] = 'unknown'): void {
    const result: BarcodeResult = {
      code,
      type,
      timestamp: new Date(),
      deviceId: 'simulator'
    };
    
    this.emit('scan', result);
  }

  // Get connected devices
  getConnectedDevices(): BarcodeDevice[] {
    return Array.from(this.devices.values()).filter(device => device.connected);
  }

  // Private methods
  private setupDeviceListener(deviceId: string): void {
    if (!this.isElectron || !window.electronAPI?.barcode) return;

    // Listen for scan events from the main process
    window.electronAPI.on(`barcode-scan-${deviceId}`, (result: BarcodeResult) => {
      result.deviceId = deviceId;
      this.emit('scan', result);
    });
  }

  private setupKeyboardWedgeListener(): void {
    if (typeof window === 'undefined') return;

    // Listen for keydown events to capture keyboard wedge input
    document.addEventListener('keydown', this.handleKeyboardInput.bind(this));
  }

  private handleKeyboardInput(event: KeyboardEvent): void {
    if (!this.isKeyboardListening) return;

    // Prevent default behavior for barcode scanner input
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    // Handle Enter key (typically ends barcode scan)
    if (event.key === 'Enter') {
      if (this.keyboardBuffer.length > 0) {
        const result: BarcodeResult = {
          code: this.keyboardBuffer,
          type: this.detectBarcodeType(this.keyboardBuffer),
          timestamp: new Date(),
          deviceId: 'keyboard-wedge'
        };
        
        this.emit('scan', result);
        this.keyboardBuffer = '';
      }
      event.preventDefault();
      return;
    }

    // Handle regular characters
    if (event.key.length === 1) {
      this.keyboardBuffer += event.key;
      
      // Reset buffer after timeout (in case scan is interrupted)
      if (this.keyboardTimeout) {
        clearTimeout(this.keyboardTimeout);
      }
      
      this.keyboardTimeout = setTimeout(() => {
        this.keyboardBuffer = '';
      }, 1000); // 1 second timeout
      
      // Prevent character from appearing in focused input
      if (document.activeElement?.tagName !== 'INPUT' && 
          document.activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault();
      }
    }
  }

  private startKeyboardWedgeListening(): void {
    this.isKeyboardListening = true;
  }

  private stopKeyboardWedgeListening(): void {
    this.isKeyboardListening = false;
    this.keyboardBuffer = '';
    if (this.keyboardTimeout) {
      clearTimeout(this.keyboardTimeout);
      this.keyboardTimeout = null;
    }
  }

  private detectBarcodeType(code: string): BarcodeResult['type'] {
    // Simple barcode type detection based on format
    if (code.match(/^[0-9]{13}$/)) {
      return 'ean13';
    } else if (code.match(/^[A-Z0-9\-\.\$\/\+% ]*$/)) {
      return 'code39';
    } else if (code.match(/^[\x00-\x7F]*$/)) {
      return 'code128';
    } else {
      return 'unknown';
    }
  }

  // Clean up resources
  destroy(): void {
    this.stopScanning();
    this.removeAllListeners();
    
    // Disconnect all devices
    this.activeDevices.forEach(async (connection, deviceId) => {
      await this.disconnectDevice(deviceId);
    });
    
    this.devices.clear();
    this.activeDevices.clear();
  }
}

// Export singleton instance
export const barcodeService = new BarcodeService();
export default BarcodeService;