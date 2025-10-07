import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import MainMenuScreen from './screens/MainMenuScreen';
import GameScreen from './screens/GameScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [user, setUser] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Hide status bar for full gaming experience
    StatusBar.setHidden(true, 'slide');
    
    // Check for existing login
    checkExistingLogin();
    
    // Splash screen timer
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        if (!user) {
          setCurrentScreen('login');
        } else {
          setCurrentScreen('menu');
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const checkExistingLogin = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('rcCarUser');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.log('Error checking login:', error);
    }
  };

  const handleLogin = async (userData) => {
    try {
      await AsyncStorage.setItem('rcCarUser', JSON.stringify(userData));
      setUser(userData);
      setCurrentScreen('menu');
    } catch (error) {
      Alert.alert('Error', 'Failed to save login data');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('rcCarUser');
      setUser(null);
      setCurrentScreen('login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen fadeAnim={fadeAnim} />;
      case 'login':
        return <LoginScreen onLogin={handleLogin} />;
      case 'menu':
        return <MainMenuScreen 
          user={user} 
          onNavigate={setCurrentScreen}
          onLogout={handleLogout}
        />;
      case 'game':
        return <GameScreen 
          user={user} 
          onBack={() => setCurrentScreen('menu')} 
        />;
      case 'settings':
        return <SettingsScreen 
          user={user}
          onBack={() => setCurrentScreen('menu')}
        />;
      case 'profile':
        return <ProfileScreen 
          user={user}
          onBack={() => setCurrentScreen('menu')}
          onLogout={handleLogout}
        />;
      default:
        return <MainMenuScreen 
          user={user} 
          onNavigate={setCurrentScreen}
          onLogout={handleLogout}
        />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});