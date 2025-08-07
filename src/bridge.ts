// Data bridge for dashboard sync
import AsyncStorage from './storage';

class DataBridge {
  static async syncToDashboard(): Promise<void> {
    try {
      const events = await AsyncStorage.getItem('nexus_events');
      const userId = await AsyncStorage.getItem('nexus_user_id');
      
      // Web sync
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.setItem('nexus_events', events || '[]');
        (window as any).localStorage.setItem('nexus_user_id', userId || '');
      }
      
      // Mobile sync - create demo events for immediate testing
      if (!events || JSON.parse(events || '[]').length === 0) {
        await this.createDemoEvents();
      }
    } catch {
      // Silent fail
    }
  }

  static async createDemoEvents(): Promise<void> {
    try {
      const RN = require('react-native');
      const deviceInfo = {
        deviceId: 'demo_device',
        brand: RN.Platform.OS === 'ios' ? 'Apple' : 'Android',
        model: RN.Platform.OS === 'ios' ? 'iPhone' : 'Android Device',
        systemVersion: RN.Platform.Version?.toString() || '1.0',
        appVersion: '1.0.0',
        screenSize: '390x844',
        platform: RN.Platform.OS
      };
      
      const demoEvents = [
        {
          id: 'demo_1',
          eventName: 'app_install',
          properties: { source: 'demo' },
          userId: 'demo_user',
          sessionId: 'demo_session',
          timestamp: new Date().toISOString(),
          deviceInfo
        },
        {
          id: 'demo_2',
          eventName: 'screenshot_taken',
          properties: {
            screenshotUri: RN.Platform.OS === 'ios' 
              ? 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
              : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          },
          userId: 'demo_user',
          sessionId: 'demo_session',
          timestamp: new Date().toISOString(),
          deviceInfo
        }
      ];
      
      await AsyncStorage.setItem('nexus_events', JSON.stringify(demoEvents));
    } catch {
      // Silent fail
    }
  }

  static startAutoSync(): void {
    // Immediate sync
    this.syncToDashboard();
    
    // Regular sync every 2 seconds for immediate feedback
    setInterval(() => {
      this.syncToDashboard();
    }, 2000);
  }
}

export default DataBridge;