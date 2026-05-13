import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../src/contexts/AuthContext';
import { useThemeColors } from '../src/ui/theme';

export default function Index() {
  const { user, initializing } = useAuth();
  const colors = useThemeColors();

  if (initializing) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isEmailConfirmed = !!user?.email_confirmed_at;

  if (!user) return <Redirect href="/welcome" />;
  if (!isEmailConfirmed) return <Redirect href="/verify-email" />;
  return <Redirect href="/map" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});