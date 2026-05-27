import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { ComponentProps, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Appearance,
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
import { isLocalUser } from '../../src/lib/localAuth';
import { supabase } from '../../src/lib/supabase';
import { setThemeMode, theme } from '../../src/ui/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type AccountType = 'personal' | 'business';

type ProfileColors = {
  screen: string;
  headerTitle: string;
  backButtonBg: string;
  card: string;
  rowCard: string;
  sectionText: string;
  bodyText: string;
  mutedText: string;
  trustPill: string;
  trustCircleBorder: string;
  trustCircleBg: string;
  trustValue: string;
  trustLabel: string;
  businessCard: string;
  destructiveBg: string;
  destructiveText: string;
  destructiveIcon: string;
  ratingPill: string;
  ratingText: string;
  locationText: string;
  toggleTrackOff: string;
};

const PROFILE_DARK_MODE_KEY = 'meet-me-there:profile-dark-mode';

const profileStorage = {
  async getItem(key: string) {
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },
};

const LIGHT_PROFILE_COLORS: ProfileColors = {
  screen: theme.colors.surface,
  headerTitle: theme.colors.primary,
  backButtonBg: '#EEF0FF',
  card: '#FFFFFF',
  rowCard: '#FFFFFF',
  sectionText: theme.colors.text,
  bodyText: theme.colors.text,
  mutedText: theme.colors.textMuted,
  trustPill: '#FCE7F3',
  trustCircleBorder: '#DB2777',
  trustCircleBg: '#FFFFFF',
  trustValue: '#BE185D',
  trustLabel: '#BE185D',
  businessCard: '#FFFFFF',
  destructiveBg: '#FEE2E2',
  destructiveText: theme.colors.error,
  destructiveIcon: theme.colors.error,
  ratingPill: '#DCFCE7',
  ratingText: '#15803D',
  locationText: theme.colors.textMuted,
  toggleTrackOff: '#D1D5DB',
};

const DARK_PROFILE_COLORS: ProfileColors = {
  screen: '#0F172A',
  headerTitle: '#E0E7FF',
  backButtonBg: '#1E293B',
  card: '#111827',
  rowCard: '#111827',
  sectionText: '#F9FAFB',
  bodyText: '#F9FAFB',
  mutedText: '#CBD5E1',
  trustPill: '#312244',
  trustCircleBorder: '#F472B6',
  trustCircleBg: '#1F2937',
  trustValue: '#F9A8D4',
  trustLabel: '#F9A8D4',
  businessCard: '#111827',
  destructiveBg: '#3B1B21',
  destructiveText: '#FCA5A5',
  destructiveIcon: '#FCA5A5',
  ratingPill: '#12331F',
  ratingText: '#86EFAC',
  locationText: '#CBD5E1',
  toggleTrackOff: '#475569',
};

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
  trustScore: number | null;
  coverUrl: string | null;
};

type ActionFactory = (label: string) => () => void;

export default function Profile() {
  const { user, signOut, deleteAccount } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [personal, setPersonal] = useState<PersonalData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const saved = await profileStorage.getItem(PROFILE_DARK_MODE_KEY);
      if (active && saved != null) {
        setDarkMode(saved === 'true');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setThemeMode(darkMode ? 'dark' : 'light');
    Appearance.setColorScheme(darkMode ? 'dark' : 'light');
    profileStorage.setItem(PROFILE_DARK_MODE_KEY, String(darkMode)).catch(() => {});
  }, [darkMode]);

  const colors = useMemo(() => (darkMode ? DARK_PROFILE_COLORS : LIGHT_PROFILE_COLORS), [darkMode]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }

      let cancelled = false;

      const loadProfile = async () => {
        try {
          setLoading(true);

          if (isLocalUser(user)) {
            const type =
              (user.user_metadata?.account_type as AccountType | undefined) ?? 'personal';
            setAccountType(type);

            if (type === 'business') {
              setBusiness({
                businessName:
                  (user.user_metadata?.business_name as string | undefined) ??
                  (user.user_metadata?.display_name as string | undefined) ??
                  'Business',
                logoUrl: null,
                locationText: null,
                rating: null,
                trustScore: 0,
                coverUrl: null,
              });
              setPersonal(null);
            } else {
              setPersonal({
                fullName:
                  (user.user_metadata?.full_name as string | undefined) ??
                  (user.user_metadata?.display_name as string | undefined) ??
                  'User',
                photoUrl: null,
                trustScore: 0,
              });
              setBusiness(null);
            }

            return;
          }

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
            const { data: profileData, error: profileError } = await supabase
              .from('personal_profiles')
              .select('full_name, photo_url, trust_score')
              .eq('user_id', user.id)
              .maybeSingle();

            if (profileError) throw profileError;
            if (cancelled) return;

            setPersonal({
              fullName: profileData?.full_name ?? 'User',
              photoUrl: profileData?.photo_url ?? null,
              trustScore: profileData?.trust_score ?? 0,
            });
            setBusiness(null);
          } else {
            const { data: profileData, error: profileError } = await supabase
              .from('business_profiles')
              .select('business_name, logo_url, location_text, rating_avg, trust_score')
              .eq('user_id', user.id)
              .maybeSingle();

            if (profileError) throw profileError;
            if (cancelled) return;

            setBusiness({
              businessName: profileData?.business_name ?? 'Business',
              logoUrl: profileData?.logo_url ?? null,
              locationText: profileData?.location_text ?? null,
              rating: profileData?.rating_avg ?? null,
              trustScore: profileData?.trust_score ?? 0,
              coverUrl: (profileData as any)?.cover_url ?? null,
            });
            setPersonal(null);
          }
        } catch (error) {
          console.error('Failed to load profile', error);
          if (!cancelled) {
            setPersonal(null);
            setBusiness(null);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      loadProfile();

      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  const openProfileTool = (section: string) => {
    router.push({ pathname: '/profile-tools/[section]', params: { section } });
  };

  const handleEditProfile = () => openProfileTool('edit-profile');

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your profile, bookings, reviews, messages, and created events. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/welcome');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete account'
              );
            }
          },
        },
      ],
    );
  };

  const handleProfileAction = (label: string) => () => {
    const sections: Record<string, string> = {
      'My Created Events': 'created-events',
      'Reviews Received': 'reviews',
      'Activity Stats': 'stats',
      'Achievements and Badges': 'achievements',
      'About Meet Me There': 'about',
      'Privacy Policy': 'privacy',
    };
    openProfileTool(sections[label] ?? 'about');
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.screen }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.backButtonBg },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.headerTitle} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.headerTitle }]}>Profile</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.headerTitle} />
        </View>
      ) : accountType === 'business' && business ? (
        <BusinessProfileView
          business={business}
          darkMode={darkMode}
          colors={colors}
          onToggleDarkMode={setDarkMode}
          onAction={handleProfileAction}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : personal ? (
        <PersonalProfileView
          personal={personal}
          email={user?.email ?? ''}
          darkMode={darkMode}
          colors={colors}
          onToggleDarkMode={setDarkMode}
          onEditProfile={handleEditProfile}
          onAction={handleProfileAction}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={[styles.mutedText, { color: colors.mutedText }]}>Profile unavailable.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function PersonalProfileView({
  personal,
  email,
  darkMode,
  colors,
  onToggleDarkMode,
  onEditProfile,
  onAction,
  onLogout,
  onDeleteAccount,
}: {
  personal: PersonalData;
  email: string;
  darkMode: boolean;
  colors: ProfileColors;
  onToggleDarkMode: (value: boolean) => void;
  onEditProfile: () => void;
  onAction: ActionFactory;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  const username = email ? `@${email.split('@')[0]}` : '';

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.screen }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.personalIdentity}>
        <View
          style={[
            styles.avatarRing,
            { borderColor: colors.trustCircleBorder, backgroundColor: colors.screen },
          ]}
        >
          {personal.photoUrl ? (
            <Image
              source={{ uri: personal.photoUrl }}
              style={[styles.avatarImage, { backgroundColor: colors.trustCircleBg }]}
            />
          ) : (
            <View
              style={[
                styles.avatarImage,
                styles.avatarFallback,
                { backgroundColor: colors.trustCircleBg },
              ]}
            >
              <Ionicons name="person" size={56} color={colors.mutedText} />
            </View>
          )}
        </View>

        <Text style={[styles.displayName, { color: colors.bodyText }]}>{personal.fullName}</Text>
        {username ? (
          <Text style={[styles.username, { color: colors.mutedText }]}>{username}</Text>
        ) : null}

        <View style={[styles.trustScorePill, { backgroundColor: colors.trustPill }]}>
          <View
            style={[
              styles.trustScoreCircle,
              {
                borderColor: colors.trustCircleBorder,
                backgroundColor: colors.trustCircleBg,
              },
            ]}
          >
            <Text style={[styles.trustScoreValue, { color: colors.trustValue }]}>
              {personal.trustScore ?? '—'}
            </Text>
          </View>
          <Text style={[styles.trustScoreLabel, { color: colors.trustLabel }]}>TRUST SCORE</Text>
        </View>

        <Pressable
          onPress={onEditProfile}
          accessibilityRole="button"
          style={({ pressed }) => [styles.editButtonWrapper, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={[
              colors.headerTitle === '#E0E7FF' ? '#818CF8' : theme.colors.primary,
              colors.headerTitle === '#E0E7FF' ? '#4F46E5' : theme.colors.primaryDark,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.editButton}
          >
            <Text style={styles.editButtonLabel}>Edit Profile</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <SectionHeader title="Activity Overview" colors={colors} />
      <View style={styles.rowGroup}>
        <ListRow
          icon="calendar-outline"
          iconColor={colors.headerTitle}
          iconBg={colors.backButtonBg}
          label="My Created Events"
          colors={colors}
          onPress={onAction('My Created Events')}
        />
        <ListRow
          icon="star-outline"
          iconColor={colors.ratingText}
          iconBg={colors.ratingPill}
          label="Reviews Received"
          colors={colors}
          onPress={onAction('Reviews Received')}
        />
        <ListRow
          icon="trending-up-outline"
          iconColor={colors.trustLabel}
          iconBg={colors.trustPill}
          label="Activity Stats"
          colors={colors}
          onPress={onAction('Activity Stats')}
        />
        <ListRow
          icon="ribbon-outline"
          iconColor={colors.bodyText}
          iconBg={colors.rowCard}
          label="Achievements and Badges"
          colors={colors}
          onPress={onAction('Achievements and Badges')}
        />
      </View>

      <SectionHeader title="Settings" colors={colors} />
      <SettingsRows
        darkMode={darkMode}
        colors={colors}
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
  colors,
  onToggleDarkMode,
  onAction,
  onLogout,
  onDeleteAccount,
}: {
  business: BusinessData;
  darkMode: boolean;
  colors: ProfileColors;
  onToggleDarkMode: (value: boolean) => void;
  onAction: ActionFactory;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.screen }]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[styles.businessCard, { backgroundColor: colors.businessCard, shadowColor: '#000' }]}
      >
        {business.coverUrl ? (
          <Image
            source={{ uri: business.coverUrl }}
            style={[styles.coverImage, { backgroundColor: colors.trustCircleBg }]}
          />
        ) : (
          <View
            style={[styles.coverImage, styles.coverFallback, { backgroundColor: colors.rowCard }]}
          >
            <Ionicons name="image-outline" size={32} color={colors.mutedText} />
          </View>
        )}

        <View style={[styles.logoRing, { borderColor: colors.card, backgroundColor: colors.card }]}>
          {business.logoUrl ? (
            <Image
              source={{ uri: business.logoUrl }}
              style={[styles.logoImage, { backgroundColor: colors.trustCircleBg }]}
            />
          ) : (
            <View
              style={[styles.logoImage, styles.avatarFallback, { backgroundColor: colors.rowCard }]}
            >
              <Ionicons name="business" size={32} color={colors.mutedText} />
            </View>
          )}
        </View>

        <View style={styles.businessMeta}>
          <Text style={[styles.businessName, { color: colors.bodyText }]}>
            {business.businessName}
          </Text>
          <View style={styles.businessInfoRow}>
            <View style={[styles.ratingPill, { backgroundColor: colors.ratingPill }]}>
              <Ionicons name="star" size={13} color={colors.ratingText} />
              <Text style={[styles.ratingValue, { color: colors.ratingText }]}>
                {business.rating != null ? business.rating.toFixed(1) : '—'}
              </Text>
            </View>
            <Text style={[styles.locationText, { color: colors.locationText }]} numberOfLines={1}>
              {business.locationText ?? 'Location not set'}
            </Text>
          </View>

          <View style={[styles.businessTrustPill, { backgroundColor: colors.trustPill }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.trustLabel} />
            <Text style={[styles.businessTrustText, { color: colors.trustLabel }]}>
              Trust Score {business.trustScore ?? 0}
            </Text>
          </View>
        </View>
      </View>

      <SectionHeader title="MANAGEMENT" variant="eyebrow" colors={colors} />
      <View style={styles.rowGroup}>
        <ListRow
          icon="calendar-outline"
          iconColor={colors.headerTitle}
          iconBg={colors.backButtonBg}
          label="My Created Events"
          colors={colors}
          onPress={onAction('My Created Events')}
        />
        <ListRow
          icon="star-outline"
          iconColor={colors.trustLabel}
          iconBg={colors.trustPill}
          label="Reviews Received"
          colors={colors}
          onPress={onAction('Reviews Received')}
        />
      </View>

      <SectionHeader title="SETTINGS & SUPPORT" variant="eyebrow" colors={colors} />
      <SettingsRows
        darkMode={darkMode}
        colors={colors}
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
  colors,
  onToggleDarkMode,
  onAction,
  onLogout,
  onDeleteAccount,
}: {
  darkMode: boolean;
  colors: ProfileColors;
  onToggleDarkMode: (value: boolean) => void;
  onAction: ActionFactory;
  onLogout: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <View style={styles.rowGroup}>
      <ListRow
        icon="moon-outline"
        iconColor={colors.bodyText}
        iconBg={colors.rowCard}
        label="Dark Mode"
        colors={colors}
        rightAccessory={
          <Switch
            value={darkMode}
            onValueChange={onToggleDarkMode}
            trackColor={{ true: colors.headerTitle, false: colors.toggleTrackOff }}
            thumbColor={colors.card}
            ios_backgroundColor={colors.toggleTrackOff}
          />
        }
      />
      <ListRow
        icon="information-circle-outline"
        iconColor={colors.bodyText}
        iconBg={colors.rowCard}
        label="About Meet Me There"
        colors={colors}
        onPress={onAction('About Meet Me There')}
      />
      <ListRow
        icon="shield-checkmark-outline"
        iconColor={colors.bodyText}
        iconBg={colors.rowCard}
        label="Privacy Policy"
        colors={colors}
        onPress={onAction('Privacy Policy')}
      />
      <ListRow
        icon="log-out-outline"
        iconColor={colors.destructiveIcon}
        iconBg={colors.destructiveBg}
        label="Log Out"
        labelColor={colors.destructiveText}
        colors={colors}
        onPress={onLogout}
        hideChevron
      />
      <ListRow
        icon="trash-outline"
        iconColor={colors.destructiveIcon}
        iconBg={colors.destructiveBg}
        label="Delete Account"
        labelColor={colors.destructiveText}
        colors={colors}
        onPress={onDeleteAccount}
        hideChevron
      />
    </View>
  );
}

function SectionHeader({
  title,
  variant = 'default',
  colors,
}: {
  title: string;
  variant?: 'default' | 'eyebrow';
  colors: ProfileColors;
}) {
  return (
    <Text
      style={[
        variant === 'eyebrow' ? styles.sectionEyebrow : styles.sectionTitle,
        { color: variant === 'eyebrow' ? colors.mutedText : colors.sectionText },
      ]}
    >
      {title}
    </Text>
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
  colors,
}: {
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  label: string;
  labelColor?: string;
  onPress?: () => void;
  rightAccessory?: ReactNode;
  hideChevron?: boolean;
  colors?: ProfileColors;
}) {
  const content = (
    <View style={styles.rowInner}>
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text
        style={[styles.rowLabel, { color: labelColor ?? colors?.bodyText ?? theme.colors.text }]}
      >
        {label}
      </Text>
      {rightAccessory ??
        (hideChevron ? null : (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors?.mutedText ?? theme.colors.textMuted}
          />
        ))}
    </View>
  );

  if (!onPress) {
    return (
      <View style={[styles.rowCard, { backgroundColor: colors?.rowCard ?? '#FFFFFF' }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.rowCard,
        { backgroundColor: colors?.rowCard ?? '#FFFFFF' },
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
  },
  username: {
    fontSize: theme.fontSize.md,
    marginTop: -theme.spacing.xs,
  },
  trustScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustScoreValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  trustScoreLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
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
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  ratingValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  businessTrustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  businessTrustText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  locationText: {
    flexShrink: 1,
    fontSize: theme.fontSize.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  sectionEyebrow: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  rowGroup: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  rowCard: {
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
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
  },
});
