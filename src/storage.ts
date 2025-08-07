// Dynamic imports for compatibility
import CryptoManager from './crypto';

class AsyncStorage {
  private static storage: { [key: string]: string } = {};
  private static secureKeys = ['nexus_events', 'nexus_user_id'];

  private static arrayIncludes(array: string[], item: string): boolean {
    for (let i = 0; i < array.length; i++) {
      if (array[i] === item) return true;
    }
    return false;
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const { Platform } = require('react-native');
      let data: string | null = null;
      
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).localStorage) {
        data = (window as any).localStorage.getItem(key);
      } else {
        data = this.storage[key] || null;
      }
      
      if (data && this.arrayIncludes(this.secureKeys, key)) {
        return CryptoManager.decrypt(data);
      }
      return data;
    } catch {
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      const { Platform } = require('react-native');
      const dataToStore = this.arrayIncludes(this.secureKeys, key) ? CryptoManager.encrypt(value) : value;
      
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.setItem(key, dataToStore);
        return;
      }
      this.storage[key] = dataToStore;
    } catch {
      // Silent fail
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      const { Platform } = require('react-native');
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.removeItem(key);
        return;
      }
      delete this.storage[key];
    } catch {
      // Silent fail
    }
  }
}

export default AsyncStorage;