# @nexus/insight-pro

Enterprise-grade React Native analytics SDK with encrypted storage, crash reporting, and zero dependencies.

## Installation

```bash
# Using npm
npm install @nexus/insight-pro

# Using yarn
yarn add @nexus/insight-pro
```

**No additional dependencies required!** The SDK is built from scratch using only React Native's built-in APIs.

## Quick Start

```javascript
import NexusInsight from '@nexus/insight-pro';

// Initialize with default configuration
const analytics = new NexusInsight();

// Or with custom configuration
const analytics = new NexusInsight({
  apiKey: 'your-api-key',
  userId: 'custom-user-id',
  enableCrashReporting: true,
  maxEvents: 1000
});
```

## API Reference

### Configuration Options

```typescript
interface AnalyticsConfig {
  apiKey?: string;              // Optional API key for future backend integration
  userId?: string;              // Custom user ID (auto-generated if not provided)
  enableCrashReporting?: boolean; // Enable automatic crash reporting (default: true)
  maxEvents?: number;           // Maximum events to store locally (default: 1000)
  storageKey?: string;          // Custom storage key (default: 'centri_events')
}
```

### Methods

#### `trackEvent(eventName: string, properties?: object)`
Track custom events with optional properties.

```javascript
analytics.trackEvent('button_click', { 
  buttonName: 'login',
  screen: 'LoginScreen' 
});
```

#### `trackScreen(screenName: string, properties?: object)`
Track screen views.

```javascript
analytics.trackScreen('HomeScreen', { 
  previousScreen: 'LoginScreen' 
});
```

#### `trackCrash(error: Error, isFatal?: boolean)`
Manually track crashes (automatic crash reporting is enabled by default).

```javascript
try {
  // risky code
} catch (error) {
  analytics.trackCrash(error, false);
}
```

#### `takeScreenshot(viewRef: any)`
Capture and track screenshots.

```javascript
const screenshotUri = await analytics.takeScreenshot(viewRef);
```

#### `setUserId(userId: string)`
Set or update user ID.

```javascript
await analytics.setUserId('user123');
```

#### `setUserProperties(properties: object)`
Set user properties.

```javascript
await analytics.setUserProperties({
  email: 'user@example.com',
  plan: 'premium'
});
```

#### `getAllEvents()`
Retrieve all stored events.

```javascript
const events = await analytics.getAllEvents();
```

#### `clearEvents()`
Clear all stored events.

```javascript
await analytics.clearEvents();
```

## Features

- ✅ **Event Tracking** - Custom events with properties
- ✅ **Screen Tracking** - Automatic screen view tracking
- ✅ **Crash Reporting** - Automatic error detection and manual crash logging
- ✅ **Screenshots** - Capture and track screenshots
- ✅ **Device Info** - Built-in device information collection
- ✅ **Local Storage** - Events stored locally with built-in storage
- ✅ **TypeScript Support** - Full TypeScript definitions
- ✅ **Configurable** - Flexible configuration options

## License

MIT# nexus-insight-sdk
