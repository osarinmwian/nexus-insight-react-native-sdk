// Data bridge for dashboard sync
import AsyncStorage from './storage';

class DataBridge {
  static async syncToDashboard(): Promise<void> {
    try {
      const events = await AsyncStorage.getItem('nexus_events');
      const userId = await AsyncStorage.getItem('nexus_user_id');
      
      console.log('🔄 Syncing to dashboard:', { 
        eventCount: events ? JSON.parse(events).length : 0, 
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Web sync
      if (typeof window !== 'undefined' && (window as any).localStorage) {
        (window as any).localStorage.setItem('nexus_events', events || '[]');
        (window as any).localStorage.setItem('nexus_user_id', userId || '');
        console.log('💾 Data synced to localStorage');
      }
      
      // Mobile to web bridge - try ngrok URL first, then localhost
      if (events && events !== '[]' && typeof fetch !== 'undefined') {
        const urls = [
          'https://82e7aea83708.ngrok-free.app/api/sync',
          'http://localhost:3000/api/sync'
        ];
        
        for (const url of urls) {
          try {
            console.log(`📡 Sending ${JSON.parse(events).length} events to ${url}`);
            const response = await fetch(url, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify({ events: JSON.parse(events), userId })
            });
            
            if (response.ok) {
              console.log(`✅ Data sent successfully to ${url}`);
              break;
            }
          } catch (e) {
            console.log(`❌ Failed to send to ${url}:`, e.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
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
    console.log('🚀 Starting auto-sync to dashboard');
    
    // Immediate sync
    this.syncToDashboard();
    
    // Regular sync every 2 seconds for immediate feedback
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.syncToDashboard();
      }, 2000);
      console.log('✅ Auto-sync interval started (2s)');
    } else {
      console.log('⚠️ setInterval not available, using manual sync only');
    }
  }
}

export default DataBridge;