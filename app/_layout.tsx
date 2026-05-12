import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { setThemeMode, useThemeMode } from '../src/ui/theme';

const PROFILE_DARK_MODE_KEY = 'meet-me-there:profile-dark-mode';

function useProtectedRoute() {
  const { user, initializing } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isEmailConfirmed = !!user?.email_confirmed_at;

    if (!user && !inAuthGroup) {
      router.replace('/welcome');
      return;
    }

    if (user && inAuthGroup) {
      if (!isEmailConfirmed && segments[1] !== 'verify-email') {
        router.replace('/verify-email');
      } else if (isEmailConfirmed && segments[1] !== 'forgot-password') {
        router.replace('/map');
      }
    }
  }, [user, initializing, segments, router]);
}

function RootLayoutNav() {
  useProtectedRoute();
  const themeMode = useThemeMode();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const saved = await AsyncStorage.getItem(PROFILE_DARK_MODE_KEY);
      if (!mounted || saved == null) return;
      setThemeMode(saved === 'true' ? 'dark' : 'light');
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
