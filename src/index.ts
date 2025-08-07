// Dynamic imports for compatibility
import AsyncStorage from './storage';
import DeviceInfoManager from './device';
import ScreenshotManager from './screenshot';
import CrashHandler from './crash';
import SecurityManager from './security';
import DataBridge from './bridge';
import './types';

export interface AnalyticsConfig {
  apiKey: string;
  userId?: string;
  enableCrashReporting?: boolean;
  maxEvents?: number;
  storageKey?: string;
  dashboardUrl?: string;
}

export interface EventProperties {
  [key: string]: any;
}

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  properties: EventProperties;
  userId: string;
  sessionId: string;
  timestamp: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  deviceId: string;
  brand: string;
  model: string;
  systemVersion: string;
  appVersion: string;
  screenSize: string;
  platform: string;
}

class NexusInsight {
  private config: AnalyticsConfig;
  private sessionId: string;
  private userId: string | null = null;
  private isInitialized = false;
  private isValidKey = false;

  constructor(config: AnalyticsConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required. Get your key from https://nexus-insight.com');
    }
    
    this.config = {
      enableCrashReporting: true,
      maxEvents: 1000,
      storageKey: 'nexus_events',
      ...config
    };
    
    // Pass dashboardUrl to DataBridge
    if (config.dashboardUrl) {
      DataBridge.setDashboardUrl(config.dashboardUrl);
    }
    
    this.isValidKey = this.validateApiKey(config.apiKey);
    this.sessionId = Date.now().toString();
    
    if (this.isValidKey) {
      this.init();
    } else {
      console.error('Invalid API key format. Use: nxs_live_xxxxxxxxxxxx or nxs_test_xxxxxxxxxxxx');
    }
  }

  private async init(): Promise<void> {
    try {
      this.userId = this.config.userId || 
        await AsyncStorage.getItem('nexus_user_id') || 
        this.generateUserId();
      
      await AsyncStorage.setItem('nexus_user_id', this.userId);
      
      if (this.config.enableCrashReporting) {
        this.setupCrashHandler();
      }
      
      try {
        const RN = require('react-native');
        if (RN && RN.AppState && RN.AppState.addEventListener) {
          RN.AppState.addEventListener('change', this.handleAppStateChange);
        }
      } catch {
        // AppState not available
      }
      this.isInitialized = true;
      
      await this.trackEvent('sdk_initialized');
      DataBridge.startAutoSync();
      
      // Auto-track app lifecycle events
      this.setupAutoTracking();
    } catch (error) {
      console.error('NexusInsight initialization failed:', error);
    }
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  private setupCrashHandler(): void {
    CrashHandler.setup((error: Error, isFatal: boolean) => {
      this.trackCrash(error, isFatal);
    });
  }

  public async trackEvent(eventName: string, properties: EventProperties = {}): Promise<void> {
    if (!this.isInitialized || !this.isValidKey) {
      console.warn('NexusInsight not initialized or invalid API key');
      return;
    }

    try {
      const deviceInfo = await this.getDeviceInfo();
      const event: AnalyticsEvent = {
        id: SecurityManager.generateSecureId(),
        eventName,
        properties,
        userId: this.userId!,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        deviceInfo
      };
      
      const sanitizedEvent = SecurityManager.sanitizeEvent(event);
      if (sanitizedEvent) {
        await this.storeEvent(sanitizedEvent);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  public async trackScreen(screenName: string, properties: EventProperties = {}): Promise<void> {
    if (!this.isValidKey) return;
    await this.trackEvent('screen_view', { screenName, ...properties });
  }

  public async trackCrash(error: Error, isFatal = false): Promise<void> {
    if (!this.isValidKey) return;
    const crashData = {
      message: error.message,
      stack: error.stack,
      isFatal,
      name: error.name
    };
    await this.trackEvent('app_crash', crashData);
  }

  public async takeScreenshot(viewRef: any): Promise<string | null> {
    if (!this.isValidKey) return null;
    try {
      const uri = await ScreenshotManager.captureView(viewRef);
      if (uri) {
        await this.trackEvent('screenshot_taken', { screenshotUri: uri });
      }
      return uri;
    } catch (error) {
      console.error('Screenshot failed:', error);
      return null;
    }
  }

  public async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    await AsyncStorage.setItem('nexus_user_id', userId);
    await this.trackEvent('user_identified', { userId });
  }

  public async setUserProperties(properties: EventProperties): Promise<void> {
    await this.trackEvent('user_properties_updated', properties);
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    return await DeviceInfoManager.getDeviceInfo();
  }

  private handleAppStateChange = (nextAppState: string): void => {
    if (this.isInitialized) {
      this.trackEvent('app_state_change', { state: nextAppState });
    }
  };

  private async storeEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const existingEvents = await AsyncStorage.getItem(this.config.storageKey!);
      const events = existingEvents ? JSON.parse(existingEvents) : [];
      events.push(event);
      
      if (events.length > this.config.maxEvents!) {
        events.splice(0, events.length - this.config.maxEvents!);
      }
      
      await AsyncStorage.setItem(this.config.storageKey!, JSON.stringify(events));
    } catch (error) {
      console.error('Failed to store event:', error);
    }
  }

  public async getAllEvents(): Promise<AnalyticsEvent[]> {
    try {
      const events = await AsyncStorage.getItem(this.config.storageKey!);
      return events ? JSON.parse(events) : [];
    } catch (error) {
      return [];
    }
  }

  public async clearEvents(): Promise<void> {
    await AsyncStorage.removeItem(this.config.storageKey!);
  }

  public async flush(): Promise<void> {
    const events = await this.getAllEvents();
    console.log('Flushing events:', events.length);
  }

  private validateApiKey(apiKey: string): boolean {
    const keyPattern = /^nxs_(live|test)_[a-zA-Z0-9]{12}$/;
    return keyPattern.test(apiKey);
  }

  private setupAutoTracking(): void {
    if (!this.isValidKey) return;
    
    try {
      const RN = require('react-native');
      
      if (RN.AppState) {
        RN.AppState.addEventListener('change', (nextAppState: string) => {
          if (nextAppState === 'active') {
            this.trackEvent('app_foreground');
          } else if (nextAppState === 'background') {
            this.trackEvent('app_background');
          }
        });
      }
      
      if (RN.Dimensions) {
        RN.Dimensions.addEventListener('change', ({ window }: any) => {
          this.trackEvent('orientation_change', {
            width: window.width,
            height: window.height,
            orientation: window.width > window.height ? 'landscape' : 'portrait'
          });
        });
      }
    } catch {
      // Auto-tracking not available
    }
  }
}

export default NexusInsight;