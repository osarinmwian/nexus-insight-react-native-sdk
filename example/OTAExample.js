// OTA Update Example
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, ScrollView } from 'react-native';
import NexusInsight from '../src/index';

const OTAExample = () => {
  const [analytics, setAnalytics] = useState(null);
  const [otaHistory, setOtaHistory] = useState([]);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [updateStatus, setUpdateStatus] = useState('No updates');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [appliedFeatures, setAppliedFeatures] = useState([]);

  useEffect(() => {
    initializeSDK();
  }, []);

  const initializeSDK = async () => {
    try {
      // Initialize with OTA-enabled SDK
      const sdk = new NexusInsight({
        apiKey: 'nxs_test_demo12345678',
        dashboardUrl: 'http://localhost:3000'
      });

      setAnalytics(sdk);
      
      // Get current version and history
      const history = await sdk.getOTAHistory();
      setOtaHistory(history);
      
      // Set up real-time update listener
      sdk.onOTAUpdate = (update) => {
        setLastUpdate(update);
        setUpdateStatus(`✅ Applied v${update.version}`);
        setAppliedFeatures(update.config.features || []);
        Alert.alert('🚀 OTA Update Applied!', `Version ${update.version} is now active`);
      };
      
      // Track initialization
      await sdk.trackEvent('ota_example_initialized');
      
      // Start checking for updates every 10 seconds (for demo)
      setInterval(async () => {
        await sdk.checkOTAUpdates();
      }, 10000);
      
    } catch (error) {
      console.error('SDK initialization failed:', error);
    }
  };

  const checkForUpdates = async () => {
    if (!analytics) return;
    
    try {
      await analytics.checkOTAUpdates();
      Alert.alert('Update Check', 'Checked for updates successfully');
      
      // Refresh history
      const history = await analytics.getOTAHistory();
      setOtaHistory(history);
    } catch (error) {
      Alert.alert('Error', 'Failed to check for updates');
    }
  };

  const performRollback = async () => {
    if (!analytics) return;
    
    try {
      const success = await analytics.rollbackOTA();
      Alert.alert(
        'Rollback', 
        success ? 'Rollback successful' : 'Rollback failed'
      );
      
      if (success) {
        const history = await analytics.getOTAHistory();
        setOtaHistory(history);
      }
    } catch (error) {
      Alert.alert('Error', 'Rollback failed');
    }
  };

  const testFeatureFlags = async () => {
    if (!analytics) return;
    
    try {
      const FeatureFlags = require('../src/feature-flags').default;
      
      const features = [
        'enhanced_tracking',
        'auto_screenshots', 
        'crash_analytics',
        'performance_monitoring'
      ];
      
      const results = {};
      for (const feature of features) {
        results[feature] = await FeatureFlags.isEnabled(feature);
      }
      
      Alert.alert(
        'Feature Flags Status',
        Object.entries(results)
          .map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`)
          .join('\n')
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to check feature flags');
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        🚀 OTA Update Demo
      </Text>
      
      <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Current Status
        </Text>
        <Text>SDK Version: {currentVersion}</Text>
        <Text>Updates Applied: {otaHistory.filter(h => h.success).length}</Text>
        <Text>Last Check: {new Date().toLocaleTimeString()}</Text>
        <Text style={{ color: lastUpdate ? '#28a745' : '#6c757d', fontWeight: 'bold' }}>
          {updateStatus}
        </Text>
        {lastUpdate && (
          <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
            Last update: {new Date(lastUpdate.timestamp).toLocaleString()}
          </Text>
        )}
      </View>
      
      {appliedFeatures.length > 0 && (
        <View style={{ backgroundColor: '#d4edda', padding: 15, borderRadius: 8, marginBottom: 20, borderLeft: '4px solid #28a745' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#155724', marginBottom: 10 }}>
            🎆 Active Features (via OTA)
          </Text>
          {appliedFeatures.map((feature, index) => (
            <Text key={index} style={{ color: '#155724', marginBottom: 3 }}>
              • {feature.replace('_', ' ').toUpperCase()}
            </Text>
          ))}
        </View>
      )}

      <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
          OTA Controls
        </Text>
        
        <Button
          title="🔄 Check for Updates"
          onPress={checkForUpdates}
          color="#007bff"
        />
        
        <View style={{ marginVertical: 10 }} />
        
        <Button
          title="🔧 Test Feature Flags"
          onPress={testFeatureFlags}
          color="#28a745"
        />
        
        <View style={{ marginVertical: 10 }} />
        
        <Button
          title="↩️ Rollback Update"
          onPress={performRollback}
          color="#dc3545"
        />
      </View>

      {otaHistory.length > 0 && (
        <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
            📊 Update History
          </Text>
          {otaHistory.slice(0, 5).map((update, index) => (
            <View key={index} style={{ 
              padding: 10, 
              marginBottom: 10, 
              backgroundColor: update.success ? '#d4edda' : '#f8d7da',
              borderRadius: 4,
              borderLeft: `4px solid ${update.success ? '#28a745' : '#dc3545'}`
            }}>
              <Text style={{ fontWeight: 'bold' }}>
                {update.success ? '✅' : '❌'} Version {update.version}
              </Text>
              <Text style={{ fontSize: 12, color: '#666' }}>
                {new Date(update.appliedAt).toLocaleString()}
              </Text>
              {update.error && (
                <Text style={{ fontSize: 12, color: '#dc3545', marginTop: 5 }}>
                  Error: {update.error}
                </Text>
              )}
              {update.rollbackFrom && (
                <Text style={{ fontSize: 12, color: '#ffc107', marginTop: 5 }}>
                  Rolled back from: {update.rollbackFrom}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={{ backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          💡 How it Works
        </Text>
        <Text style={{ marginBottom: 5 }}>• Updates check automatically every 6 hours</Text>
        <Text style={{ marginBottom: 5 }}>• Feature flags enable/disable features remotely</Text>
        <Text style={{ marginBottom: 5 }}>• Safe code execution in sandboxed environment</Text>
        <Text style={{ marginBottom: 5 }}>• Automatic rollback on failures</Text>
        <Text style={{ marginBottom: 5 }}>• Device targeting and scheduling support</Text>
      </View>
    </ScrollView>
  );
};

export default OTAExample;