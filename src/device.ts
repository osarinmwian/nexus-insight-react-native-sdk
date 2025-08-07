// Dynamic imports for compatibility

export interface DeviceInfo {
  deviceId: string;
  brand: string;
  model: string;
  systemVersion: string;
  appVersion: string;
  screenSize: string;
  platform: string;
}

class DeviceInfoManager {
  private static deviceId: string | null = null;

  static generateDeviceId(): string {
    if (this.deviceId) return this.deviceId;
    
    this.deviceId = 'device_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
    return this.deviceId;
  }

  static async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      const { Platform, Dimensions } = require('react-native');
      const { width, height } = Dimensions.get('window');
      
      let brand = 'Unknown';
      let model = 'Unknown';
      
      if (Platform.OS === 'ios') {
        brand = 'Apple';
        model = Platform.isPad ? 'iPad' : 'iPhone';
      } else if (Platform.OS === 'android') {
        brand = 'Android';
        model = 'Android Device';
      }
      
      return {
        deviceId: this.generateDeviceId(),
        brand,
        model,
        systemVersion: Platform.Version ? Platform.Version.toString() : 'Unknown',
        appVersion: '1.0.0',
        screenSize: `${width}x${height}`,
        platform: Platform.OS || 'unknown'
      };
    } catch {
      return {
        deviceId: this.generateDeviceId(),
        brand: 'Unknown',
        model: 'Unknown',
        systemVersion: 'Unknown',
        appVersion: '1.0.0',
        screenSize: '0x0',
        platform: 'unknown'
      };
    }
  }
}

export default DeviceInfoManager;