import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/config';

function TabBg() {
  return (
    <LinearGradient
      colors={['#0f0d0a', '#0a0a0f']}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarBackground: () => <TabBg />,
        tabBarStyle: {
          borderTopColor: 'rgba(255,153,51,0.2)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: 'transparent',
          elevation: 20,
          shadowColor: '#FF9933',
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Text',    tabBarIcon: ({ color, size }) => <Ionicons name="language" size={size} color={color} /> }} />
      <Tabs.Screen name="camera"  options={{ title: 'Camera',  tabBarIcon: ({ color, size }) => <Ionicons name="camera"   size={size} color={color} /> }} />
      <Tabs.Screen name="voice"   options={{ title: 'Voice',   tabBarIcon: ({ color, size }) => <Ionicons name="mic"      size={size} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, size }) => <Ionicons name="time"     size={size} color={color} /> }} />
    </Tabs>
  );
}
