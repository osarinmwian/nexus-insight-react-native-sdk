import React, { useRef, useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import CentriAnalytics from './index';

const analytics = new CentriAnalytics();

export default function ExampleApp() {
  const viewRef = useRef();

  useEffect(() => {
    analytics.trackScreen('ExampleScreen');
  }, []);

  const handleButtonPress = () => {
    analytics.trackEvent('button_press', { button: 'example' });
  };

  const takeScreenshot = () => {
    analytics.takeScreenshot(viewRef);
  };

  const simulateCrash = () => {
    try {
      throw new Error('Simulated crash for testing');
    } catch (error) {
      analytics.trackCrash(error);
    }
  };

  return (
    <View ref={viewRef} style={{ flex: 1, padding: 20 }}>
      <Text>Centri Analytics Example</Text>
      <Button title="Track Event" onPress={handleButtonPress} />
      <Button title="Take Screenshot" onPress={takeScreenshot} />
      <Button title="Simulate Crash" onPress={simulateCrash} />
    </View>
  );
}