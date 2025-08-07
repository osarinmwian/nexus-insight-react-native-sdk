// Data bridge for dashboard sync
import AsyncStorage from './storage';

class DataBridge {
  static async syncToDashboard(): Promise<void> {
    try {
      const events = await AsyncStorage.getItem('nexus_events');
      const userId = await AsyncStorage.getItem('nexus_user_id');
      
      console.log('Syncing to dashboard:', { events: events ? JSON.parse(events).length : 0, userId });
      
      // Web sync
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.setItem('nexus_events', events || '[]');
        (window as any).localStorage.setItem('nexus_user_id', userId || '');
        console.log('Data synced to localStorage');
      }
      
      // Mobile to web bridge - use fetch to send data to dashboard
      if (events && events !== '[]') {
        try {
          await fetch('http://localhost:3000/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: JSON.parse(events), userId })
          });
          console.log('Data sent to dashboard API');
        } catch (e) {
          console.log('Dashboard API not available, using localStorage fallback');
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
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