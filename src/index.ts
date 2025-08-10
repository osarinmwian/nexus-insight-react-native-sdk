// Dynamic imports for compatibility
import AsyncStorage from './storage';
import DeviceInfoManager from './device';
import ScreenshotManager from './screenshot';
import CrashHandler from './crash';
import SecurityManager from './security';
import DataBridge from './bridge';
import OTAManager from './ota';
import FeatureFlags from './feature-flags';
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
  private currentScreen: string | null = null;
  private previousScreen: string | null = null;
  private screenStartTime: number = Date.now();
  private otaConfig: any = null;

  constructor(config: AnalyticsConfig) {
    console.log('🔧 Initializing NexusInsight with config:', { apiKey: config.apiKey?.substring(0, 10) + '...', dashboardUrl: config.dashboardUrl });
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
    console.log('🔑 API key validation:', this.isValidKey);
    this.sessionId = Date.now().toString();
    
    if (this.isValidKey) {
      this.init();
    } else {
      console.error('Invalid API key format. Use: nxs_live_xxxxxxxxxxxx or nxs_test_xxxxxxxxxxxx');
    }
  }

  private async init(): Promise<void> {
    try {
      console.log('🚀 Starting SDK initialization...');
      this.userId = this.config.userId || 
        await AsyncStorage.getItem('nexus_user_id') || 
        this.generateUserId();
      
      await AsyncStorage.setItem('nexus_user_id', this.userId);
      console.log('👤 User ID set:', this.userId);
      
      // Restore current screen if available
      this.currentScreen = await AsyncStorage.getItem('nexus_current_screen');
      
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
      console.log('✅ SDK initialized successfully');
      
      await this.trackEvent('sdk_initialized', {
        currentScreen: this.currentScreen
      });
      DataBridge.startAutoSync();
      
      // Auto-track app lifecycle events
      this.setupAutoTracking();
      
      // Enable real-time OTA updates
      this.enableRealtimeOTA();
      
      // Check for OTA updates
      this.checkOTAUpdates();
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
    console.log('🚀 Attempting to track', eventName, 'event...');
    if (!this.isInitialized || !this.isValidKey) {
      console.warn('NexusInsight not initialized or invalid API key');
      return;
    }
    
    // Apply OTA config if available
    if (this.otaConfig?.settings) {
      this.config = { ...this.config, ...this.otaConfig.settings };
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
        console.log('✅', eventName, 'event tracked');
      } else {
        console.log('⚠️ Event sanitization failed');
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  public async trackScreen(screenName: string, properties: EventProperties = {}): Promise<void> {
    if (!this.isValidKey) return;
    
    // Store current screen name
    this.currentScreen = screenName;
    await AsyncStorage.setItem('nexus_current_screen', screenName);
    
    await this.trackEvent('screen_view', { 
      screenName, 
      previousScreen: this.previousScreen,
      screenDuration: this.getScreenDuration(),
      ...properties 
    });
    
    this.previousScreen = screenName;
    this.screenStartTime = Date.now();
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
    
    // Check if auto screenshots are enabled via OTA
    const autoScreenshots = await FeatureFlags.isEnabled('auto_screenshots');
    const enhancedTracking = await FeatureFlags.isEnabled('enhanced_tracking');
    
    if (autoScreenshots) {
      console.log('📷 Auto screenshots enabled via OTA');
    }
    
    try {
      const uri = await ScreenshotManager.captureView(viewRef);
      if (uri) {
        const eventData: any = { 
          screenshotUri: uri, 
          autoEnabled: autoScreenshots,
          enhancedTracking
        };
        
        // Add enhanced data if feature is enabled
        if (enhancedTracking) {
          eventData.screenSize = await this.getScreenSize();
          eventData.memoryUsage = await this.getMemoryUsage();
        }
        
        await this.trackEvent('screenshot_taken', eventData);
      }
      return uri;
    } catch (error) {
      console.error('Screenshot failed:', error);
      return null;
    }
  }
  
  private async getScreenSize(): Promise<string> {
    try {
      const RN = require('react-native');
      if (RN?.Dimensions) {
        const { width, height } = RN.Dimensions.get('window');
        return `${width}x${height}`;
      }
    } catch {}
    return 'unknown';
  }
  
  private async getMemoryUsage(): Promise<number> {
    try {
      // This would need native implementation for accurate memory usage
      return performance?.memory?.usedJSHeapSize || 0;
    } catch {
      return 0;
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

  public getCurrentScreen(): string | null {
    return this.currentScreen;
  }

  public async getScreenHistory(): Promise<string[]> {
    try {
      const events = await this.getAllEvents();
      return events
        .filter(e => e.eventName === 'screen_view')
        .map(e => e.properties.screenName)
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private getScreenDuration(): number {
    return this.screenStartTime ? Date.now() - this.screenStartTime : 0;
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
      console.log('🔄 Storing event:', event.eventName, 'with key:', this.config.storageKey);
      const existingEvents = await AsyncStorage.getItem(this.config.storageKey!);
      console.log('📦 Existing events:', existingEvents ? 'found' : 'none');
      const events = existingEvents ? JSON.parse(existingEvents) : [];
      events.push(event);
      
      if (events.length > this.config.maxEvents!) {
        events.splice(0, events.length - this.config.maxEvents!);
      }
      
      await AsyncStorage.setItem(this.config.storageKey!, JSON.stringify(events));
      console.log('✅ Event stored. Total events:', events.length);
      
      // Trigger immediate sync when new events are added
      DataBridge.triggerSync();
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

  private enableRealtimeOTA(): void {
    try {
      OTAManager.enableRealtimeUpdates(this.config.apiKey, (update) => {
        this.otaConfig = update.config;
        console.log('⚡ Real-time OTA update applied:', update.version);
        
        // Trigger immediate re-sync with new config
        DataBridge.triggerSync();
        
        // Re-initialize features with new config
        this.applyOTAConfig(update.config);
      });
    } catch (error) {
      console.error('Failed to enable real-time OTA:', error);
    }
  }
  
  private applyOTAConfig(config: any): void {
    // Apply new settings immediately
    if (config.settings) {
      this.config = { ...this.config, ...config.settings };
    }
    
    // Execute any code updates
    if (config.code) {
      OTAManager.executeOTACode();
    }
    
    // Update feature flags
    if (config.features) {
      config.features.forEach((feature: string) => {
        FeatureFlags.enable(feature);
      });
    }
  }

  private async checkOTAUpdates(): Promise<void> {
    try {
      // Process any scheduled updates first
      await OTAManager.processScheduledUpdates();
      
      const update = await OTAManager.checkForUpdates(this.config.apiKey);
      if (update) {
        await this.trackEvent('ota_update_available', { 
          version: update.version,
          mandatory: update.mandatory,
          features: update.config.features
        });
        
        const success = await OTAManager.applyUpdate(update);
        if (success) {
          this.otaConfig = await OTAManager.getCurrentConfig();
          await OTAManager.executeOTACode();
          await this.trackEvent('ota_update_applied', { 
            version: update.version,
            previousVersion: await OTAManager.getCurrentVersion()
          });
          
          // Enable features from OTA config
          if (update.config.features) {
            for (const feature of update.config.features) {
              await FeatureFlags.enable(feature);
            }
          }
        } else {
          await this.trackEvent('ota_update_failed', { 
            version: update.version,
            error: 'Application failed'
          });
        }
      }
    } catch (error) {
      await this.trackEvent('ota_check_error', { error: error.message });
    }
  }
  
  public async checkOTAUpdates(): Promise<void> {
    return this.checkOTAUpdates();
  }
  
  public async rollbackOTA(targetVersion?: string): Promise<boolean> {
    try {
      const success = await OTAManager.rollback(this.config.apiKey, targetVersion);
      await this.trackEvent('ota_rollback', { 
        success,
        targetVersion,
        currentVersion: await OTAManager.getCurrentVersion()
      });
      return success;
    } catch (error) {
      await this.trackEvent('ota_rollback_error', { error: error.message });
      return false;
    }
  }
  
  public async getOTAHistory(): Promise<any[]> {
    return await OTAManager.getUpdateHistory();
  }

  private setupAutoTracking(): void {
    if (!this.isValidKey) return;
    
    try {
      const RN = require('react-native');
      
      if (RN.AppState) {
        RN.AppState.addEventListener('change', async (nextAppState: string) => {
          if (nextAppState === 'active') {
            await this.trackEvent('app_foreground');
            // Check for OTA updates when app becomes active
            this.checkOTAUpdates();
          } else if (nextAppState === 'background') {
            await this.trackEvent('app_background');
          }
        });
      }
      
      if (RN.Dimensions) {
        RN.Dimensions.addEventListener('change', async ({ window }: any) => {
          const enhancedTracking = await FeatureFlags.isEnabled('enhanced_tracking');
          const eventData: any = {
            width: window.width,
            height: window.height,
            orientation: window.width > window.height ? 'landscape' : 'portrait'
          };
          
          if (enhancedTracking) {
            eventData.aspectRatio = (window.width / window.height).toFixed(2);
            eventData.screenDensity = window.scale || 1;
          }
          
          await this.trackEvent('orientation_change', eventData);
        });
      }
      
      // Set up periodic OTA checks
      setInterval(() => {
        this.checkOTAUpdates();
      }, 6 * 60 * 60 * 1000); // Every 6 hours
      
    } catch {
      // Auto-tracking not available
    }
  }
}

export default NexusInsight;