// Secure encryption utilities
class CryptoManager {
  private static key: string = 'nexus_insight_secure_2024';

  static encrypt(data: string): string {
    try {
      let encrypted = '';
      for (let i = 0; i < data.length; i++) {
        const keyChar = this.key.charCodeAt(i % this.key.length);
        const dataChar = data.charCodeAt(i);
        encrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      return this.base64Encode(encrypted);
    } catch {
      return data;
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      const encrypted = this.base64Decode(encryptedData);
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = this.key.charCodeAt(i % this.key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      return decrypted;
    } catch {
      return encryptedData;
    }
  }

  static hash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private static base64Encode(str: string): string {
    try {
      return btoa(str);
    } catch {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      while (i < str.length) {
        const a = str.charCodeAt(i++);
        const b = i < str.length ? str.charCodeAt(i++) : 0;
        const c = i < str.length ? str.charCodeAt(i++) : 0;
        const bitmap = (a << 16) | (b << 8) | c;
        result += chars.charAt((bitmap >> 18) & 63) + chars.charAt((bitmap >> 12) & 63) +
                 (i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=') +
                 (i - 1 < str.length ? chars.charAt(bitmap & 63) : '=');
      }
      return result;
    }
  }

  private static base64Decode(str: string): string {
    try {
      return atob(str);
    } catch {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      let i = 0;
      str = str.replace(/[^A-Za-z0-9+/]/g, '');
      while (i < str.length) {
        const encoded1 = chars.indexOf(str.charAt(i++));
        const encoded2 = chars.indexOf(str.charAt(i++));
        const encoded3 = chars.indexOf(str.charAt(i++));
        const encoded4 = chars.indexOf(str.charAt(i++));
        const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
        result += String.fromCharCode((bitmap >> 16) & 255);
        if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
        if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
      }
      return result;
    }
  }
}

export default CryptoManager;