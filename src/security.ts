// Security utilities for MITM protection
class SecurityManager {
  static validateData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      console.log('❌ Data validation failed: not object or null');
      return false;
    }
    
    // Check for suspicious properties
    const suspiciousKeys = ['__proto__', 'constructor', 'prototype'];
    for (let i = 0; i < suspiciousKeys.length; i++) {
      if (suspiciousKeys[i] in data) {
        console.log('❌ Data validation failed: suspicious key found:', suspiciousKeys[i]);
        return false;
      }
    }
    
    return true;
  }

  static sanitizeEvent(event: any): any {
    console.log('🔒 Sanitizing event:', event?.eventName);
    if (!this.validateData(event)) {
      console.log('❌ Event validation failed');
      return null;
    }
    
    const sanitized: any = {};
    const allowedKeys = ['eventName', 'properties', 'userId', 'sessionId', 'timestamp', 'deviceInfo', 'id'];
    
    for (let i = 0; i < allowedKeys.length; i++) {
      const key = allowedKeys[i];
      if (event[key] !== undefined) {
        sanitized[key] = this.sanitizeValue(event[key]);
      }
    }
    
    console.log('✅ Event sanitized successfully');
    return sanitized;
  }

  private static sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (typeof k === 'string' && k.length < 100) {
          sanitized[k] = this.sanitizeValue(value[k]);
        }
      }
      return sanitized;
    }
    return value;
  }

  static generateSecureId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${random}`;
  }
}

export default SecurityManager;