import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Animated,
  ScrollView 
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function MainMenuScreen({ user, onNavigate, onLogout }) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [floatAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Pulsing animation for main play button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation for decorative elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const floatingY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const menuItems = [
    {
      title: 'START RACE',
      icon: '🏁',
      color: '#10B981',
      action: () => onNavigate('game'),
      description: 'Control your RC car!'
    },
    {
      title: 'MY PROFILE',
      icon: '👤',
      color: '#3B82F6',
      action: () => onNavigate('profile'),
      description: 'View your stats'
    },
    {
      title: 'SETTINGS',
      icon: '⚙️',
      color: '#8B5CF6',
      action: () => onNavigate('settings'),
      description: 'Customize controls'
    },
  ];

  return (
    <View style={styles.container}>
      {/* Animated background elements */}
      <Animated.View 
        style={[styles.floatingElement, styles.topLeft, { transform: [{ translateY: floatingY }] }]}
      >
        <Text style={styles.floatingEmoji}>🚗</Text>
      </Animated.View>
      <Animated.View 
        style={[styles.floatingElement, styles.topRight, { transform: [{ translateY: floatingY }] }]}
      >
        <Text style={styles.floatingEmoji}>🏎️</Text>
      </Animated.View>
      <Animated.View 
        style={[styles.floatingElement, styles.bottomLeft, { transform: [{ translateY: floatingY }] }]}
      >
        <Text style={styles.floatingEmoji}>🏆</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with user info */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.avatarLarge}>{user.avatar}</Text>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.playerName}>{user.playerName}!</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user.level}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{user.totalRaces}</Text>
                <Text style={styles.statLabel}>Races</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Car status */}
        <View style={styles.carStatus}>
          <Text style={styles.carStatusTitle}>🚗 {user.carName}</Text>
          <View style={styles.carStatusRow}>
            <View style={styles.statusIndicator}>
              <Text style={styles.statusDot}>🟢</Text>
              <Text style={styles.statusText}>READY TO RACE</Text>
            </View>
          </View>
        </View>

        {/* Main play button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={styles.playButton} onPress={() => onNavigate('game')}>
            <Text style={styles.playButtonIcon}>🎮</Text>
            <Text style={styles.playButtonText}>START RACING</Text>
            <Text style={styles.playButtonSubtext}>Take control of {user.carName}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Menu grid */}
        <View style={styles.menuGrid}>
          {menuItems.slice(1).map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: item.color }]}
              onPress={item.action}
            >
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={styles.menuItemTitle}>{item.title}</Text>
              <Text style={styles.menuItemDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionText}>Statistics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.quickActionIcon}>🏅</Text>
            <Text style={styles.quickActionText}>Achievements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={onLogout}>
            <Text style={styles.quickActionIcon}>🚪</Text>
            <Text style={styles.quickActionText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  floatingElement: {
    position: 'absolute',
    zIndex: 1,
  },
  floatingEmoji: {
    fontSize: 30,
    opacity: 0.3,
  },
  topLeft: {
    top: 50,
    left: 30,
  },
  topRight: {
    top: 80,
    right: 30,
  },
  bottomLeft: {
    bottom: 100,
    left: 50,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userInfo: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarLarge: {
    fontSize: 60,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  playerName: {
    fontSize: 24,
    color: '#F59E0B',
    fontWeight: 'bold',
    marginBottom: 15,
    textShadowColor: '#EF4444',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    color: '#10B981',
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  carStatus: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#334155',
  },
  carStatusTitle: {
    fontSize: 18,
    color: '#E2E8F0',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  carStatusRow: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: 'bold',
  },
  playButton: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  playButtonIcon: {
    fontSize: 40,
    marginBottom: 5,
  },
  playButtonText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 5,
  },
  playButtonSubtext: {
    fontSize: 14,
    color: '#D1FAE5',
    fontWeight: '600',
  },
  menuGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  menuItem: {
    flex: 1,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  menuItemIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  menuItemTitle: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 10,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 10,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  quickActionText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  });