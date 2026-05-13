import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Input } from '../../src/ui/Input';
import { ScreenHeader } from '../../src/ui/ScreenHeader';
import { theme } from '../../src/ui/theme';

type SectionKey =
  | 'edit-profile'
  | 'created-events'
  | 'reviews'
  | 'stats'
  | 'achievements'
  | 'about'
  | 'privacy';

type AccountType = 'personal' | 'business';

type EventRow = {
  event_id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location_text: string;
  pricing_model: string;
  ticket_price: number | null;
  max_participants: number;
  status: string;
};

type ReviewItem = {
  review_id: number;
  stars: number;
  comment: string | null;
  created_at: string;
};

type StatsData = {
  created: number;
  upcomingBookings: number;
  attended: number;
  reviews: number;
};

const titles: Record<SectionKey, string> = {
  'edit-profile': 'Edit Profile',
  'created-events': 'My Created Events',
  reviews: 'Reviews Received',
  stats: 'Activity Stats',
  achievements: 'Achievements',
  about: 'About',
  privacy: 'Privacy Policy',
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function formatEventSchedule(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const datePart = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(startDate);

  const startTime = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(startDate);

  const endTime = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(endDate);

  return `${datePart} · ${startTime} - ${endTime}`;
}

export default function ProfileToolScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const section = (firstParam(params.section) ?? 'about') as SectionKey;
  const title = titles[section] ?? 'Profile';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader title={title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {section === 'edit-profile' ? <EditProfile /> : null}
        {section === 'created-events' ? <CreatedEvents /> : null}
        {section === 'reviews' ? <Reviews /> : null}
        {section === 'stats' ? <Stats /> : null}
        {section === 'achievements' ? <Achievements /> : null}
        {section === 'about' ? <About /> : null}
        {section === 'privacy' ? <Privacy /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function EditProfile() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<AccountType>('personal');

  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [shortDescription, setShortDescription] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);

        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('account_type')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userError) throw userError;
        if (cancelled) return;

        const type = (userRow?.account_type as AccountType) ?? 'personal';
        setAccountType(type);

        if (type === 'business') {
          const { data, error } = await supabase
            .from('business_profiles')
            .select('business_name, location_text, short_description')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;
          if (cancelled) return;

          setDisplayName(data?.business_name ?? '');
          setLocation(data?.location_text ?? '');
          setShortDescription(data?.short_description ?? '');
        } else {
          const { data, error } = await supabase
            .from('personal_profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;
          if (cancelled) return;

          setDisplayName(data?.full_name ?? '');
          setLocation('');
          setShortDescription('');
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      if (accountType === 'business') {
        const { error } = await supabase
          .from('business_profiles')
          .update({
            business_name: displayName.trim(),
            location_text: location.trim() || null,
            short_description: shortDescription.trim() || null,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('personal_profiles')
          .update({
            full_name: displayName.trim(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      }

      Alert.alert('Profile saved', 'Your profile details were saved.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save profile');
    }
  };

  if (loading) {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Loading profile"
        text="Please wait a moment."
      />
    );
  }

  return (
    <View style={styles.formCard}>
      <Field label={accountType === 'business' ? 'Business Name' : 'Full Name'}>
        <Input value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
      </Field>

      {accountType === 'business' ? (
        <>
          <Field label="Location">
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="Business location"
            />
          </Field>

          <Field label="Short Description">
            <Input
              value={shortDescription}
              onChangeText={setShortDescription}
              placeholder="Tell people about your business"
              multiline
              textAlignVertical="top"
              style={styles.textArea}
            />
          </Field>
        </>
      ) : null}

      <PrimaryAction label="Save Profile" icon="save-outline" onPress={handleSave} />
    </View>
  );
}

function CreatedEvents() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);

  const loadEvents = async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('events')
        .select(
          `
          event_id,
          title,
          description,
          start_datetime,
          end_datetime,
          location_text,
          pricing_model,
          ticket_price,
          max_participants,
          status
        `
        )
        .eq('organizer_user_id', user.id)
        .order('start_datetime', { ascending: false });

      if (error) throw error;
      setEvents(data ?? []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user]);

  const handleDelete = (event: EventRow) => {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('event_id', event.event_id);

            if (error) throw error;
            await loadEvents();
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete event');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Loading events"
        text="Please wait a moment."
      />
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No created events"
        text="Events you set up will appear here."
      />
    );
  }

  return (
    <View style={styles.listStack}>
      {events.map((event) => (
        <View key={event.event_id} style={styles.eventWithActions}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/events/[id]',
                params: { id: String(event.event_id) },
              })
            }
            style={({ pressed }) => [styles.infoCard, pressed && styles.pressed]}
          >
            <Text style={styles.cardTitle}>{event.title}</Text>
            <Text style={styles.cardText}>{formatEventSchedule(event.start_datetime, event.end_datetime)}</Text>
            <Text style={styles.cardText}>{event.location_text}</Text>
            <Text style={styles.cardText}>
              {event.pricing_model === 'paid' ? `${event.ticket_price ?? 0} RON` : 'Free'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleDelete(event)}
            style={({ pressed }) => [styles.destructiveInline, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={17} color={theme.colors.error} />
            <Text style={styles.destructiveInlineText}>Delete event</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function Reviews() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadReviews = async () => {
      try {
        setLoading(true);

        const { data: userRow, error: userError } = await supabase
          .from('users')
          .select('account_type')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userError) throw userError;
        const type = (userRow?.account_type as AccountType) ?? 'personal';

        if (type === 'business') {
          const { data: businessProfile, error: profileError } = await supabase
            .from('business_profiles')
            .select('business_profile_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profileError) throw profileError;

          const { data, error } = await supabase
            .from('reviews')
            .select('review_id, stars, comment, created_at')
            .eq('target_business_profile_id', businessProfile?.business_profile_id ?? -1)
            .order('created_at', { ascending: false });

          if (error) throw error;
          if (!cancelled) setReviews(data ?? []);
        } else {
          const { data: personalProfile, error: profileError } = await supabase
            .from('personal_profiles')
            .select('profile_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profileError) throw profileError;

          const { data, error } = await supabase
            .from('reviews')
            .select('review_id, stars, comment, created_at')
            .eq('target_personal_profile_id', personalProfile?.profile_id ?? -1)
            .order('created_at', { ascending: false });

          if (error) throw error;
          if (!cancelled) setReviews(data ?? []);
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load reviews');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Loading reviews"
        text="Please wait a moment."
      />
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon="star-outline"
        title="No reviews yet"
        text="Reviews received will appear here."
      />
    );
  }

  return (
    <View style={styles.listStack}>
      {reviews.map((review) => (
        <View key={review.review_id} style={styles.infoCard}>
          <Stars value={review.stars} />
          <Text style={styles.cardText}>{review.comment || 'No written review.'}</Text>
          <Text style={styles.cardText}>
            {new Intl.DateTimeFormat('en', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }).format(new Date(review.created_at))}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Stats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    created: 0,
    upcomingBookings: 0,
    attended: 0,
    reviews: 0,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadStats = async () => {
      try {
        setLoading(true);

        const nowIso = new Date().toISOString();

        const [
          createdResult,
          bookingsResult,
          userTypeResult,
        ] = await Promise.all([
          supabase
            .from('events')
            .select('event_id', { count: 'exact', head: true })
            .eq('organizer_user_id', user.id),

          supabase
            .from('bookings')
            .select(
              `
              booking_id,
              booking_status,
              events (
                start_datetime
              )
            `
            )
            .eq('user_id', user.id)
            .eq('booking_status', 'confirmed'),

          supabase
            .from('users')
            .select('account_type')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (createdResult.error) throw createdResult.error;
        if (bookingsResult.error) throw bookingsResult.error;
        if (userTypeResult.error) throw userTypeResult.error;

        const bookings = bookingsResult.data ?? [];

        const upcomingBookings = bookings.filter((booking: any) => {
          const start = booking.events?.start_datetime;
          return start && start >= nowIso;
        }).length;

        const attended = bookings.filter((booking: any) => {
          const start = booking.events?.start_datetime;
          return start && start < nowIso;
        }).length;

        const type = (userTypeResult.data?.account_type as AccountType) ?? 'personal';

        let reviewsCount = 0;

        if (type === 'business') {
          const { data: profile, error: profileError } = await supabase
            .from('business_profiles')
            .select('business_profile_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profileError) throw profileError;

          const { count, error } = await supabase
            .from('reviews')
            .select('review_id', { count: 'exact', head: true })
            .eq('target_business_profile_id', profile?.business_profile_id ?? -1);

          if (error) throw error;
          reviewsCount = count ?? 0;
        } else {
          const { data: profile, error: profileError } = await supabase
            .from('personal_profiles')
            .select('profile_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profileError) throw profileError;

          const { count, error } = await supabase
            .from('reviews')
            .select('review_id', { count: 'exact', head: true })
            .eq('target_personal_profile_id', profile?.profile_id ?? -1);

          if (error) throw error;
          reviewsCount = count ?? 0;
        }

        if (!cancelled) {
          setStats({
            created: createdResult.count ?? 0,
            upcomingBookings,
            attended,
            reviews: reviewsCount,
          });
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Loading stats"
        text="Please wait a moment."
      />
    );
  }

  const rows = [
    { label: 'Created Events', value: stats.created, icon: 'calendar-outline' },
    { label: 'Upcoming Bookings', value: stats.upcomingBookings, icon: 'ticket-outline' },
    { label: 'Attended Events', value: stats.attended, icon: 'checkmark-done-outline' },
    { label: 'Reviews', value: stats.reviews, icon: 'star-outline' },
  ] as const;

  return (
    <View style={styles.statsGrid}>
      {rows.map((row) => (
        <View key={row.label} style={styles.statCard}>
          <Ionicons name={row.icon} size={22} color={theme.colors.primary} />
          <Text style={styles.statValue}>{row.value}</Text>
          <Text style={styles.statLabel}>{row.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Achievements() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    created: 0,
    upcomingBookings: 0,
    attended: 0,
    reviews: 0,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadStats = async () => {
      try {
        setLoading(true);

        const nowIso = new Date().toISOString();

        const [createdResult, bookingsResult] = await Promise.all([
          supabase
            .from('events')
            .select('event_id', { count: 'exact', head: true })
            .eq('organizer_user_id', user.id),

          supabase
            .from('bookings')
            .select(
              `
              booking_id,
              booking_status,
              events (
                start_datetime
              )
            `
            )
            .eq('user_id', user.id)
            .eq('booking_status', 'confirmed'),
        ]);

        if (createdResult.error) throw createdResult.error;
        if (bookingsResult.error) throw bookingsResult.error;

        const bookings = bookingsResult.data ?? [];

        const upcomingBookings = bookings.filter((booking: any) => {
          const start = booking.events?.start_datetime;
          return start && start >= nowIso;
        }).length;

        const attended = bookings.filter((booking: any) => {
          const start = booking.events?.start_datetime;
          return start && start < nowIso;
        }).length;

        if (!cancelled) {
          setStats({
            created: createdResult.count ?? 0,
            upcomingBookings,
            attended,
            reviews: 0,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Loading achievements"
        text="Please wait a moment."
      />
    );
  }

  const achievements = [
    {
      title: 'First Host',
      text: stats.created > 0 ? 'Unlocked by creating your first event.' : 'Create an event to unlock.',
      unlocked: stats.created > 0,
    },
    {
      title: 'Explorer',
      text:
        stats.upcomingBookings + stats.attended > 0
          ? 'Unlocked by joining an event.'
          : 'Join an event to unlock.',
      unlocked: stats.upcomingBookings + stats.attended > 0,
    },
    {
      title: 'Community Voice',
      text: stats.attended > 0 ? 'Unlocked by being active in the community.' : 'Attend events to unlock this badge.',
      unlocked: stats.attended > 0,
    },
  ];

  return (
    <View style={styles.listStack}>
      {achievements.map((achievement) => (
        <View
          key={achievement.title}
          style={[styles.infoCard, achievement.unlocked && styles.unlockedCard]}
        >
          <Ionicons
            name={achievement.unlocked ? 'ribbon' : 'ribbon-outline'}
            size={24}
            color={achievement.unlocked ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text style={styles.cardTitle}>{achievement.title}</Text>
          <Text style={styles.cardText}>{achievement.text}</Text>
        </View>
      ))}
    </View>
  );
}

function About() {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.cardTitle}>Meet Me There</Text>
      <Text style={styles.cardText}>
        Meet Me There helps people discover nearby events, join activities, chat with
        participants, and build trust through attendance and reviews.
      </Text>
      <Text style={styles.cardText}>
        This version uses Supabase for authentication, profiles, events, bookings, payments, and chat.
      </Text>
    </View>
  );
}

function Privacy() {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.cardTitle}>Privacy Policy</Text>
      <Text style={styles.cardText}>
        Your account, profile, bookings, reviews, payments, and event data are stored in the configured Supabase project.
      </Text>
      <Text style={styles.cardText}>
        Access to records is controlled through authentication and row level security policies.
      </Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function PrimaryAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={18} color="#FFFFFF" />
      <Text style={styles.primaryActionText}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={32} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Ionicons
          key={index}
          name={index < value ? 'star' : 'star-outline'}
          size={18}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  listStack: {
    gap: theme.spacing.lg,
  },
  formCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  field: {
    gap: theme.spacing.xs,
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  textArea: {
    minHeight: 120,
    paddingTop: theme.spacing.md,
  },
  primaryAction: {
    height: 52,
    borderRadius: theme.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  eventWithActions: {
    gap: theme.spacing.sm,
  },
  destructiveInline: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  destructiveInlineText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  infoCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  unlockedCard: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EEF0FF',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  cardText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  statCard: {
    width: '47.5%',
    minHeight: 128,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.lg,
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
});