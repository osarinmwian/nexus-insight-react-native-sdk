// Bridge to sync data between React Native and web dashboard
import AsyncStorage from '@react-native-async-storage/async-storage';

export class DataBridge {
  static async exportEvents() {
    try {
      const events = await AsyncStorage.getItem('centri_events');
      return events ? JSON.parse(events) : [];
    } catch (error) {
      console.error('Failed to export events:', error);
      return [];
    }
  }

  static async syncToWeb() {
    // For development: copy events to clipboard or log them
    const events = await this.exportEvents();
    console.log('Events to sync:', JSON.stringify(events, null, 2));
    return events;
  }
}