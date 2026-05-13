import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Select } from '../../src/ui/Select';
import { theme } from '../../src/ui/theme';

type BookingView = 'upcoming' | 'past';

type BookingRow = {
  booking_id: number;
  joined_at: string;
  booking_status: string;
  events: {
    event_id: number;
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    location_text: string;
    cover_image_url: string | null;
    pricing_model: string;
    ticket_price: number | null;
    status: string;
  } | null;
};

type BookingCardItem = {
  bookingId: number;
  eventId: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  locationText: string;
  coverImageUrl: string | null;
  pricingModel: string;
  ticketPrice: number | null;
  bookingStatus: string;
};

const BOOKING_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming Events' },
  { value: 'past', label: 'Past Events' },
] as const;

export default function Bookings() {
  const router = useRouter();
  const { user } = useAuth();

  const [view, setView] = useState<BookingView>('upcoming');
  const [events, setEvents] = useState<BookingCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          booking_id,
          joined_at,
          booking_status,
          events (
            event_id,
            title,
            description,
            start_datetime,
            end_datetime,
            location_text,
            cover_image_url,
            pricing_model,
            ticket_price,
            status
          )
        `
        )
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const now = new Date();

      const mapped: BookingCardItem[] = ((data ?? []) as BookingRow[])
        .filter((row) => row.events)
        .map((row) => ({
          bookingId: row.booking_id,
          eventId: row.events!.event_id,
          title: row.events!.title,
          description: row.events!.description,
          startsAt: row.events!.start_datetime,
          endsAt: row.events!.end_datetime,
          locationText: row.events!.location_text,
          coverImageUrl: row.events!.cover_image_url,
          pricingModel: row.events!.pricing_model,
          ticketPrice: row.events!.ticket_price,
          bookingStatus: row.booking_status,
        }))
        .filter((item) => {
          const starts = new Date(item.startsAt);
          return view === 'upcoming' ? starts >= now : starts < now;
        })
        .sort((a, b) => {
          const aTime = new Date(a.startsAt).getTime();
          const bTime = new Date(b.startsAt).getTime();
          return view === 'upcoming' ? aTime - bTime : bTime - aTime;
        });

      setEvents(mapped);
    } catch (error) {
      console.error(error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user, view]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const groupedPastEvents = useMemo(() => {
    if (view !== 'past') return [];

    const groups = events.reduce<Record<string, BookingCardItem[]>>((acc, event) => {
      const date = new Date(event.startsAt);
      const label = new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
      }).format(date);

      acc[label] = [...(acc[label] ?? []), event];
      return acc;
    }, {});

    return Object.entries(groups);
  }, [events, view]);

  const openEvent = (event: BookingCardItem) => {
    router.push({
      pathname: '/events/[id]',
      params: { id: String(event.eventId) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>See Bookings</Text>
        <Pressable
          onPress={() => router.push('/events/create')}
          accessibilityRole="button"
          accessibilityLabel="Create event"
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.selectorWrap}>
        <Select<BookingView>
          value={view}
          onChange={setView}
          options={BOOKING_OPTIONS}
          title="Bookings"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <EmptyBookings loading />
        ) : events.length === 0 ? (
          <EmptyBookings view={view} />
        ) : view === 'upcoming' ? (
          events.map((event) => (
            <BookingCard key={event.bookingId} event={event} onPress={() => openEvent(event)} />
          ))
        ) : (
          groupedPastEvents.map(([month, groupedEvents]) => (
            <View key={month} style={styles.group}>
              <Text style={styles.monthTitle}>{month}</Text>
              {groupedEvents.map((event) => (
                <BookingCard
                  key={event.bookingId}
                  event={event}
                  onPress={() => openEvent(event)}
                  variant="past"
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingCard({
  event,
  onPress,
  variant = 'upcoming',
}: {
  event: BookingCardItem;
  onPress: () => void;
  variant?: 'upcoming' | 'past';
}) {
  const formattedDate = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(event.startsAt));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.cardDate}>{formattedDate}</Text>
        <View
          style={[
            styles.badge,
            variant === 'past' ? styles.badgePast : styles.badgeUpcoming,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              variant === 'past' ? styles.badgeTextPast : styles.badgeTextUpcoming,
            ]}
          >
            {variant === 'past' ? 'Past' : 'Upcoming'}
          </Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{event.title}</Text>
      <Text style={styles.cardLocation}>{event.locationText}</Text>

      <Text style={styles.cardDescription} numberOfLines={2}>
        {event.description}
      </Text>

      <View style={styles.cardBottomRow}>
        <Text style={styles.cardMeta}>
          {event.pricingModel === 'free'
            ? 'Free'
            : `Paid${event.ticketPrice ? ` · ${event.ticketPrice} RON` : ''}`}
        </Text>
        <Text style={styles.cardMeta}>Status: {event.bookingStatus}</Text>
      </View>
    </Pressable>
  );
}

function EmptyBookings({
  view,
  loading = false,
}: {
  view?: BookingView;
  loading?: boolean;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons
        name={
          loading
            ? 'hourglass-outline'
            : view === 'upcoming'
            ? 'calendar-clear-outline'
            : 'archive-outline'
        }
        size={32}
        color={theme.colors.textMuted}
      />
      <Text style={styles.emptyTitle}>
        {loading
          ? 'Loading bookings'
          : view === 'upcoming'
          ? 'No upcoming events'
          : 'No past events'}
      </Text>
      <Text style={styles.emptyText}>
        {loading
          ? 'Please wait a moment.'
          : view === 'upcoming'
          ? 'Joined future events will appear here.'
          : 'Attended events will appear here.'}
      </Text>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  selectorWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  group: {
    gap: theme.spacing.md,
  },
  monthTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  badge: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  badgeUpcoming: {
    backgroundColor: '#DCFCE7',
  },
  badgePast: {
    backgroundColor: '#E5E7EB',
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  badgeTextUpcoming: {
    color: '#15803D',
  },
  badgeTextPast: {
    color: theme.colors.textMuted,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  cardLocation: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  cardDescription: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
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
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
});