import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Switch,
  Slider,
  Alert 
} from 'react-native';

export default function SettingsScreen({ user, onBack }) {
  const [settings, setSettings] = useState({
    soundEffects: true,
    vibration: true,
    autoStop: false,
    sensitivity: 50,
    maxSpeed: 80,
    nightMode: true,
    showSpeed: true,
    emergencyMode: true,
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setSettings({
              soundEffects: true,
              vibration: true,
              autoStop: false,
              sensitivity: 50,
              maxSpeed: 80,
              nightMode: true,
              showSpeed: true,
              emergencyMode: true,
            });
          }
        }
      ]
    );
  };

  const SettingItem = ({ title, description, children, icon }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingHeader}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingIcon}>{icon}</Text>
          <View>
            <Text style={styles.settingTitle}>{title}</Text>
            {description && (
              <Text style={styles.settingDescription}>{description}</Text>
            )}
          </View>
        </View>
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>◀ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ SETTINGS</Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetSettings}>
          <Text style={styles.resetButtonText}>RESET</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Control Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 CONTROL SETTINGS</Text>
          
          <SettingItem
            title="Control Sensitivity"
            description="How responsive the controls are"
            icon="🎯"
          >
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{Math.round(settings.sensitivity)}%</Text>
              <Slider
                style={styles.slider}
                value={settings.sensitivity}
                onValueChange={(value) => updateSetting('sensitivity', value)}
                minimumValue={10}
                maximumValue={100}
                minimumTrackTintColor="#10B981"
                maximumTrackTintColor="#374151"
                thumbTintColor="#10B981"
              />
            </View>
          </SettingItem>

          <SettingItem
            title="Maximum Speed Limit"
            description="Safety limit for car speed"
            icon="🚀"
          >
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{Math.round(settings.maxSpeed)}%</Text>
              <Slider
                style={styles.slider}
                value={settings.maxSpeed}
                onValueChange={(value) => updateSetting('maxSpeed', value)}
                minimumValue={20}
                maximumValue={100}
                minimumTrackTintColor="#F59E0B"
                maximumTrackTintColor="#374151"
                thumbTintColor="#F59E0B"
              />
            </View>
          </SettingItem>

          <SettingItem
            title="Auto-Stop Timer"
            description="Stop car automatically after 30 seconds of inactivity"
            icon="⏰"
          >
            <Switch
              value={settings.autoStop}
              onValueChange={(value) => updateSetting('autoStop', value)}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={settings.autoStop ? '#fff' : '#9CA3AF'}
            />
          </SettingItem>
        </View>

        {/* Audio & Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 AUDIO & FEEDBACK</Text>
          
          <SettingItem
            title="Sound Effects"
            description="Engine sounds and button clicks"
            icon="🎵"
          >
            <Switch
              value={settings.soundEffects}
              onValueChange={(value) => updateSetting('soundEffects', value)}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={settings.soundEffects ? '#fff' : '#9CA3AF'}
            />
          </SettingItem>

          <SettingItem
            title="Vibration Feedback"
            description="Haptic feedback for button presses"
            icon="📳"
          >
            <Switch
              value={settings.vibration}
              onValueChange={(value) => updateSetting('vibration', value)}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={settings.vibration ? '#fff' : '#9CA3AF'}
            />
          </SettingItem>
        </View>

        {/* Display Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 DISPLAY SETTINGS</Text>
          
          <SettingItem
            title="Night Mode"
            description="Dark theme for better visibility"
            icon="🌙"
          >
            <Switch
              value={settings.nightMode}
              onValueChange={(value) => updateSetting('nightMode', value)}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={settings.nightMode ? '#fff' : '#9CA3AF'}
            />
          </SettingItem>

          <SettingItem
            title="Show Speed Overlay"
            description="Display speed on video stream"
            icon="🏁"
          >
            <Switch
              value={settings.showSpeed}
              onValueChange={(value) => updateSetting('showSpeed', value)}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={settings.showSpeed ? '#fff' : '#9CA3AF'}
            />
          </SettingItem>
        </View>

        {/* Safety Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ SAFETY SETTINGS</Text>
          
          <SettingItem
            title="Emergency Mode"
            description="Enable emergency stop features"
            icon="🚨"
          >
            <Switch
              value={settings.emergencyMode}
              onValueChange={(value) => updateSetting('emergencyMode', value)}
              trackColor={{ false: '#374151', true: '#EF4444' }}
              thumbColor={settings.emergencyMode ? '#fff' : '#9CA3AF'}
            />
          </SettingItem>
        </View>

        {/* Connection Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 CONNECTION</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonIcon}>🔄</Text>
            <View>
              <Text style={styles.actionButtonTitle}>Reconnect to Car</Text>
              <Text style={styles.actionButtonDescription}>Reset connection to {user.carName}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonIcon}>📊</Text>
            <View>
              <Text style={styles.actionButtonTitle}>Connection Test</Text>
              <Text style={styles.actionButtonDescription}>Check signal strength and latency</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonIcon}>🔧</Text>
            <View>
              <Text style={styles.actionButtonTitle}>Advanced Settings</Text>
              <Text style={styles.actionButtonDescription}>Configure network and protocols</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ ABOUT</Text>
          
          <View style={styles.aboutInfo}>
            <Text style={styles.aboutText}>RC Racer v1.0</Text>
            <Text style={styles.aboutText}>Connected to: {user.carName}</Text>
            <Text style={styles.aboutText}>Player: {user.playerName}</Text>
            <Text style={styles.aboutText}>© 2024 RC Gaming App</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingItem: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  sliderContainer: {
    alignItems: 'center',
    width: 120,
  },
  sliderValue: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  slider: {
    width: 100,
    height: 30,
  },
  actionButton: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  actionButtonTitle: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: 'bold',
  },
  actionButtonDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  aboutInfo: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  aboutText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 5,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 50,
  },
});