// Simple JavaScript-only license storage - no native dependencies
// This replaces better-sqlite3 to eliminate Windows compilation issues

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface LicenseData {
  id: string;
  licenseKey: string;
  deviceId: string;
  activatedAt: string;
  lastHeartbeat: string;
  isActive: boolean;
  uses: number;
  metadata?: string;
}

interface StorageFile {
  licenses: LicenseData[];
  version: string;
  createdAt: string;
}

export class SimpleLicenseStorage {
  private dataFile: string;
  private data: StorageFile = {
    licenses: [],
    version: '1.0.0',
    createdAt: new Date().toISOString()
  };

  constructor() {
    // Store in app data directory
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.dataFile = path.join(dataDir, 'licenses.json');
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        const fileContent = fs.readFileSync(this.dataFile, 'utf8');
        this.data = JSON.parse(fileContent);
      } else {
        this.data = {
          licenses: [],
          version: '1.0.0',
          createdAt: new Date().toISOString()
        };
        this.saveData();
      }
    } catch (error) {
      console.error('Error loading license data:', error);
      this.data = {
        licenses: [],
        version: '1.0.0',
        createdAt: new Date().toISOString()
      };
    }
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving license data:', error);
      throw error;
    }
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public activateLicense(licenseKey: string, deviceId: string, metadata?: string): LicenseData {
    // Check if license already exists for this device
    const existing = this.data.licenses.find(l => 
      l.licenseKey === licenseKey && l.deviceId === deviceId
    );

    if (existing) {
      // Update existing activation
      existing.lastHeartbeat = new Date().toISOString();
      existing.isActive = true;
      this.saveData();
      return existing;
    }

    // Create new activation
    const license: LicenseData = {
      id: this.generateId(),
      licenseKey,
      deviceId,
      activatedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      isActive: true,
      uses: 1,
      metadata
    };

    this.data.licenses.push(license);
    this.saveData();
    return license;
  }

  public findByLicenseAndDevice(licenseKey: string, deviceId: string): LicenseData | null {
    const license = this.data.licenses.find(l => 
      l.licenseKey === licenseKey && l.deviceId === deviceId
    );
    return license || null;
  }

  public updateHeartbeat(licenseKey: string, deviceId: string): boolean {
    const license = this.findByLicenseAndDevice(licenseKey, deviceId);
    if (license) {
      license.lastHeartbeat = new Date().toISOString();
      license.isActive = true;
      this.saveData();
      return true;
    }
    return false;
  }

  public deactivateLicense(licenseKey: string, deviceId: string): boolean {
    const license = this.findByLicenseAndDevice(licenseKey, deviceId);
    if (license) {
      license.isActive = false;
      this.saveData();
      return true;
    }
    return false;
  }

  public getActiveLicenses(): LicenseData[] {
    return this.data.licenses.filter(l => l.isActive);
  }

  public getLicenseDevices(licenseKey: string): LicenseData[] {
    return this.data.licenses.filter(l => l.licenseKey === licenseKey);
  }

  public isLicenseValid(licenseKey: string, deviceId: string): boolean {
    const license = this.findByLicenseAndDevice(licenseKey, deviceId);
    if (!license || !license.isActive) {
      return false;
    }

    // Check if heartbeat is within 72 hours (offline grace period)
    const lastHeartbeat = new Date(license.lastHeartbeat);
    const now = new Date();
    const hoursSinceHeartbeat = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceHeartbeat <= 72; // 72-hour grace period
  }

  public cleanup(): void {
    // Remove licenses older than 30 days and inactive
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.data.licenses = this.data.licenses.filter(license => {
      if (!license.isActive) {
        const lastActivity = new Date(license.lastHeartbeat);
        return lastActivity > thirtyDaysAgo;
      }
      return true;
    });

    this.saveData();
  }

  // Compatibility methods for existing routes.ts usage
  public storeLicense(licenseKey: string, deviceId: string, metadata?: string): LicenseData {
    return this.activateLicense(licenseKey, deviceId, metadata);
  }

  public activateDevice(licenseKey: string, deviceId: string, metadata?: string): { success: boolean; message: string; activation?: { id: string; activated_at: string } } {
    try {
      const license = this.activateLicense(licenseKey, deviceId, metadata);
      return {
        success: true,
        message: 'Device activated successfully',
        activation: {
          id: license.id,
          activated_at: license.activatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to activate device'
      };
    }
  }

  public verifyDeviceActivation(licenseKey: string, deviceId: string): { isValid: boolean; activation?: { id: string; last_seen_at: string } } {
    const isValid = this.isLicenseValid(licenseKey, deviceId);
    const license = this.findByLicenseAndDevice(licenseKey, deviceId);
    
    if (isValid && license) {
      return {
        isValid: true,
        activation: {
          id: license.id,
          last_seen_at: license.lastHeartbeat
        }
      };
    }
    
    return { isValid: false };
  }

  public deactivateDevice(licenseKey: string, deviceId: string): boolean {
    return this.deactivateLicense(licenseKey, deviceId);
  }

  public getActiveDevices(licenseKey?: string): Array<{ licenseKey: string; deviceId: string; activatedAt: string; lastHeartbeat: string; activated_at: string; last_seen_at: string; device_name: string }> {
    const licenses = licenseKey 
      ? this.getActiveLicenses().filter(l => l.licenseKey === licenseKey)
      : this.getActiveLicenses();
      
    return licenses.map(license => ({
      licenseKey: license.licenseKey,
      deviceId: license.deviceId,
      activatedAt: license.activatedAt,
      lastHeartbeat: license.lastHeartbeat,
      activated_at: license.activatedAt, // compatibility alias
      last_seen_at: license.lastHeartbeat, // compatibility alias
      device_name: license.deviceId // use deviceId as device name
    }));
  }
}

// Export singleton instance
export const licenseStorage = new SimpleLicenseStorage();