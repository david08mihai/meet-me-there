import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Input } from '../../src/ui/Input';
import { ScreenHeader } from '../../src/ui/ScreenHeader';
import { theme, useThemeColors } from '../../src/ui/theme';

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
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
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
  const colors = useThemeColors();

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
    <View style={[styles.formCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);

  const loadEvents = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
            style={({ pressed }) => [styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>{event.title}</Text>
            <Text style={[styles.cardText, { color: colors.textMuted }]}>{formatEventSchedule(event.start_datetime, event.end_datetime)}</Text>
            <Text style={[styles.cardText, { color: colors.textMuted }]}>{event.location_text}</Text>
            <Text style={[styles.cardText, { color: colors.textMuted }]}>
              {event.pricing_model === 'paid' ? `${event.ticket_price ?? 0} RON` : 'Free'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleDelete(event)}
            style={({ pressed }) => [styles.destructiveInline, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={17} color={colors.error} />
            <Text style={[styles.destructiveInlineText, { color: colors.error }]}>Delete event</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function Reviews() {
  const { user } = useAuth();
  const colors = useThemeColors();
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

        const { data, error } = await supabase
          .from('reviews')
          .select('review_id, stars, comment, created_at')
          .eq('target_user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!cancelled) setReviews(data ?? []);
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
        <View key={review.review_id} style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Stars value={review.stars} />
          <Text style={[styles.cardText, { color: colors.textMuted }]}>{review.comment || 'No written review.'}</Text>
          <Text style={[styles.cardText, { color: colors.textMuted }]}>
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
  const colors = useThemeColors();
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

        const [createdResult, bookingsResult, reviewsResult] = await Promise.all([
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
            .from('reviews')
            .select('review_id', { count: 'exact', head: true })
            .eq('target_user_id', user.id),
        ]);

        if (createdResult.error) throw createdResult.error;
        if (bookingsResult.error) throw bookingsResult.error;
        if (reviewsResult.error) throw reviewsResult.error;

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
            reviews: reviewsResult.count ?? 0,
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
        <View key={row.label} style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name={row.icon} size={22} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{row.value}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{row.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Achievements() {
  const { user } = useAuth();
  const colors = useThemeColors();
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
          style={[
            styles.infoCard,
            { backgroundColor: colors.background, borderColor: colors.border },
            achievement.unlocked && { borderColor: colors.primary, backgroundColor: colors.surface },
          ]}
        >
          <Ionicons
            name={achievement.unlocked ? 'ribbon' : 'ribbon-outline'}
            size={24}
            color={achievement.unlocked ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{achievement.title}</Text>
          <Text style={[styles.cardText, { color: colors.textMuted }]}>{achievement.text}</Text>
        </View>
      ))}
    </View>
  );
}
function About() {
  const colors = useThemeColors();
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Meet Me There</Text>

      <Text style={[styles.cardText, { color: colors.textMuted }]}>
        Meet Me There is a social event discovery platform designed to help people
        find exciting activities happening nearby and connect with others through
        shared real-life experiences. Whether you are looking for casual meetups,
        sports activities, cultural events, workshops, or social gatherings,
        the app makes it easy to discover what is happening around you and join
        with just a few taps.
      </Text>

      <Text style={[styles.cardText, { color: colors.textMuted }]}>
        Users can not only explore and join existing events, but also create and
        organize their own events, building
        communities around shared interests. The platform encourages meaningful
        social interaction by making local experiences more accessible and easier
        to discover.
      </Text>

      <Text style={[styles.cardText, { color: colors.textMuted }]}>
        To create a safer and more trustworthy environment, Meet Me There includes
        a trust score system based on attendance, participation history, and user
        feedback. This helps users make informed decisions about who they interact
        with and creates a more secure experience when meeting new people.
      </Text>
    </View>
  );
}

function Privacy() {
  const colors = useThemeColors();
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Privacy Policy</Text>
      <Text style={[styles.cardText, { color: colors.textMuted }]}>
        Your account, profile, bookings, reviews, payments, and event data are stored in the configured Supabase project.
      </Text>
      <Text style={[styles.cardText, { color: colors.textMuted }]}>
        Access to records is controlled through authentication and row level security policies.
      </Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
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
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary }, pressed && styles.pressed]}
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
  const colors = useThemeColors();
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={32} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>
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
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  field: {
    gap: theme.spacing.xs,
  },
  fieldLabel: {
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
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  infoCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  unlockedCard: {},
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  cardText: {
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
    padding: theme.spacing.lg,
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '900',
  },
  statLabel: {
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
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  emptyText: {
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
