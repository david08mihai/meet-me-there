import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { theme } from '../../src/ui/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type AccountType = 'personal' | 'business';

type PersonalData = {
  fullName: string;
  photoUrl: string | null;
  trustScore: number | null;
};

type BusinessData = {
  businessName: string;
  logoUrl: string | null;
  locationText: string | null;
  rating: number | null;
  coverUrl: string | null;
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [personal, setPersonal] = useState<PersonalData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('account_type')
          .eq('user_id', user.id)
          .maybeSingle();
        if (userError) throw userError;
        if (cancelled) return;

        const type = (userRow?.account_type as AccountType) ?? 'personal';
        setAccountType(type);

        if (type === 'personal') {
          const { data, error } = await supabase
            .from('personal_profiles')
            .select('full_name, photo_url')
            .eq('user_id', user.id)
            .maybeSingle();
          if (error) throw error;
          if (cancelled) return;
          setPersonal({
            fullName: data?.full_name ?? 'User',
            photoUrl: data?.photo_url ?? null,
            trustScore: null,
          });
        } else {
          const { data, error } = await supabase
            .from('business_profiles')
            .select('business_name, logo_url, location_text')
            .eq('user_id', user.id)
            .maybeSingle();
          if (error) throw error;
          if (cancelled) return;
          setBusiness({
            businessName: data?.business_name ?? 'Business',
            logoUrl: data?.logo_url ?? null,
            locationText: data?.location_text ?? null,
            rating: null,
            coverUrl: null,
          });
        }
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleEditProfile = () => Alert.alert('Edit Profile', 'Profile editing is coming soon.');

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This will permanently delete your account. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => Alert.alert('Delete Account', 'Account deletion is coming soon.'),
      },
    ]);
  };

  const handleComingSoon = (label: string) => () => Alert.alert(label, 'Coming soon.');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : accountType === 'business' && business ? (
        <BusinessProfileView
          business={business}
          darkMode={darkMode}
          onToggleDarkMode={setDarkMode}
          onAction={handleComingSoon}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : personal ? (
        <PersonalProfileView
          personal={personal}
          email={user?.email ?? ''}
          darkMode={darkMode}
          onToggleDarkMode={setDarkMode}
          onEditProfile={handleEditProfile}
          onAction={handleComingSoon}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Profile unavailable.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

type ActionFactory = (label: string) => () => void;

function PersonalProfileView({
  personal,
  email,
  darkMode,
  onToggleDarkMode,
  onEditProfile,
  onAction,
  onLogout,
  onDeleteAccount,
}: {
  personal: PersonalData;
  email: string;
  darkMode: boolean;
  onToggleDarkMode: (value: boolean) => void;
  onEditProfile: () => void;
  onAction: ActionFactory;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const username = email ? `@${email.split('@')[0]}` : '';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.personalIdentity}>
        <View style={styles.avatarRing}>
          {personal.photoUrl ? (
            <Image source={{ uri: personal.photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarImage, styles.avatarFallback]}>
              <Ionicons name="person" size={56} color={theme.colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.displayName}>{personal.fullName}</Text>
        {username ? <Text style={styles.username}>{username}</Text> : null}

        <View style={styles.trustScorePill}>
          <View style={styles.trustScoreCircle}>
            <Text style={styles.trustScoreValue}>{personal.trustScore ?? '—'}</Text>
          </View>
          <Text style={styles.trustScoreLabel}>TRUST SCORE</Text>
        </View>

        <Pressable
          onPress={onEditProfile}
          accessibilityRole="button"
          style={({ pressed }) => [styles.editButtonWrapper, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.editButton}
          >
            <Text style={styles.editButtonLabel}>Edit Profile</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <SectionHeader title="Activity Overview" />
      <View style={styles.rowGroup}>
        <ListRow
          icon="calendar-outline"
          iconColor={theme.colors.primary}
          iconBg="#EEF0FF"
          label="My Created Events"
          onPress={onAction('My Created Events')}
        />
        <ListRow
          icon="star-outline"
          iconColor="#16A34A"
          iconBg="#DCFCE7"
          label="Reviews Received"
          onPress={onAction('Reviews Received')}
        />
        <ListRow
          icon="trending-up-outline"
          iconColor="#DB2777"
          iconBg="#FCE7F3"
          label="Activity Stats"
          onPress={onAction('Activity Stats')}
        />
        <ListRow
          icon="ribbon-outline"
          iconColor={theme.colors.text}
          iconBg="#E5E7EB"
          label="Achievements and Badges"
          onPress={onAction('Achievements and Badges')}
        />
      </View>

      <SectionHeader title="Settings" />
      <SettingsRows
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onAction={onAction}
        onLogout={onLogout}
        onDeleteAccount={onDeleteAccount}
      />
    </ScrollView>
  );
}

function BusinessProfileView({
  business,
  darkMode,
  onToggleDarkMode,
  onAction,
  onLogout,
  onDeleteAccount,
}: {
  business: BusinessData;
  darkMode: boolean;
  onToggleDarkMode: (value: boolean) => void;
  onAction: ActionFactory;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.businessCard}>
        {business.coverUrl ? (
          <Image source={{ uri: business.coverUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.coverFallback]}>
            <Ionicons name="image-outline" size={32} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.logoRing}>
          {business.logoUrl ? (
            <Image source={{ uri: business.logoUrl }} style={styles.logoImage} />
          ) : (
            <View style={[styles.logoImage, styles.avatarFallback]}>
              <Ionicons name="business" size={32} color={theme.colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.businessMeta}>
          <Text style={styles.businessName}>{business.businessName}</Text>
          <View style={styles.businessInfoRow}>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={13} color="#16A34A" />
              <Text style={styles.ratingValue}>
                {business.rating != null ? business.rating.toFixed(1) : '—'}
              </Text>
            </View>
            <Text style={styles.locationText} numberOfLines={1}>
              {business.locationText ?? 'Location not set'}
            </Text>
          </View>
        </View>
      </View>

      <SectionHeader title="MANAGEMENT" variant="eyebrow" />
      <View style={styles.rowGroup}>
        <ListRow
          icon="calendar-outline"
          iconColor={theme.colors.primary}
          iconBg="#EEF0FF"
          label="My Created Events"
          onPress={onAction('My Created Events')}
        />
        <ListRow
          icon="star-outline"
          iconColor="#DB2777"
          iconBg="#FCE7F3"
          label="Reviews Received"
          onPress={onAction('Reviews Received')}
        />
      </View>

      <SectionHeader title="SETTINGS & SUPPORT" variant="eyebrow" />
      <SettingsRows
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onAction={onAction}
        onLogout={onLogout}
        onDeleteAccount={onDeleteAccount}
      />
    </ScrollView>
  );
}

function SettingsRows({
  darkMode,
  onToggleDarkMode,
  onAction,
  onLogout,
  onDeleteAccount,
}: {
  darkMode: boolean;
  onToggleDarkMode: (value: boolean) => void;
  onAction: ActionFactory;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <View style={styles.rowGroup}>
      <ListRow
        icon="moon-outline"
        iconColor={theme.colors.text}
        iconBg="#E5E7EB"
        label="Dark Mode"
        rightAccessory={
          <Switch
            value={darkMode}
            onValueChange={onToggleDarkMode}
            trackColor={{ true: theme.colors.primary, false: '#D1D5DB' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#D1D5DB"
          />
        }
      />
      <ListRow
        icon="information-circle-outline"
        iconColor={theme.colors.text}
        iconBg="#E5E7EB"
        label="About Meet Me There"
        onPress={onAction('About Meet Me There')}
      />
      <ListRow
        icon="shield-checkmark-outline"
        iconColor={theme.colors.text}
        iconBg="#E5E7EB"
        label="Privacy Policy"
        onPress={onAction('Privacy Policy')}
      />
      <ListRow
        icon="log-out-outline"
        iconColor={theme.colors.error}
        iconBg="#FEE2E2"
        label="Log Out"
        labelColor={theme.colors.error}
        onPress={onLogout}
        hideChevron
      />
      <ListRow
        icon="trash-outline"
        iconColor={theme.colors.error}
        iconBg="#FEE2E2"
        label="Delete Account"
        labelColor={theme.colors.error}
        onPress={onDeleteAccount}
        hideChevron
      />
    </View>
  );
}

function SectionHeader({
  title,
  variant = 'default',
}: {
  title: string;
  variant?: 'default' | 'eyebrow';
}) {
  return (
    <Text style={variant === 'eyebrow' ? styles.sectionEyebrow : styles.sectionTitle}>{title}</Text>
  );
}

function ListRow({
  icon,
  iconColor,
  iconBg,
  label,
  labelColor,
  onPress,
  rightAccessory,
  hideChevron = false,
}: {
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  label: string;
  labelColor?: string;
  onPress?: () => void;
  rightAccessory?: ReactNode;
  hideChevron?: boolean;
}) {
  const content = (
    <View style={styles.rowInner}>
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
      {rightAccessory ??
        (hideChevron ? null : (
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        ))}
    </View>
  );

  if (!onPress) {
    return <View style={styles.rowCard}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },

  personalIdentity: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  avatarRing: {
    width: 136,
    height: 136,
    borderRadius: 68,
    padding: 4,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.xs,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  username: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: -theme.spacing.xs,
  },
  trustScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE7F3',
    borderRadius: theme.radius.full,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  trustScoreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#DB2777',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustScoreValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: '#BE185D',
  },
  trustScoreLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#BE185D',
  },
  editButtonWrapper: {
    width: '100%',
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  editButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  editButtonLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  businessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  coverImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    marginTop: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
  },
  businessMeta: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  businessName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  businessInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  ratingValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: '#15803D',
  },
  locationText: {
    flexShrink: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },

  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  sectionEyebrow: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },

  rowGroup: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
