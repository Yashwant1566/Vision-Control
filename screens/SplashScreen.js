import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ fadeAnim }) {
  const [scaleAnim] = useState(new Animated.Value(0.5));
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Car animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      ),
    ]).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Background gradient effect */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Animated car icon */}
        <Animated.View
          style={[
            styles.carContainer,
            {
              transform: [
                { scale: scaleAnim },
                { rotate }
              ]
            }
          ]}
        >
          <Text style={styles.carEmoji}>🏎️</Text>
        </Animated.View>

        {/* App title */}
        <Text style={styles.title}>RC RACER</Text>
        <Text style={styles.subtitle}>REMOTE CONTROL ADVENTURE</Text>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Starting engines...</Text>
          <View style={styles.loadingBar}>
            <Animated.View 
              style={[
                styles.loadingProgress,
                {
                  width: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Bottom decoration */}
      <View style={styles.bottomDecoration}>
        <Text style={styles.decorativeText}>🏁 GET READY TO RACE 🏁</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  background: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: '#1E293B',
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    // Add radial gradient effect with shadows
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 50,
    elevation: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  carContainer: {
    marginBottom: 40,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  carEmoji: {
    fontSize: 100,
    textAlign: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 3,
    textShadowColor: '#EF4444',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 60,
    letterSpacing: 2,
    fontWeight: '600',
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#3B82F6',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  loadingBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  decorativeText: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});