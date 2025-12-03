import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Animated,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { WebView } from 'react-native-webview';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// ========== UPDATE THIS IP ==========
const ESP32_IP = "http://10.78.48.220";  // ← Your ESP32 IP
const ML_HOST_IP = 'localhost';          // ← Using ADB reverse proxy
// ====================================

export default function GameScreen({ user, onBack }) {
  const [speed, setSpeed] = useState(50);
  const [isConnected, setIsConnected] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('STOP');
  const [buttonPressed, setButtonPressed] = useState('');
  const [mlConnected, setMlConnected] = useState(false);
  const [lastMLDirection, setLastMLDirection] = useState('');
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [detectionBox, setDetectionBox] = useState(null);

  const [pulseAnim] = useState(new Animated.Value(1));

  const streamUrl = `http://localhost:8080/stream`; // ML processed stream via ADB

  useEffect(() => {
    console.log(`🔧 Configuration:`);
    console.log(`   ESP32 IP: ${ESP32_IP}`);
    console.log(`   Stream URL: ${streamUrl}`);
    console.log(`   ML Host IP: ${ML_HOST_IP}`);
    checkConnection();
  }, []);

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
      ]).start(() => setButtonPressed(''));
    }
  }, [buttonPressed]);

  const checkConnection = async () => {
    try {
      console.log(`🔍 Checking ESP32: ${ESP32_IP}`);
      const response = await fetch(`${ESP32_IP}/`, { 
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json'
        }
      });
      
      if (response.ok) {
        setIsConnected(true);
        console.log('✅ ESP32 connected');
        console.log(`📹 Stream URL: ${streamUrl}`);
      }
    } catch (error) {
      setIsConnected(false);
      console.log('❌ ESP32 connection failed:', error.message);
      Alert.alert(
        'Connection Error',
        `Cannot connect to ESP32 at ${ESP32_IP}\n\nMake sure both devices are on the same WiFi network.`,
        [
          {text: 'Retry', onPress: checkConnection},
          {text: 'OK'}
        ]
      );
    }
  };

  const sendCommand = async (cmd) => {
    const url = `${ESP32_IP}/${cmd.toLowerCase()}`;
    console.log(`🎮 Executing: '${cmd}' → ${url}`);
    
    try {
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'Accept': 'text/plain'
        }
      });
      
      if (response.ok) {
        const result = await response.text();
        setCurrentCommand(cmd.toUpperCase());
        setButtonPressed(cmd);
        console.log(`✅ ESP32 Response: ${result}`);
      } else {
        console.warn(`⚠️ ESP32 status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Command error:`, error.message);
      setIsConnected(false);
    }
  };

  // WebSocket for ML directions
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://${ML_HOST_IP}:8765`;
        console.log(`🔌 Attempting WebSocket connection to: ${wsUrl}`);
        console.log(`   Make sure:`);
        console.log(`   1. Python script is running (arrow_det_fixed.py)`);
        console.log(`   2. Both devices on same WiFi`);
        console.log(`   3. PC IP is ${ML_HOST_IP}`);
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✅ ML WebSocket connected successfully!');
          console.log(`   Connected to: ${wsUrl}`);
          setMlConnected(true);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'detection' && data.box) {
              // Update detection box for overlay
              setDetectionBox({
                x: data.box.x,
                y: data.box.y,
                width: data.box.width,
                height: data.box.height,
                label: `${data.direction.toUpperCase()} ${(data.confidence * 100).toFixed(0)}%`,
                direction: data.direction
              });
              setLastMLDirection(data.direction);
              console.log(`🎯 Detection: ${data.direction} (${data.confidence.toFixed(2)})`);
            } else if (data.type === 'detection' && !data.box) {
              // No detection
              setDetectionBox(null);
            } else if (data.type === 'command') {
              // Execute command
              const direction = data.direction;
              console.log(`🧠 ML Command: '${direction}'`);
              setLastMLDirection(direction);
              
              const commandMap = {
                'left': 'left',
                'right': 'right',
                'forward': 'forward',
                'backward': 'backward',
                'stop': 'stop'
              };
              
              const command = commandMap[direction];
              if (command) {
                console.log(`🗺️ Executing ML command: ${command}`);
                sendCommand(command);
              }
            }
          } catch (error) {
            // Fallback for old format (plain text direction)
            const direction = event.data.trim().toLowerCase();
            console.log(`🧠 ML Direction: '${direction}'`);
            setLastMLDirection(direction);
            
            const commandMap = {
              'left': 'left',
              'right': 'right',
              'forward': 'forward',
              'backward': 'backward',
              'stop': 'stop'
            };
            
            const command = commandMap[direction];
            if (command) {
              console.log(`🗺️ Executing ML command: ${command}`);
              sendCommand(command);
            }
          }
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          console.error('   Error details:', JSON.stringify(error));
          console.error(`   Trying to connect to: ws://${ML_HOST_IP}:8765`);
          console.error('   Make sure Python ML script is running!');
          setMlConnected(false);
        };
        
        ws.onclose = (event) => {
          console.log(`❌ ML WebSocket closed (Code: ${event.code}, Reason: ${event.reason})`);
          setMlConnected(false);
          setDetectionBox(null);
          console.log('🔄 Will retry connection in 5 seconds...');
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
        
      } catch (error) {
        console.error('❌ WebSocket failed:', error);
        setMlConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const reloadStream = () => {
    console.log('🔄 Reloading stream...');
    setStreamKey(prev => prev + 1);
    setStreamLoading(true);
    setStreamError(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>◀ MENU</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>🎮 RC CONTROL</Text>
        
        <TouchableOpacity onPress={checkConnection}>
          <View style={[styles.connectionStatus, isConnected ? styles.connected : styles.disconnected]}>
            <Text style={styles.connectionText}>{isConnected ? '📡' : '📵'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>📡</Text>
            <Text style={styles.statusValue}>{isConnected ? 'ESP32' : 'Offline'}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>🧠</Text>
            <Text style={styles.statusValue}>{mlConnected ? 'AI ON' : 'AI OFF'}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusIcon}>🚗</Text>
            <Text style={styles.statusValue}>{currentCommand}</Text>
          </View>
        </View>

        {/* ML Status */}
        <View style={[styles.mlStatus, mlConnected ? styles.mlConnected : styles.mlDisconnected]}>
          <Text style={styles.mlStatusText}>
            {mlConnected ? '🧠 AI VISION: ACTIVE' : '🧠 AI VISION: OFFLINE'}
          </Text>
          {lastMLDirection && mlConnected && (
            <Text style={styles.mlLastDirection}>
              Last: {lastMLDirection.toUpperCase()}
            </Text>
          )}
        </View>

        {/* Camera Stream */}
       

        {/* Camera Stream - ML Processed Feed */}
        <View style={styles.videoSection}>
          <View style={styles.videoHeader}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.videoTitle}>📹 LIVE DETECTION FEED</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>🧠 AI</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.reloadButton} onPress={reloadStream}>
              <Text style={styles.reloadButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.videoSubtitle}>
            {streamUrl} {mlConnected ? '🟢 ML Active' : '⚪ ML Offline'}
          </Text>
          
          <View style={styles.videoContainer}>
            {streamLoading && (
              <View style={styles.streamOverlay}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.streamOverlayText}>Connecting to camera...</Text>
              </View>
            )}

            {streamError && !streamLoading && (
              <View style={styles.streamOverlay}>
                <Text style={styles.streamErrorIcon}>📵</Text>
                <Text style={styles.streamErrorText}>Camera stream unavailable</Text>
                <Text style={styles.streamErrorSubtext}>
                  Check ESP32 connection: {streamUrl}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={reloadStream}>
                  <Text style={styles.retryButtonText}>🔄 Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Direct ESP32 Camera Stream (Lowest Latency) */}
            <WebView
              key={streamKey}
              source={{ uri: streamUrl }}
              style={styles.videoStream}
              javaScriptEnabled={false}
              domStorageEnabled={false}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              scalesPageToFit={true}
              mixedContentMode="always"
              cacheEnabled={false}
              onLoadStart={() => {
                console.log(`📹 Loading ESP32 stream: ${streamUrl}`);
                setStreamLoading(true);
              }}
              onLoad={() => {
                console.log('✅ ESP32 camera stream loaded');
                setStreamLoading(false);
                setStreamError(false);
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.log('❌ Camera stream error:', nativeEvent);
                setStreamLoading(false);
                setStreamError(true);
              }}
            />
            
            {/* Detection boxes are already drawn in the video stream by Python */}
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
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#374151"
            thumbTintColor="#10B981"
          />
        </View>

        {/* Emergency Stop */}
        <TouchableOpacity 
          style={styles.emergencyButton} 
          onPress={() => {
            setSpeed(0);
            sendCommand('stop');
            Alert.alert('🛑 Emergency Stop', 'All systems stopped');
          }}
        >
          <Text style={styles.emergencyIcon}>🛑</Text>
          <Text style={styles.emergencyText}>EMERGENCY STOP</Text>
        </TouchableOpacity>

        {/* Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.controlsTitle}>🎮 MANUAL CONTROLS</Text>
          
          <View style={styles.controlsGrid}>
            {/* Forward */}
            <View style={styles.controlRow}>
              <Animated.View style={[styles.controlButton, styles.forwardButton]}>
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('forward')}
                >
                  <Text style={styles.buttonEmoji}>⬆️</Text>
                  <Text style={styles.buttonLabel}>FWD</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Left, Stop, Right */}
            <View style={styles.controlRow}>
              <Animated.View style={[styles.controlButton, styles.directionButton]}>
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('left')}
                >
                  <Text style={styles.buttonEmoji}>⬅️</Text>
                  <Text style={styles.buttonLabel}>LEFT</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[styles.controlButton, styles.stopButton]}>
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('stop')}
                >
                  <Text style={styles.buttonEmoji}>⏹️</Text>
                  <Text style={styles.buttonLabel}>STOP</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[styles.controlButton, styles.directionButton]}>
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('right')}
                >
                  <Text style={styles.buttonEmoji}>➡️</Text>
                  <Text style={styles.buttonLabel}>RIGHT</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Backward */}
            <View style={styles.controlRow}>
              <Animated.View style={[styles.controlButton, styles.backwardButton]}>
                <TouchableOpacity
                  style={styles.buttonInner}
                  onPress={() => sendCommand('backward')}
                >
                  <Text style={styles.buttonEmoji}>⬇️</Text>
                  <Text style={styles.buttonLabel}>REV</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
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
    padding: 16,
    backgroundColor: '#1E293B',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectionStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connected: {
    backgroundColor: '#10B981',
  },
  disconnected: {
    backgroundColor: '#EF4444',
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
    fontSize: 11,
    fontWeight: 'bold',
  },
  mlStatus: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  mlConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  mlDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  mlStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mlLastDirection: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 4,
  },
  videoSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  aiBadge: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  reloadButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  videoSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  videoContainer: {
    height: height * 0.3,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#334155',
  },
  videoStream: {
    flex: 1,
    backgroundColor: '#000000',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  streamOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    padding: 20,
  },
  streamOverlayText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  streamErrorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  streamErrorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  streamErrorSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  speedSection: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 16,
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
  emergencyButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
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
    marginTop: 16,
    marginBottom: 20,
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
    gap: 12,
  },
  controlButton: {
    borderRadius: 12,
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
  },
  bottomSpacer: {
    height: 20,
  },
    titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});