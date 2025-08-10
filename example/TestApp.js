// Simple test app to see OTA changes
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import NexusInsight from '../src/index';

export default function TestApp() {
  const [message, setMessage] = useState('Waiting for OTA updates...');
  const [bgColor, setBgColor] = useState('#f0f0f0');
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    const analytics = new NexusInsight({
      apiKey: 'nxs_test_demo12345678',
      dashboardUrl: 'http://localhost:3000'
    });

    // Listen for OTA updates
    analytics.onOTAUpdate = (update) => {
      setMessage(`🚀 OTA Update Applied: v${update.version}`);
      setBgColor('#d4edda'); // Green background
      setVersion(update.version);
      
      // Execute any visual changes from OTA
      if (update.config.code) {
        try {
          // Safe execution of OTA code
          eval(update.config.code.replace('AsyncStorage', '{}').replace('console.log', 'setMessage'));
        } catch (e) {
          console.log('OTA code execution:', e);
        }
      }
    };

    // Track app start
    analytics.trackEvent('test_app_started');
  }, []);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: bgColor,
      padding: 20 
    }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        OTA Test App
      </Text>
      
      <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
        {message}
      </Text>
      
      <Text style={{ fontSize: 16, marginBottom: 30 }}>
        Version: {version}
      </Text>
      
      <Button 
        title="Reset" 
        onPress={() => {
          setMessage('Waiting for OTA updates...');
          setBgColor('#f0f0f0');
        }}
      />
      
      <Text style={{ 
        fontSize: 12, 
        color: '#666', 
        textAlign: 'center', 
        marginTop: 30 
      }}>
        Make changes to SDK files to see instant updates!
      </Text>
    </View>
  );
}