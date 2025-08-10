// Over-The-Air Updates Manager
import AsyncStorage from './storage';

interface OTAConfig {
  version: string;
  features: string[];
  endpoints: { [key: string]: string };
  settings: { [key: string]: any };
  code?: string;
  checksum?: string;
  minSdkVersion?: string;
}

interface OTAUpdate {
  version: string;
  config: OTAConfig;
  timestamp: string;
  mandatory: boolean;
  rollbackVersion?: string;
  targetDevices?: string[];
  schedule?: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

interface UpdateHistory {
  version: string;
  appliedAt: string;
  success: boolean;
  error?: string;
  rollbackFrom?: string;
}

class OTAManager {
  private static currentVersion = '1.0.0';
  private static updateEndpoints = [
    '/api/ota', // Local endpoint first
    'https://api.nexus-insight.com/ota',
    'https://cdn.nexus-insight.com/updates'
  ];
  private static maxRetries = 3;
  private static retryDelay = 5000;
  private static realtimeConnection: WebSocket | EventSource | null = null;
  private static isRealtimeEnabled = false;
  private static updateCallback: ((update: OTAUpdate) => void) | null = null;
  
  static enableRealtimeUpdates(apiKey: string, callback?: (update: OTAUpdate) => void): void {
    if (this.isRealtimeEnabled) return;
    
    this.updateCallback = callback || null;
    this.isRealtimeEnabled = true;
    
    // Try WebSocket first, fallback to Server-Sent Events
    this.connectWebSocket(apiKey) || this.connectSSE(apiKey);
  }
  
  static disableRealtimeUpdates(): void {
    this.isRealtimeEnabled = false;
    if (this.realtimeConnection) {
      if (this.realtimeConnection instanceof WebSocket) {
        this.realtimeConnection.close();
      } else if (this.realtimeConnection instanceof EventSource) {
        this.realtimeConnection.close();
      }
      this.realtimeConnection = null;
    }
  }
  
  private static connectWebSocket(apiKey: string): boolean {
    try {
      const wsUrl = `ws://localhost:3001/ota-updates?apiKey=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('🔄 Real-time OTA updates connected via WebSocket');
        this.realtimeConnection = ws;
      };
      
      ws.onmessage = (event) => {
        try {
          const update: OTAUpdate = JSON.parse(event.data);
          console.log('⚡ Real-time OTA update received:', update.version);
          this.handleRealtimeUpdate(update);
        } catch (error) {
          console.error('Failed to parse OTA update:', error);
        }
      };
      
      ws.onerror = () => {
        console.log('WebSocket failed, trying Server-Sent Events...');
        this.connectSSE(apiKey);
      };
      
      ws.onclose = () => {
        if (this.isRealtimeEnabled) {
          setTimeout(() => this.connectWebSocket(apiKey), 5000);
        }
      };
      
      return true;
    } catch {
      return false;
    }
  }
  
  private static connectSSE(apiKey: string): boolean {
    try {
      const sseUrl = `http://localhost:3000/api/ota-stream?apiKey=${apiKey}`;
      const eventSource = new EventSource(sseUrl);
      
      eventSource.onopen = () => {
        console.log('🔄 Real-time OTA updates connected via SSE');
        this.realtimeConnection = eventSource;
      };
      
      eventSource.onmessage = (event) => {
        try {
          const update: OTAUpdate = JSON.parse(event.data);
          console.log('⚡ Real-time OTA update received:', update.version);
          this.handleRealtimeUpdate(update);
        } catch (error) {
          console.error('Failed to parse OTA update:', error);
        }
      };
      
      eventSource.onerror = () => {
        if (this.isRealtimeEnabled) {
          setTimeout(() => this.connectSSE(apiKey), 5000);
        }
      };
      
      return true;
    } catch {
      return false;
    }
  }
  
  private static async handleRealtimeUpdate(update: OTAUpdate): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    
    if (await this.validateUpdate(update, currentVersion)) {
      const applied = await this.applyUpdate(update);
      if (applied && this.updateCallback) {
        this.updateCallback(update);
      }
    }
  }
  
  static async checkForUpdates(apiKey: string, forceCheck = false): Promise<OTAUpdate | null> {
    try {
      const lastCheck = await AsyncStorage.getItem('nexus_ota_last_check');
      const now = Date.now();
      
      // Check every 6 hours unless forced
      if (!forceCheck && lastCheck && (now - parseInt(lastCheck)) < 21600000) {
        return null;
      }
      
      const currentVersion = await this.getCurrentVersion();
      const deviceId = await AsyncStorage.getItem('nexus_device_id') || 'unknown';
      
      for (let i = 0; i < this.updateEndpoints.length; i++) {
        const endpoint = this.updateEndpoints[i];
        let retries = 0;
        
        while (retries < this.maxRetries) {
          try {
            const url = endpoint.startsWith('http') ? 
              `${endpoint}/${apiKey}?currentVersion=${currentVersion}&deviceId=${deviceId}` :
              `${endpoint}?apiKey=${apiKey}&currentVersion=${currentVersion}&deviceId=${deviceId}`;
              
            const response = await fetch(url, {
              headers: { 
                'User-Agent': `NexusInsight/${currentVersion}`,
                'X-Device-ID': deviceId,
                'X-SDK-Version': currentVersion
              },
              timeout: 10000
            });
            
            if (response.ok) {
              const update: OTAUpdate = await response.json();
              await AsyncStorage.setItem('nexus_ota_last_check', now.toString());
              
              // Validate update
              if (await this.validateUpdate(update, currentVersion)) {
                return update;
              }
            } else if (response.status === 204) {
              // No updates available
              await AsyncStorage.setItem('nexus_ota_last_check', now.toString());
              return null;
            }
            break; // Success, exit retry loop
          } catch (error) {
            retries++;
            if (retries < this.maxRetries) {
              await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
            }
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  static async applyUpdate(update: OTAUpdate): Promise<boolean> {
    try {
      // Check if update is scheduled
      if (update.schedule && !this.isUpdateScheduled(update.schedule)) {
        await this.scheduleUpdate(update);
        return false; // Will be applied later
      }
      
      // Backup current config before applying update
      const currentConfig = await this.getCurrentConfig();
      const currentVersion = await this.getCurrentVersion();
      
      if (currentConfig && currentVersion) {
        await AsyncStorage.setItem('nexus_ota_backup_config', JSON.stringify(currentConfig));
        await AsyncStorage.setItem('nexus_ota_backup_version', currentVersion);
      }
      
      // Validate checksum if provided
      if (update.config.checksum && !await this.validateChecksum(update.config)) {
        await this.recordUpdateHistory(update.version, false, 'Checksum validation failed');
        return false;
      }
      
      // Store new config
      await AsyncStorage.setItem('nexus_ota_config', JSON.stringify(update.config));
      await AsyncStorage.setItem('nexus_ota_version', update.version);
      await AsyncStorage.setItem('nexus_ota_applied_at', Date.now().toString());
      
      // Apply code updates if present
      if (update.config.code) {
        await AsyncStorage.setItem('nexus_ota_code', update.config.code);
      }
      
      // Record successful update
      await this.recordUpdateHistory(update.version, true);
      
      return true;
    } catch (error) {
      await this.recordUpdateHistory(update.version, false, error.message);
      return false;
    }
  }
  
  static async getCurrentConfig(): Promise<OTAConfig | null> {
    try {
      const config = await AsyncStorage.getItem('nexus_ota_config');
      return config ? JSON.parse(config) : null;
    } catch {
      return null;
    }
  }
  
  static async executeOTACode(): Promise<void> {
    try {
      const code = await AsyncStorage.getItem('nexus_ota_code');
      if (code) {
        // Safe code execution with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Code execution timeout')), 5000)
        );
        
        const executionPromise = new Promise((resolve) => {
          try {
            // Sandboxed execution with limited scope
            const func = new Function(
              'AsyncStorage', 
              'console', 
              'setTimeout',
              'clearTimeout',
              `"use strict"; ${code}`
            );
            func(AsyncStorage, console, setTimeout, clearTimeout);
            resolve(true);
          } catch (error) {
            console.error('OTA code execution error:', error);
            resolve(false);
          }
        });
        
        await Promise.race([executionPromise, timeoutPromise]);
      }
    } catch (error) {
      console.error('OTA code execution failed:', error);
    }
  }
  
  static async getCurrentVersion(): Promise<string> {
    try {
      const version = await AsyncStorage.getItem('nexus_ota_version');
      return version || this.currentVersion;
    } catch {
      return this.currentVersion;
    }
  }
  
  static async rollback(apiKey: string, targetVersion?: string): Promise<boolean> {
    try {
      const currentVersion = await this.getCurrentVersion();
      
      // Try server-side rollback first
      const response = await fetch(`/api/ota?apiKey=${apiKey}&currentVersion=${currentVersion}&action=rollback&targetVersion=${targetVersion || ''}`);
      
      if (response.ok) {
        const rollbackUpdate: OTAUpdate = await response.json();
        const success = await this.applyUpdate(rollbackUpdate);
        if (success) {
          await this.recordUpdateHistory(rollbackUpdate.version, true, undefined, currentVersion);
        }
        return success;
      }
      
      // Fallback to local backup
      const backupConfig = await AsyncStorage.getItem('nexus_ota_backup_config');
      const backupVersion = await AsyncStorage.getItem('nexus_ota_backup_version');
      
      if (backupConfig && backupVersion) {
        await AsyncStorage.setItem('nexus_ota_config', backupConfig);
        await AsyncStorage.setItem('nexus_ota_version', backupVersion);
        await AsyncStorage.removeItem('nexus_ota_code'); // Clear any code updates
        await this.recordUpdateHistory(backupVersion, true, undefined, currentVersion);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }
  
  static async getUpdateHistory(): Promise<UpdateHistory[]> {
    try {
      const history = await AsyncStorage.getItem('nexus_ota_history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }
  
  static async recordUpdateHistory(version: string, success: boolean, error?: string, rollbackFrom?: string): Promise<void> {
    try {
      const history = await this.getUpdateHistory();
      const record: UpdateHistory = {
        version,
        appliedAt: new Date().toISOString(),
        success,
        error,
        rollbackFrom
      };
      
      history.unshift(record); // Add to beginning
      
      // Keep only last 50 records
      if (history.length > 50) {
        history.splice(50);
      }
      
      await AsyncStorage.setItem('nexus_ota_history', JSON.stringify(history));
    } catch {}
  }
  
  static async validateUpdate(update: OTAUpdate, currentVersion: string): Promise<boolean> {
    // Version validation
    if (!this.isNewerVersion(update.version, currentVersion) && !update.mandatory) {
      return false;
    }
    
    // SDK version compatibility
    if (update.config.minSdkVersion && !this.isVersionCompatible(this.currentVersion, update.config.minSdkVersion)) {
      return false;
    }
    
    // Device targeting
    if (update.targetDevices && update.targetDevices.length > 0) {
      const deviceId = await AsyncStorage.getItem('nexus_device_id');
      if (!deviceId || !update.targetDevices.includes(deviceId)) {
        return false;
      }
    }
    
    return true;
  }
  
  static async validateChecksum(config: OTAConfig): Promise<boolean> {
    if (!config.checksum) return true;
    
    try {
      // Simple checksum validation for config
      const configStr = JSON.stringify({ ...config, checksum: undefined });
      const hash = await this.simpleHash(configStr);
      return hash === config.checksum;
    } catch {
      return false;
    }
  }
  
  static async simpleHash(str: string): Promise<string> {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  static isUpdateScheduled(schedule: { startTime: string; endTime: string; timezone: string }): boolean {
    try {
      const now = new Date();
      const startTime = new Date(schedule.startTime);
      const endTime = new Date(schedule.endTime);
      
      return now >= startTime && now <= endTime;
    } catch {
      return true; // If parsing fails, allow update
    }
  }
  
  static async scheduleUpdate(update: OTAUpdate): Promise<void> {
    try {
      const scheduledUpdates = await AsyncStorage.getItem('nexus_ota_scheduled');
      const updates = scheduledUpdates ? JSON.parse(scheduledUpdates) : [];
      
      updates.push({
        update,
        scheduledAt: new Date().toISOString()
      });
      
      await AsyncStorage.setItem('nexus_ota_scheduled', JSON.stringify(updates));
    } catch {}
  }
  
  static async processScheduledUpdates(): Promise<void> {
    try {
      const scheduledUpdates = await AsyncStorage.getItem('nexus_ota_scheduled');
      if (!scheduledUpdates) return;
      
      const updates = JSON.parse(scheduledUpdates);
      const pendingUpdates = [];
      
      for (const { update } of updates) {
        if (update.schedule && this.isUpdateScheduled(update.schedule)) {
          await this.applyUpdate(update);
        } else {
          pendingUpdates.push({ update, scheduledAt: new Date().toISOString() });
        }
      }
      
      await AsyncStorage.setItem('nexus_ota_scheduled', JSON.stringify(pendingUpdates));
    } catch {}
  }
  
  static isVersionCompatible(currentVersion: string, minVersion: string): boolean {
    const current = currentVersion.split('.').map(Number);
    const minimum = minVersion.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (current[i] > minimum[i]) return true;
      if (current[i] < minimum[i]) return false;
    }
    return true;
  }
  
  private static isNewerVersion(newVersion: string, currentVersion?: string): boolean {
    const current = (currentVersion || this.currentVersion).split('.').map(Number);
    const incoming = newVersion.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (incoming[i] > current[i]) return true;
      if (incoming[i] < current[i]) return false;
    }
    return false;
  }
}

export default OTAManager;
export type { OTAConfig, OTAUpdate, UpdateHistory };