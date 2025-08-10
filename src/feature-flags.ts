// Feature flags controlled by OTA updates
import AsyncStorage from './storage';

class FeatureFlags {
  private static cache: { [key: string]: boolean } = {};
  
  static async isEnabled(feature: string): Promise<boolean> {
    if (this.cache[feature] !== undefined) {
      return this.cache[feature];
    }
    
    try {
      const value = await AsyncStorage.getItem(`nexus_feature_${feature}`);
      const enabled = value === 'true';
      this.cache[feature] = enabled;
      return enabled;
    } catch {
      return false;
    }
  }
  
  static async enable(feature: string): Promise<void> {
    await AsyncStorage.setItem(`nexus_feature_${feature}`, 'true');
    this.cache[feature] = true;
  }
  
  static async disable(feature: string): Promise<void> {
    await AsyncStorage.setItem(`nexus_feature_${feature}`, 'false');
    this.cache[feature] = false;
  }
  
  static clearCache(): void {
    this.cache = {};
  }
}

export default FeatureFlags;