import React, { useRef, useEffect } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import NexusInsight from '../src/index';

const analytics = new NexusInsight({
  apiKey: 'nxs_test_demo12345678', // Add API key here
  enableCrashReporting: true,
  maxEvents: 500
});

export default function App() {
  const viewRef = useRef<View>(null);

  useEffect(() => {
    analytics.trackScreen('ExampleScreen');
    analytics.setUserProperties({ 
      appVersion: '1.0.0',
      userType: 'demo' 
    });
  }, []);

  const handleButtonPress = () => {
    analytics.trackEvent('button_press', { 
      button: 'example',
      timestamp: Date.now() 
    });
  };

  const takeScreenshot = async () => {
    if (viewRef.current) {
      const uri = await analytics.takeScreenshot(viewRef.current);
      console.log('Screenshot saved:', uri);
    }
  };

  const simulateCrash = () => {
    try {
      throw new Error('Simulated crash for testing');
    } catch (error) {
      analytics.trackCrash(error as Error, false);
    }
  };

  const viewEvents = async () => {
    const events = await analytics.getAllEvents();
    console.log('Total events:', events.length);
    console.log('Recent events:', events.slice(-5));
  };

  return (
    <View ref={viewRef} style={styles.container}>
      <Text style={styles.title}>Nexus Insight Pro Example</Text>
      
      <Button title="Track Event" onPress={handleButtonPress} />
      <Button title="Take Screenshot" onPress={takeScreenshot} />
      <Button title="Simulate Crash" onPress={simulateCrash} />
      <Button title="View Events" onPress={viewEvents} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20
  }
});