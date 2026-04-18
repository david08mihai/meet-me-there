import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../src/contexts/AuthContext';
import { theme } from '../src/ui/theme';

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/welcome" />;
  if (!user.emailVerified) return <Redirect href="/verify-email" />;
  return <Redirect href="/map" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});
