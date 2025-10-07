import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert,
  Dimensions 
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ user, onBack, onLogout }) {
  const [selectedTab, setSelectedTab] = useState('stats');

  const achievements = [
    { id: 1, title: 'First Drive', description: 'Complete your first race', icon: '🏁', unlocked: true },
    { id: 2, title: 'Speed Demon', description: 'Reach maximum speed', icon: '⚡', unlocked: false },
    { id: 3, title: 'Navigator', description: 'Complete 10 races', icon: '🧭', unlocked: false },
    { id: 4, title: 'Time Master', description: 'Race for 1 hour total', icon: '⏱️', unlocked: false },
    { id: 5, title: 'Explorer', description: 'Use all control modes', icon: '🗺️', unlocked: true },
    { id: 6, title: 'Champion', description: 'Complete 50 races', icon: '🏆', unlocked: false },
  ];

  const stats = [
    { label: 'Total Race Time', value: '2h 45m', icon: '⏱️' },
    { label: 'Fastest Speed', value: '85 km/h', icon: '🚀' },
    { label: 'Total Distance', value: '12.3 km', icon: '📏' },
    { label: 'Commands Sent', value: '1,247', icon: '🎮' },
    { label: 'Emergency Stops', value: '3', icon: '🛑' },
    { label: 'Connection Uptime', value: '98.5%', icon: '📡' },
  ];

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout',
      `Are you sure you want to logout, ${user.playerName}? Your progress will be saved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: onLogout
        }
      ]
    );
  };

  const StatCard = ({ label, value, icon }) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const AchievementCard = ({ achievement }) => (
    <View style={[
      styles.achievementCard,
      achievement.unlocked && styles.unlockedAchievement
    ]}>
      <Text style={[
        styles.achievementIcon,
        !achievement.unlocked && styles.lockedIcon
      ]}>
        {achievement.unlocked ? achievement.icon : '🔒'}
      </Text>
      <View style={styles.achievementInfo}>
        <Text style={[
          styles.achievementTitle,
          !achievement.unlocked && styles.lockedText
        ]}>
          {achievement.title}
        </Text>
        <Text style={[
          styles.achievementDescription,
          !achievement.unlocked && styles.lockedText
        ]}>
          {achievement.description}
        </Text>
      </View>
      {achievement.unlocked && (
        <View style={styles.unlockedBadge}>
          <Text style={styles.unlockedText}>✓</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>◀ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👤 PROFILE</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarLarge}>{user.avatar}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LV{user.level}</Text>
            </View>
          </View>
          <Text style={styles.playerName}>{user.playerName}</Text>
          <Text style={styles.carName}>🚗 {user.carName}</Text>
          <Text style={styles.joinDate}>
            Racing since {new Date(user.joinDate).toLocaleDateString()}
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'stats' && styles.activeTab]}
            onPress={() => setSelectedTab('stats')}
          >
            <Text style={[styles.tabText, selectedTab === 'stats' && styles.activeTabText]}>
              📊 STATS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
            onPress={() => setSelectedTab('achievements')}
          >
            <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>
              🏆 ACHIEVEMENTS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {selectedTab === 'stats' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>🎮 RACING STATISTICS</Text>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </View>

            {/* Progress Section */}
            <Text style={styles.sectionTitle}>📈 PROGRESS</Text>
            <View style={styles.progressSection}>
              <View style={styles.progressCard}>
                <Text style={styles.progressTitle}>Next Level Progress</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '60%' }]} />
                </View>
                <Text style={styles.progressText}>60% to Level {user.level + 1}</Text>
              </View>

              <View style={styles.progressCard}>
                <Text style={styles.progressTitle}>Racing Milestones</Text>
                <View style={styles.milestones}>
                  <View style={styles.milestone}>
                    <Text style={styles.milestoneIcon}>✅</Text>
                    <Text style={styles.milestoneText}>First Race Complete</Text>
                  </View>
                  <View style={styles.milestone}>
                    <Text style={styles.milestoneIcon}>⏳</Text>
                    <Text style={styles.milestoneText}>10 Races (Progress: {user.totalRaces}/10)</Text>
                  </View>
                  <View style={styles.milestone}>
                    <Text style={styles.milestoneIcon}>⏳</Text>
                    <Text style={styles.milestoneText}>100km Total Distance</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedTab === 'achievements' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>🏆 ACHIEVEMENTS</Text>
            <View style={styles.achievementProgress}>
              <Text style={styles.achievementProgressText}>
                {achievements.filter(a => a.unlocked).length} of {achievements.length} unlocked
              </Text>
              <View style={styles.achievementProgressBar}>
                <View style={[
                  styles.achievementProgressFill, 
                  { width: `${(achievements.filter(a => a.unlocked).length / achievements.length) * 100}%` }
                ]} />
              </View>
            </View>
            <View style={styles.achievementsList}>
              {achievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>⚡ QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionText}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionIcon}>🔄</Text>
              <Text style={styles.quickActionText}>Sync Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionIcon}>🎨</Text>
              <Text style={styles.quickActionText}>Change Avatar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Text style={styles.quickActionIcon}>📝</Text>
              <Text style={styles.quickActionText}>Edit Profile</Text>
            </TouchableOpacity>
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
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarLarge: {
    fontSize: 80,
  },
  levelBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerName: {
    fontSize: 24,
    color: '#F59E0B',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  carName: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 10,
  },
  joinDate: {
    fontSize: 14,
    color: '#94A3B8',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 15,
    width: (width - 50) / 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 30,
  },
  progressCard: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressTitle: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  milestones: {
    gap: 8,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  milestoneIcon: {
    fontSize: 16,
  },
  milestoneText: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  achievementProgress: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  achievementProgressText: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  achievementProgressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#374151',
    borderRadius: 5,
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 5,
  },
  achievementsList: {
    gap: 10,
    marginBottom: 30,
  },
  achievementCard: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  unlockedAchievement: {
    borderColor: '#10B981',
    backgroundColor: '#1E293B',
  },
  achievementIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  lockedIcon: {
    opacity: 0.5,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#94A3B8',
  },
  lockedText: {
    opacity: 0.5,
  },
  unlockedBadge: {
    backgroundColor: '#10B981',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    backgroundColor: '#1E293B',
    borderRadius: 15,
    padding: 15,
    width: (width - 50) / 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 50,
  },
});