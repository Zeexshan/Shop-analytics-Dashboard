// Enhanced device-bound license verification system
// Professional license protection by zeeexshan

const licenseOwner = atob('emVleHNoYW4tbGljZW5zZQ=='); // decodes to "zeeexshan-license"

// Storage keys with multiple encoding for security
const storageKey = String.fromCharCode(0x6c, 0x69, 0x63, 0x65, 0x6e, 0x73, 0x65); // "license"
const deviceKey = String.fromCharCode(0x64, 0x65, 0x76, 0x69, 0x63, 0x65); // "device"
const tokenKey = String.fromCharCode(0x74, 0x6f, 0x6b, 0x65, 0x6e); // "token"

export interface LicenseData {
  isValid: boolean;
  licensee: string | null;
  purchaseDate: string | null;
  expiresAt: string | null;
  verified: boolean;
  deviceBound: boolean;
  deviceId?: string;
  deviceName?: string;
  token?: string;
  lastHeartbeat?: string;
}

export class LicenseManager {
  private static instance: LicenseManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly OFFLINE_GRACE_PERIOD = 72 * 60 * 60 * 1000; // 72 hours in milliseconds
  private readonly HEARTBEAT_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  static getInstance(): LicenseManager {
    if (!this.instance) {
      this.instance = new LicenseManager();
    }
    return this.instance;
  }

  // Generate device fingerprint (simplified for web)
  private async generateDeviceId(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const canvasFingerprint = canvas.toDataURL();
    const screenFingerprint = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timezoneFingerprint = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const languageFingerprint = navigator.language;
    const userAgentHash = await this.simpleHash(navigator.userAgent);
    
    const composite = `${canvasFingerprint}-${screenFingerprint}-${timezoneFingerprint}-${languageFingerprint}-${userAgentHash}`;
    return await this.simpleHash(composite);
  }

  // Simple hash function for device ID
  private async simpleHash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = window.location.origin + 'device_fingerprint_salt_2024';
    const data = encoder.encode(str + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }

  // Get human-readable device name
  private getDeviceName(): string {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    
    let deviceType = 'Unknown Device';
    if (userAgent.includes('Windows')) deviceType = 'Windows PC';
    else if (userAgent.includes('Mac')) deviceType = 'Mac';
    else if (userAgent.includes('Linux')) deviceType = 'Linux PC';
    else if (userAgent.includes('Mobile')) deviceType = 'Mobile Device';
    
    return `${deviceType} (${platform})`;
  }

  // Activate license with device binding
  async activateLicense(licenseKey: string): Promise<LicenseData> {
    try {
      console.log('Activating device-bound license...');
      
      const deviceId = await this.generateDeviceId();
      const deviceName = this.getDeviceName();
      
      const response = await fetch('/api/license/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          device_id: deviceId,
          device_name: deviceName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `License activation failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const licenseData: LicenseData = {
          isValid: true,
          licensee: data.purchase?.email || 'Licensed User',
          purchaseDate: data.purchase?.created_at || new Date().toISOString(),
          expiresAt: null, // Lifetime license
          verified: true,
          deviceBound: true,
          deviceId: deviceId,
          deviceName: deviceName,
          token: data.token,
          lastHeartbeat: new Date().toISOString()
        };
        
        // Store license locally for offline use
        await this.storeLicense(licenseKey, licenseData);
        
        // Start heartbeat
        this.startHeartbeat(licenseKey, deviceId);
        
        return licenseData;
      } else {
        throw new Error(data.message || 'License activation failed');
      }
    } catch (error) {
      console.error('License activation error:', error);
      
      // Check if we have a valid offline license
      const offlineLicense = await this.getStoredLicense(licenseKey);
      if (offlineLicense.isValid && this.isWithinGracePeriod(offlineLicense)) {
        console.log('Using offline license within grace period');
        return offlineLicense;
      }
      
      throw error;
    }
  }

  // Send heartbeat to maintain license validity
  private async sendHeartbeat(licenseKey: string, deviceId: string): Promise<void> {
    try {
      const response = await fetch('/api/license/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: licenseKey,
          device_id: deviceId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          // Update stored token
          const stored = localStorage.getItem(`${storageKey}_data`);
          if (stored) {
            const licenseData = JSON.parse(this.decodeString(stored));
            licenseData.token = data.token;
            licenseData.lastHeartbeat = new Date().toISOString();
            
            localStorage.setItem(`${storageKey}_data`, this.encodeString(JSON.stringify(licenseData)));
            console.log('License heartbeat successful, token refreshed');
          }
        }
      } else {
        console.warn('Heartbeat failed, license may become invalid');
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }

  // Start automatic heartbeat
  private startHeartbeat(licenseKey: string, deviceId: string): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat(licenseKey, deviceId);
    }, this.HEARTBEAT_INTERVAL);
    
    console.log('Heartbeat started for device-bound license');
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Heartbeat stopped');
    }
  }

  // Check if license is within offline grace period
  private isWithinGracePeriod(licenseData: LicenseData): boolean {
    if (!licenseData.lastHeartbeat) return false;
    
    const lastHeartbeat = new Date(licenseData.lastHeartbeat).getTime();
    const now = Date.now();
    
    return (now - lastHeartbeat) <= this.OFFLINE_GRACE_PERIOD;
  }

  // Verify license (checks device binding and validity)
  async verifyLicense(licenseKey: string): Promise<LicenseData> {
    try {
      const deviceId = await this.generateDeviceId();
      
      // First check if we have a stored license for this device
      const storedLicense = await this.getStoredLicense(licenseKey);
      if (storedLicense.isValid && storedLicense.deviceId === deviceId) {
        // Check if within grace period or try heartbeat
        if (this.isWithinGracePeriod(storedLicense)) {
          // Try to send heartbeat to refresh token
          this.sendHeartbeat(licenseKey, deviceId);
          return storedLicense;
        } else {
          console.log('License expired offline grace period, need re-activation');
        }
      }
      
      // If no valid stored license, try to activate
      return await this.activateLicense(licenseKey);
      
    } catch (error) {
      console.error('License verification error:', error);
      
      // Return invalid license data
      return {
        isValid: false,
        licensee: null,
        purchaseDate: null,
        expiresAt: null,
        verified: false,
        deviceBound: false
      };
    }
  }

  // Store license data securely
  private async storeLicense(licenseKey: string, licenseData: LicenseData): Promise<void> {
    try {
      const encryptedData = {
        key: this.encodeString(licenseKey),
        data: this.encodeString(JSON.stringify(licenseData)),
        timestamp: Date.now(),
        owner: licenseOwner,
        deviceBound: true
      };
      
      localStorage.setItem(`${storageKey}_data`, this.encodeString(JSON.stringify(encryptedData)));
      localStorage.setItem(`${storageKey}_verified`, 'true');
      localStorage.setItem(`${deviceKey}_id`, this.encodeString(licenseData.deviceId || ''));
      
      if (licenseData.token) {
        localStorage.setItem(`${tokenKey}_jwt`, this.encodeString(licenseData.token));
      }
      
      console.log('Device-bound license stored locally');
    } catch (error) {
      console.error('Failed to store license:', error);
    }
  }

  // Get stored license data
  private async getStoredLicense(licenseKey: string): Promise<LicenseData> {
    try {
      const stored = localStorage.getItem(`${storageKey}_data`);
      const verified = localStorage.getItem(`${storageKey}_verified`);
      
      if (!stored || verified !== 'true') {
        return this.getInvalidLicenseData();
      }

      const encryptedData = JSON.parse(this.decodeString(stored));
      const storedKey = this.decodeString(encryptedData.key);
      
      if (storedKey === licenseKey && encryptedData.deviceBound) {
        const licenseData = JSON.parse(this.decodeString(encryptedData.data));
        console.log('Retrieved stored device-bound license');
        return licenseData;
      }
      
      return this.getInvalidLicenseData();
    } catch (error) {
      console.error('Failed to retrieve stored license:', error);
      return this.getInvalidLicenseData();
    }
  }

  // Get invalid license data template
  private getInvalidLicenseData(): LicenseData {
    return {
      isValid: false,
      licensee: null,
      purchaseDate: null,
      expiresAt: null,
      verified: false,
      deviceBound: false
    };
  }

  // Check if license is currently active
  async isLicenseActive(): Promise<boolean> {
    try {
      const verified = localStorage.getItem(`${storageKey}_verified`);
      const storedDeviceId = localStorage.getItem(`${deviceKey}_id`);
      
      if (verified !== 'true' || !storedDeviceId) {
        return false;
      }
      
      const currentDeviceId = await this.generateDeviceId();
      const deviceMatch = this.decodeString(storedDeviceId) === currentDeviceId;
      
      if (!deviceMatch) {
        console.warn('Device ID mismatch - license bound to different device');
        this.clearLicense();
        return false;
      }
      
      // Check if within grace period
      const stored = localStorage.getItem(`${storageKey}_data`);
      if (stored) {
        const encryptedData = JSON.parse(this.decodeString(stored));
        const licenseData = JSON.parse(this.decodeString(encryptedData.data));
        
        if (this.isWithinGracePeriod(licenseData)) {
          return true;
        } else {
          console.log('License outside grace period - re-activation required');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking license status:', error);
      return false;
    }
  }

  // Deactivate current device
  async deactivateDevice(licenseKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const deviceId = await this.generateDeviceId();
      
      const response = await fetch('/api/license/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: licenseKey,
          device_id: deviceId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.clearLicense();
        this.stopHeartbeat();
      }
      
      return data;
    } catch (error) {
      console.error('Deactivation error:', error);
      return { success: false, message: 'Deactivation failed' };
    }
  }

  // Clear all license data
  clearLicense(): void {
    localStorage.removeItem(`${storageKey}_data`);
    localStorage.removeItem(`${storageKey}_verified`);
    localStorage.removeItem(`${deviceKey}_id`);
    localStorage.removeItem(`${tokenKey}_jwt`);
    this.stopHeartbeat();
    console.log('Device-bound license cleared');
  }

  // Get stored JWT token
  getStoredToken(): string | null {
    try {
      const token = localStorage.getItem(`${tokenKey}_jwt`);
      return token ? this.decodeString(token) : null;
    } catch (error) {
      return null;
    }
  }

  // Simple encoding for storage (obfuscation)
  private encodeString(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  private decodeString(str: string): string {
    return decodeURIComponent(escape(atob(str)));
  }
}

export const licenseManager = LicenseManager.getInstance();