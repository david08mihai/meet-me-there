import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BookingView,
  EventItem,
  formatMonthGroup,
  getBookedEvents,
} from '../../src/lib/mockEvents';
import { EventCard } from '../../src/ui/EventCard';
import { Select } from '../../src/ui/Select';
import { theme, useThemeColors } from '../../src/ui/theme';

const BOOKING_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming Events' },
  { value: 'past', label: 'Past Events' },
] as const;

export default function Bookings() {
  const router = useRouter();
  const colors = useThemeColors();
  const [view, setView] = useState<BookingView>('upcoming');
  const [events, setEvents] = useState<EventItem[]>(() => getBookedEvents('upcoming'));

  const refresh = useCallback(() => {
    const nextEvents = getBookedEvents(view);
    setEvents(view === 'past' ? [...nextEvents].reverse() : nextEvents);
  }, [view]);

  useFocusEffect(refresh);

  const openEvent = (event: EventItem) => {
    router.push({ pathname: '/events/[id]', params: { id: event.id } });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>See Bookings</Text>
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
          onChange={(value) => {
            setView(value);
            const nextEvents = getBookedEvents(value);
            setEvents(value === 'past' ? [...nextEvents].reverse() : nextEvents);
          }}
          options={BOOKING_OPTIONS}
          title="Bookings"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {events.length === 0 ? (
          <EmptyBookings view={view} />
        ) : view === 'upcoming' ? (
          events.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => openEvent(event)} />
          ))
        ) : (
          <PastEventGroups events={events} onOpen={openEvent} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PastEventGroups({
  events,
  onOpen,
}: {
  events: EventItem[];
  onOpen: (event: EventItem) => void;
}) {
  const colors = useThemeColors();
  const groups = events.reduce<Record<string, EventItem[]>>((acc, event) => {
    const label = formatMonthGroup(event.startsAt);
    acc[label] = [...(acc[label] ?? []), event];
    return acc;
  }, {});

  return (
    <>
      {Object.entries(groups).map(([month, groupedEvents]) => (
        <View key={month} style={styles.group}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>{month}</Text>
          {groupedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              variant="past"
              onPress={() => onOpen(event)}
            />
          ))}
        </View>
      ))}
    </>
  );
}

function EmptyBookings({ view }: { view: BookingView }) {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyState}>
      <Ionicons
        name={view === 'upcoming' ? 'calendar-clear-outline' : 'archive-outline'}
        size={32}
        color={colors.textMuted}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }] }>
        {view === 'upcoming' ? 'No upcoming events' : 'No past events'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }] }>
        {view === 'upcoming'
          ? 'Joined future events will appear here.'
          : 'Attended events and reviews will appear here.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
});
