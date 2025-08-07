// Data bridge for dashboard sync
import AsyncStorage from './storage';

class DataBridge {
  private static dashboardUrl: string | null = null;
  private static lastSyncedEventCount = 0;
  
  static setDashboardUrl(url: string): void {
    this.dashboardUrl = url;
  }
  
  static async syncToDashboard(): Promise<void> {
    try {
      const events = await AsyncStorage.getItem('nexus_events');
      const userId = await AsyncStorage.getItem('nexus_user_id');
      const currentScreen = await AsyncStorage.getItem('nexus_current_screen');
      
      const currentEventCount = events ? JSON.parse(events).length : 0;
      
      // Only sync if there are new events
      if (currentEventCount === this.lastSyncedEventCount) {
        return;
      }
      
      this.lastSyncedEventCount = currentEventCount;
      
      // Web sync
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.setItem('nexus_events', events || '[]');
        (window as any).localStorage.setItem('nexus_user_id', userId || '');
      }
      
      // Mobile to web bridge - only try if we have events and are on web
      if (events && events !== '[]' && typeof fetch !== 'undefined' && typeof window !== 'undefined') {
        const urls = this.dashboardUrl 
          ? [`${this.dashboardUrl}/api/sync`]
          : ['http://localhost:3000/api/sync'];
        
        for (const url of urls) {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify({ 
                events: JSON.parse(events), 
                userId,
                currentScreen 
              })
            });
            
            if (response.ok) break;
          } catch (e) {
            // Silent fail for mobile apps
          }
        }
      }
    } catch (error) {
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
    
    // Check for new events every 5 seconds, but only sync if there are changes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.syncToDashboard();
      }, 5000);
    }
  }
  
  static triggerSync(): void {
    // Force sync when new events are added
    this.syncToDashboard();
  }
}

export default DataBridge;