import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { theme } from '../../src/ui/theme';

export default function Profile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const onLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/welcome');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen scrollable>
      <Text style={styles.heading}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={36} color={theme.colors.textMuted} />
            </View>
          )}
        </View>

        <Text style={styles.name}>{user?.displayName || 'Unnamed user'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, user?.emailVerified ? styles.badgeOk : styles.badgePending]}>
            <Ionicons
              name={user?.emailVerified ? 'checkmark-circle' : 'alert-circle-outline'}
              size={14}
              color={user?.emailVerified ? theme.colors.success : theme.colors.error}
            />
            <Text
              style={[
                styles.badgeText,
                user?.emailVerified ? styles.badgeOkText : styles.badgePendingText,
              ]}
            >
              {user?.emailVerified ? 'Email verified' : 'Email not verified'}
            </Text>
          </View>
        </View>
      </View>

      <Button
        label="Log out"
        variant="secondary"
        onPress={onLogout}
        loading={signingOut}
        disabled={signingOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatarWrap: { marginBottom: theme.spacing.md },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  name: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  badgeRow: { flexDirection: 'row', gap: theme.spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  badgeOk: {
    backgroundColor: '#DCFCE7',
    borderColor: theme.colors.success,
  },
  badgePending: {
    backgroundColor: '#FEE2E2',
    borderColor: theme.colors.error,
  },
  badgeText: { fontSize: theme.fontSize.xs, fontWeight: '600' },
  badgeOkText: { color: theme.colors.success },
  badgePendingText: { color: theme.colors.error },
});
