import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, useNavigationContainerRef, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from './src/components/Avatar';
import { ToastProvider, useToast } from './src/components/Toast';
import { VideoMenuProvider } from './src/components/VideoMenu';
import type { RootStackParamList } from './src/navigation/types';
import ChannelScreen from './src/screens/ChannelScreen';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import PermissionScreen, { LoadingScreen } from './src/screens/PermissionScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import SearchScreen from './src/screens/SearchScreen';
import ShortsScreen from './src/screens/ShortsScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import WatchOverlay from './src/screens/WatchScreen';
import { LibraryProvider, useLibrary } from './src/state/LibraryContext';
import { PlayerProvider } from './src/state/PlayerContext';
import { UserDataProvider, useUserData } from './src/state/UserDataContext';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const TAB_ROUTES = ['Home', 'Shorts', 'Create', 'Subscriptions', 'You'];
/** React Navigation's default bottom tab bar height, before the safe-area inset. */
const TAB_BAR_HEIGHT = 49;

const navTheme: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.text },
};

function Empty() {
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

function Tabs() {
  const toast = useToast();
  const { data } = useUserData();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.text,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} /> }}
      />
      <Tab.Screen
        name="Shorts"
        component={ShortsScreen}
        options={{ tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'flash' : 'flash-outline'} size={24} color={color} /> }}
      />
      <Tab.Screen
        name="Create"
        component={Empty}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            toast('Uploading is off — LowTube only plays videos already on your phone');
          },
        }}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View style={styles.create}>
              <Ionicons name="add" size={26} color={colors.text} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{ tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'albums' : 'albums-outline'} size={24} color={color} /> }}
      />
      <Tab.Screen
        name="You"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.youRing, focused && { borderColor: colors.text }]}>
              <Avatar name={data.profileName} size={24} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { status } = useLibrary();
  const insets = useSafeAreaInsets();
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const [route, setRoute] = useState<string>();
  const syncRoute = () => setRoute(navRef.getCurrentRoute()?.name);
  if (status === 'checking' || status === 'loading') return <LoadingScreen />;
  if (status === 'denied') return <PermissionScreen />;
  return (
    <PlayerProvider>
      <NavigationContainer ref={navRef} theme={navTheme} onReady={syncRoute} onStateChange={syncRoute}>
        <VideoMenuProvider>
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Channel" component={ChannelScreen} />
            <Stack.Screen name="Playlist" component={PlaylistScreen} />
          </Stack.Navigator>
          <WatchOverlay
            bottomOffset={route && TAB_ROUTES.includes(route) ? TAB_BAR_HEIGHT + insets.bottom : insets.bottom}
            hideMini={route === 'Shorts'}
          />
        </VideoMenuProvider>
      </NavigationContainer>
    </PlayerProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <UserDataProvider>
        <LibraryProvider>
          <ToastProvider>
            <Root />
          </ToastProvider>
        </LibraryProvider>
      </UserDataProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  create: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  youRing: { borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent', padding: 1 },
});
