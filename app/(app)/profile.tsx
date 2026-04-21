import { Alert, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { theme } from '../../src/ui/theme';

export default function Profile() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to sign out'
      );
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{user?.email ?? 'No email'}</Text>

        <Button
          label="Log out"
          onPress={handleLogout}
          variant="secondary"
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  email: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  button: {
    marginTop: theme.spacing.md,
  },
});
