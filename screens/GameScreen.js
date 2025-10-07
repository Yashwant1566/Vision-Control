import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Animated,
  Alert,
  ScrollView
} from 'react-native';
import Slider from '@react-native-community/slider';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// Replace with your ESP32's IP address
const ESP32_IP = "http://10.184.205.146"; // Change this to your ESP32's actual IP

export default function GameScreen({ user, onBack }) {
  const [speed, setSpeed] = useState(50);
  const [isConnected, setIsConnected] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [currentCommand, setCurrentCommand] = useState('STOP');
  const [raceTime, setRaceTime] = useState(0);
  const [isRacing, setIsRacing] = useState(false);
  const [buttonPressed, setButtonPressed] = useState('');
  const [esp32IP, setEsp32IP] = useState(ESP32_IP);

  // Animations
  const [pulseAnim] = useState(new Animated.Value(1));
  const [shakeAnim] = useState(new Animated.Value(0));

  // Test connection to ESP32
  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    let interval;
    if (isRacing) {
      interval = setInterval(() => {
        setRaceTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRacing]);

  useEffect(() => {
    if (buttonPressed) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setButtonPressed('');
      });
    }
  }, [buttonPressed]);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${esp32IP}/`, { timeout: 5000 });
      if (response.ok) {
        setIsConnected(true);
        console.log('Connected to ESP32-CAM');
      }
    } catch (error) {
      setIsConnected(false);
      console.log('Connection failed:', error);
      Alert.alert(
        'Connection Error', 
        `Cannot connect to ESP32 at ${esp32IP}. Make sure:\n\n1. ESP32 is connected to WiFi\n2. IP address is correct\n3. Both devices are on same network`,
        [
          {text: 'Retry', onPress: checkConnection},
          {text: 'OK', style: 'cancel'}
        ]
      );
    }
  };

  const sendCommandToESP32 = async (command) => {
    // if (!isConnected) {
    //   Alert.alert('Not Connected', 'Please check ESP32 connection');
    //   return;
    // }  

    try {
      const response = await fetch(`${esp32IP}/${command.toLowerCase()}`, {
        method: 'GET',
        timeout: 3000
      });
      
      if (response.ok) {
        const result = await response.text();
        console.log(`ESP32 Response: ${result}`);
        return true;
      }
    } catch (error) {
      console.error(`Error sending ${command}:`, error);
      setIsConnected(false);
      Alert.alert('Command Failed', `Could not send ${command} to ESP32`);
      return false;
    }
  };

  const sendCommand = async (cmd) => {
    const success = await sendCommandToESP32(cmd);
    if (success) {
      setCurrentCommand(cmd.toUpperCase());
      setButtonPressed(cmd);
      
      if (!isRacing && cmd !== 'stop') {
        setIsRacing(true);
      }
      
      console.log(`Command: ${cmd}, Speed: ${Math.round(speed)}`);
    }
  };

  const emergencyStop = async () => {
    setSpeed(0);
    await sendCommand('stop');
    setIsRacing(false);
    
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
    
    Alert.alert('Emergency Stop!', 'All systems stopped for safety.');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const changeIPAddress = () => {
    Alert.prompt(
      'Change ESP32 IP Address',
      'Enter the IP address of your ESP32:',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'OK',
          onPress: (ip) => {
            if (ip) {
              setEsp32IP(`http://${ip}`);
              setIsConnected(false);
              setTimeout(checkConnection, 1000);
            }
          }
        }
      ],
      'plain-text',
      esp32IP.replace('http://', '')
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>◀ MENU</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🎮 RC CONTROL</Text>
        </View>
        
        <TouchableOpacity onPress={changeIPAddress}>
          <View style={[styles.connectionStatus, isConnected ? styles.connected : styles.disconnected]}>
            <Text style={styles.connectionText}>
              {isConnected ? '📡' : '📵'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>🔋</Text>
            <Text style={styles.statusValue}>{batteryLevel}%</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>⏱️</Text>
            <Text style={styles.statusValue}>{formatTime(raceTime)}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>🚗</Text>
            <Text style={styles.statusValue}>{user.carName}</Text>
          </View>
        </View>

        {/* Video Stream */}
        <View style={styles.videoSection}>
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: `${esp32IP}/stream` }}
              style={styles.videoStream}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('WebView error: ', nativeEvent);
                setIsConnected(false);
              }}
              onLoadEnd={() => setIsConnected(true)}
            />
            
            {/* Video Overlay */}
            <View style={styles.videoOverlay}>
              <View style={styles.speedIndicator}>
                <Text style={styles.speedValue}>{Math.round(speed)}</Text>
                <Text style={styles.speedUnit}>%</Text>
              </View>
              
              <View style={styles.commandIndicator}>
                <Text style={styles.commandText}>
                  {currentCommand === 'FORWARD' && '⬆️'}
                  {currentCommand === 'BACKWARD' && '⬇️'}
                  {currentCommand === 'LEFT' && '⬅️'}
                  {currentCommand === 'RIGHT' && '➡️'}
                  {currentCommand === 'STOP' && '⏹️'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Speed Control */}
        <View style={styles.speedSection}>
          <Text style={styles.speedLabel}>🚀 SPEED: {Math.round(speed)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={speed}
            onValueChange={setSpeed}
            minimumTrackTintColor="#4CAF50"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#4CAF50"
          />
          <View style={styles.speedMarkers}>
            <Text style={styles.speedMarker}>0</Text>
            <Text style={styles.speedMarker}>50</Text>
            <Text style={styles.speedMarker}>100</Text>
          </View>
        </View>

        {/* Emergency Stop */}
        <Animated.View style={[styles.emergencySection, { transform: [{ translateX: shakeAnim }] }]}>
          <TouchableOpacity style={styles.emergencyButton} onPress={emergencyStop}>
            <Text style={styles.emergencyIcon}>🛑</Text>
            <Text style={styles.emergencyText}>EMERGENCY STOP</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Direction Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.controlsTitle}>🎮 DIRECTION CONTROLS</Text>
          
          <View style={styles.controlsGrid}>
            {/* Forward Button */}
            <View style={styles.controlRow}>
              <Animated.View 
                style={[
                  styles.controlButton,
                  styles.forwardButton,
                  buttonPressed === 'forward' && { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('forward')}
                  onPressIn={() => setButtonPressed('forward')}
                >
                  <Text style={styles.buttonEmoji}>⬆️</Text>
                  <Text style={styles.buttonLabel}>FWD</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Middle Row - Left, Stop, Right */}
            <View style={styles.controlRow}>
              <Animated.View 
                style={[
                  styles.controlButton,
                  styles.directionButton,
                  buttonPressed === 'left' && { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('left')}
                  onPressIn={() => setButtonPressed('left')}
                >
                  <Text style={styles.buttonEmoji}>⬅️</Text>
                  <Text style={styles.buttonLabel}>LEFT</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.controlButton,
                  styles.stopButton,
                  buttonPressed === 'stop' && { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('stop')}
                  onPressIn={() => setButtonPressed('stop')}
                >
                  <Text style={styles.buttonEmoji}>⏹️</Text>
                  <Text style={styles.buttonLabel}>STOP</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.controlButton,
                  styles.directionButton,
                  buttonPressed === 'right' && { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('right')}
                  onPressIn={() => setButtonPressed('right')}
                >
                  <Text style={styles.buttonEmoji}>➡️</Text>
                  <Text style={styles.buttonLabel}>RIGHT</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Backward Button */}
            <View style={styles.controlRow}>
              <Animated.View 
                style={[
                  styles.controlButton,
                  styles.backwardButton,
                  buttonPressed === 'backward' && { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('backward')}
                  onPressIn={() => setButtonPressed('backward')}
                >
                  <Text style={styles.buttonEmoji}>⬇️</Text>
                  <Text style={styles.buttonLabel}>REV</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Connection Info */}
        <View style={styles.connectionSection}>
          <Text style={styles.connectionLabel}>📡 ESP32 Connection</Text>
          <Text style={styles.ipText}>{esp32IP}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={checkConnection}>
            <Text style={styles.retryText}>🔄 Test Connection</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectionStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  connected: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  disconnected: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  connectionText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  videoSection: {
    margin: 16,
  },
  videoContainer: {
    height: height * 0.25,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoStream: {
    flex: 1,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  speedIndicator: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  speedValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  speedUnit: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  commandIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  commandText: {
    fontSize: 24,
  },
  speedSection: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  speedLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  speedMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  speedMarker: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emergencySection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  emergencyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsSection: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  controlsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  controlsGrid: {
    alignItems: 'center',
    gap: 12,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonInner: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  forwardButton: {
    backgroundColor: '#10B981',
  },
  backwardButton: {
    backgroundColor: '#EF4444',
  },
  directionButton: {
    backgroundColor: '#3B82F6',
  },
  stopButton: {
    backgroundColor: '#F59E0B',
  },
  buttonEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  connectionSection: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ipText: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});