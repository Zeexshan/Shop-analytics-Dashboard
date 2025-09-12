// Device fingerprinting utilities for license binding
// Professional device identification by zeeexshan

import { machineId } from 'node-machine-id';
import { createHash } from 'crypto';
import os from 'os';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: string;
  arch: string;
}

export class DeviceManager {
  // Get stable device ID
  static async getDeviceId(): Promise<string> {
    try {
      // Get machine ID (stable across reboots)
      const machineIdValue = await machineId();
      
      // Add some additional system info for better uniqueness
      const platform = os.platform();
      const arch = os.arch();
      const hostname = os.hostname();
      
      // Create a composite device ID
      const compositeId = `${machineIdValue}-${platform}-${arch}-${hostname}`;
      
      // Hash it for privacy and fixed length
      return createHash('sha256')
        .update(compositeId + 'zeeexshan_device_salt')
        .digest('hex')
        .substring(0, 32); // First 32 chars for shorter ID
    } catch (error) {
      console.error('Error getting device ID:', error);
      // Fallback to system info only
      const fallbackId = `${os.platform()}-${os.arch()}-${os.hostname()}-${Date.now()}`;
      return createHash('md5').update(fallbackId).digest('hex');
    }
  }

  // Get human-readable device name
  static getDeviceName(): string {
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    
    // Create a user-friendly device name
    let platformName: string = platform;
    switch (platform) {
      case 'win32':
        platformName = 'Windows';
        break;
      case 'darwin':
        platformName = 'macOS';
        break;
      case 'linux':
        platformName = 'Linux';
        break;
    }
    
    return `${hostname} (${platformName} ${arch})`;
  }

  // Get comprehensive device info
  static async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.getDeviceId();
    const deviceName = this.getDeviceName();
    const platform = os.platform();
    const arch = os.arch();
    
    return {
      deviceId,
      deviceName,
      platform,
      arch
    };
  }

  // Validate device info for consistency
  static async validateDevice(storedDeviceId: string): Promise<boolean> {
    try {
      const currentDeviceId = await this.getDeviceId();
      return currentDeviceId === storedDeviceId;
    } catch (error) {
      console.error('Error validating device:', error);
      return false;
    }
  }
}