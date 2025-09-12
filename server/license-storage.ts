// Enhanced license management system with device binding
// Professional license protection by zeeexshan

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const LICENSE_DB = path.join(DATA_DIR, 'licenses.db');

export interface LicenseRecord {
  id: string;
  license_key_hash: string;
  gumroad_purchase_id: string;
  email: string;
  max_devices: number;
  created_at: string;
}

export interface DeviceActivation {
  id: string;
  license_id: string;
  device_id_hash: string;
  device_name: string;
  activated_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

export class LicenseStorage {
  private db: Database.Database;

  constructor() {
    this.ensureDataDirectory();
    this.db = new Database(LICENSE_DB);
    this.initializeDatabase();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private initializeDatabase() {
    // Create licenses table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        license_key_hash TEXT UNIQUE NOT NULL,
        gumroad_purchase_id TEXT NOT NULL,
        email TEXT NOT NULL,
        max_devices INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      )
    `);

    // Create device activations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS device_activations (
        id TEXT PRIMARY KEY,
        license_id TEXT NOT NULL,
        device_id_hash TEXT NOT NULL,
        device_name TEXT NOT NULL,
        activated_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        revoked_at TEXT NULL,
        FOREIGN KEY (license_id) REFERENCES licenses (id),
        UNIQUE(license_id, device_id_hash)
      )
    `);

    // Create indices for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_licenses_hash ON licenses(license_key_hash);
      CREATE INDEX IF NOT EXISTS idx_activations_license ON device_activations(license_id);
      CREATE INDEX IF NOT EXISTS idx_activations_device ON device_activations(device_id_hash);
    `);
  }

  // Hash functions for security
  private hashLicenseKey(licenseKey: string): string {
    const salt = process.env.LICENSE_HASH_SALT;
    if (!salt) {
      throw new Error('LICENSE_HASH_SALT environment variable is required');
    }
    return createHash('sha256').update(licenseKey + salt).digest('hex');
  }

  private hashDeviceId(deviceId: string): string {
    const salt = process.env.DEVICE_HASH_SALT;
    if (!salt) {
      throw new Error('DEVICE_HASH_SALT environment variable is required');
    }
    return createHash('sha256').update(deviceId + salt).digest('hex');
  }

  // Store a new license after Gumroad verification
  async storeLicense(licenseKey: string, gumroadData: any): Promise<LicenseRecord> {
    const licenseId = randomUUID();
    const licenseKeyHash = this.hashLicenseKey(licenseKey);
    
    const license: LicenseRecord = {
      id: licenseId,
      license_key_hash: licenseKeyHash,
      gumroad_purchase_id: gumroadData.purchase?.id || 'unknown',
      email: gumroadData.purchase?.email || 'unknown',
      max_devices: 1, // Restrict to one device
      created_at: new Date().toISOString()
    };

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO licenses 
      (id, license_key_hash, gumroad_purchase_id, email, max_devices, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      license.id,
      license.license_key_hash,
      license.gumroad_purchase_id,
      license.email,
      license.max_devices,
      license.created_at
    );

    return license;
  }

  // Get license by key
  async getLicenseByKey(licenseKey: string): Promise<LicenseRecord | null> {
    const licenseKeyHash = this.hashLicenseKey(licenseKey);
    const stmt = this.db.prepare('SELECT * FROM licenses WHERE license_key_hash = ?');
    const result = stmt.get(licenseKeyHash) as LicenseRecord | undefined;
    return result || null;
  }

  // Activate a device for a license
  async activateDevice(licenseKey: string, deviceId: string, deviceName: string): Promise<{ success: boolean; message: string; activation?: DeviceActivation }> {
    const license = await this.getLicenseByKey(licenseKey);
    if (!license) {
      return { success: false, message: 'Invalid license key' };
    }

    const deviceIdHash = this.hashDeviceId(deviceId);

    // Check if device is already activated
    const existingActivation = this.db.prepare(`
      SELECT * FROM device_activations 
      WHERE license_id = ? AND device_id_hash = ? AND revoked_at IS NULL
    `).get(license.id, deviceIdHash) as DeviceActivation | undefined;

    if (existingActivation) {
      // Update last seen
      this.updateLastSeen(existingActivation.id);
      return { 
        success: true, 
        message: 'Device already activated',
        activation: existingActivation
      };
    }

    // Check if license has reached max devices
    const activeDevicesCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM device_activations 
      WHERE license_id = ? AND revoked_at IS NULL
    `).get(license.id) as { count: number };

    if (activeDevicesCount.count >= license.max_devices) {
      return { 
        success: false, 
        message: `License already activated on ${license.max_devices} device(s). Please deactivate another device first.` 
      };
    }

    // Create new activation
    const activationId = randomUUID();
    const now = new Date().toISOString();
    
    const activation: DeviceActivation = {
      id: activationId,
      license_id: license.id,
      device_id_hash: deviceIdHash,
      device_name: deviceName,
      activated_at: now,
      last_seen_at: now,
      revoked_at: null
    };

    const stmt = this.db.prepare(`
      INSERT INTO device_activations 
      (id, license_id, device_id_hash, device_name, activated_at, last_seen_at, revoked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      activation.id,
      activation.license_id,
      activation.device_id_hash,
      activation.device_name,
      activation.activated_at,
      activation.last_seen_at,
      activation.revoked_at
    );

    return { 
      success: true, 
      message: 'Device activated successfully',
      activation 
    };
  }

  // Verify device activation
  async verifyDeviceActivation(licenseKey: string, deviceId: string): Promise<{ isValid: boolean; activation?: DeviceActivation }> {
    const license = await this.getLicenseByKey(licenseKey);
    if (!license) {
      return { isValid: false };
    }

    const deviceIdHash = this.hashDeviceId(deviceId);
    const stmt = this.db.prepare(`
      SELECT * FROM device_activations 
      WHERE license_id = ? AND device_id_hash = ? AND revoked_at IS NULL
    `);
    
    const activation = stmt.get(license.id, deviceIdHash) as DeviceActivation | undefined;
    
    if (activation) {
      // Update last seen
      this.updateLastSeen(activation.id);
      return { isValid: true, activation };
    }

    return { isValid: false };
  }

  // Update last seen timestamp (heartbeat)
  private updateLastSeen(activationId: string): void {
    const stmt = this.db.prepare(`
      UPDATE device_activations 
      SET last_seen_at = ? 
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), activationId);
  }

  // Deactivate a device
  async deactivateDevice(licenseKey: string, deviceId: string): Promise<{ success: boolean; message: string }> {
    const license = await this.getLicenseByKey(licenseKey);
    if (!license) {
      return { success: false, message: 'Invalid license key' };
    }

    const deviceIdHash = this.hashDeviceId(deviceId);
    const stmt = this.db.prepare(`
      UPDATE device_activations 
      SET revoked_at = ? 
      WHERE license_id = ? AND device_id_hash = ? AND revoked_at IS NULL
    `);

    const result = stmt.run(new Date().toISOString(), license.id, deviceIdHash);
    
    if (result.changes > 0) {
      return { success: true, message: 'Device deactivated successfully' };
    } else {
      return { success: false, message: 'Device not found or already deactivated' };
    }
  }

  // Get active devices for a license
  async getActiveDevices(licenseKey: string): Promise<DeviceActivation[]> {
    const license = await this.getLicenseByKey(licenseKey);
    if (!license) {
      return [];
    }

    const stmt = this.db.prepare(`
      SELECT * FROM device_activations 
      WHERE license_id = ? AND revoked_at IS NULL
      ORDER BY activated_at DESC
    `);
    
    return stmt.all(license.id) as DeviceActivation[];
  }

  // Cleanup old activations (devices not seen for more than 30 days)
  async cleanupOldActivations(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const stmt = this.db.prepare(`
      UPDATE device_activations 
      SET revoked_at = ? 
      WHERE last_seen_at < ? AND revoked_at IS NULL
    `);
    
    const result = stmt.run(new Date().toISOString(), thirtyDaysAgo.toISOString());
    return result.changes;
  }

  // Close database connection
  close(): void {
    this.db.close();
  }
}

// Singleton instance
export const licenseStorage = new LicenseStorage();