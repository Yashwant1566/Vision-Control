import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Alert,
  Animated 
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ onLogin }) {
  const [playerName, setPlayerName] = useState('');
  const [carName, setCarName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🧒');
  const [buttonScale] = useState(new Animated.Value(1));

  const avatars = ['🧒', '👦', '👧', '🤖', '👾', '🦸‍♂️', '🦸‍♀️', '🚀'];

  const handleLogin = () => {
    if (playerName.trim() === '') {
      Alert.alert('Oops!', 'Please enter your name, young racer!');
      return;
    }

    if (carName.trim() === '') {
      Alert.alert('Hold on!', 'Your car needs a cool name!');
      return;
    }

    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Create user object
    const userData = {
      playerName: playerName.trim(),
      carName: carName.trim(),
      avatar: selectedAvatar,
      level: 1,
      totalRaces: 0,
      bestTime: null,
      joinDate: new Date().toISOString(),
    };

    setTimeout(() => {
      onLogin(userData);
    }, 200);
  };

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <View style={styles.backgroundPattern}>
        <Text style={styles.backgroundEmoji}>🏎️</Text>
        <Text style={styles.backgroundEmoji}>🏁</Text>
        <Text style={styles.backgroundEmoji}>🏆</Text>
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>WELCOME RACER!</Text>
          <Text style={styles.subtitle}>Let's set up your racing profile</Text>
        </View>

        {/* Avatar selection */}
        <View style={styles.avatarSection}>
          <Text style={styles.sectionTitle}>Choose your avatar:</Text>
          <View style={styles.avatarGrid}>
            {avatars.map((avatar, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.avatarButton,
                  selectedAvatar === avatar && styles.selectedAvatar
                ]}
                onPress={() => setSelectedAvatar(avatar)}
              >
                <Text style={styles.avatarText}>{avatar}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input fields */}
        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Your Name:</Text>
            <TextInput
              style={styles.input}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Enter your name"
              placeholderTextColor="#64748B"
              maxLength={20}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Car Name:</Text>
            <TextInput
              style={styles.input}
              value={carName}
              onChangeText={setCarName}
              placeholder="Name your car"
              placeholderTextColor="#64748B"
              maxLength={20}
            />
          </View>
        </View>

        {/* Start button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity style={styles.startButton} onPress={handleLogin}>
            <Text style={styles.startButtonText}>🚀 START RACING 🚀</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick start option */}
        <TouchableOpacity 
          style={styles.quickStartButton}
          onPress={() => {
            setPlayerName('Young Racer');
            setCarName('Lightning Bolt');
            setTimeout(handleLogin, 100);
          }}
        >
          <Text style={styles.quickStartText}>⚡ Quick Start ⚡</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  backgroundPattern: {
    position: 'absolute',
    width: width,
    height: height,
    justifyContent: 'space-around',
    alignItems: 'center',
    opacity: 0.1,
  },
  backgroundEmoji: {
    fontSize: 80,
    color: '#3B82F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    justifyContent: 'space-around',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: '#EF4444',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
  },
  avatarSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#3B82F6',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  avatarButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    fontSize: 30,
  },
  inputSection: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 18,
    color: '#E2E8F0',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#334155',
    color: '#E2E8F0',
    fontSize: 18,
    padding: 15,
    borderRadius: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#475569',
  },
  startButton: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  startButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  quickStartButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  quickStartText: {
    fontSize: 16,
    color: '#D1D5DB',
    fontWeight: '600',
  },
});