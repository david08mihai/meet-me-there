import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EventItem,
  cancelAttendance,
  formatEventSchedule,
  getEventById,
  joinEvent,
} from '../../../src/lib/mockEvents';
import { Stars, TagPills } from '../../../src/ui/EventCard';
import { ScreenHeader } from '../../../src/ui/ScreenHeader';
import { theme, useThemeColors } from '../../../src/ui/theme';

export default function EventDetails() {
  const router = useRouter();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [, setVersion] = useState(0);
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const event = getEventById(eventId);

  if (!event) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Event Details" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Event unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>The selected event could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const refresh = () => setVersion((value) => value + 1);

  const handleJoin = () => {
    if (event.paymentModel === 'Paid') {
      router.push({ pathname: '/payment', params: { eventId: event.id } });
      return;
    }

    joinEvent(event.id);
    refresh();
    Alert.alert('Joined', 'You are attending this event.');
  };

  const handleCancel = () => {
    Alert.alert('Cancel Attendance', 'Do you want to cancel your attendance?', [
      { text: 'Keep Booking', style: 'cancel' },
      {
        text: 'Cancel Attendance',
        style: 'destructive',
        onPress: () => {
          cancelAttendance(event.id);
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Event Details" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: event.imageUrl }} style={styles.coverImage} />

        <View style={styles.titleBlock}>
          <TagPills tags={event.tags} />
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{event.description}</Text>
        </View>

        <View style={styles.infoGrid}>
          <InfoCard icon="calendar-outline" label="Date & Time" value={formatEventSchedule(event)} colors={colors} />
          <InfoCard icon="location-outline" label="Location" value={event.venue} colors={colors} />
          <InfoCard icon="people-outline" label="Capacity" value={`${event.attendees}/${event.capacity} spots filled`} colors={colors} />
          <InfoCard icon="ticket-outline" label="Cost" value={event.price > 0 ? `$${event.price} per guest` : 'Free'} colors={colors} />
        </View>

        <OrganizerCard event={event} colors={colors} />

        <Pressable
          onPress={() => setParticipantsOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.participantsCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Who's going</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.avatarRow}>
            {event.participantNames.slice(0, 4).map((name, index) => (
              <View key={`${name}-${index}`} style={[styles.initialAvatar, { left: -index * 8, backgroundColor: colors.background === '#0F172A' ? '#1E293B' : '#EEF0FF', borderColor: colors.surface }]}>
                <Text style={[styles.initialText, { color: colors.primary }]}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.participantSummary, { color: colors.textMuted }]}>
            {event.participantNames.length > 0
              ? `${event.participantNames.slice(0, 3).join(', ')}${
                  event.participantNames.length > 3 ? ' and others' : ''
                }`
              : 'No participants yet'}
          </Text>
        </Pressable>

        <View style={styles.actionWrap}>
          {event.isBooked ? (
            <>
              <Pressable
                onPress={() => router.push({ pathname: '/chat', params: { eventId: event.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>See Chat</Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.error, backgroundColor: colors.surface }, pressed && styles.pressed]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.error }]}>Cancel Attendance</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleJoin}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Join Event</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <ParticipantsModal
        event={event}
        visible={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

function InfoCard({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const iconBg = colors.background === '#0F172A' ? '#1E293B' : '#EEF0FF';
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function OrganizerCard({ event, colors }: { event: EventItem; colors: ReturnType<typeof useThemeColors> }) {
  const organizer = event.organizer;
  const isBusiness = organizer.type === 'business';
  const trustBg = colors.background === '#0F172A' ? '#12331F' : '#DCFCE7';
  const trustTextColor = colors.background === '#0F172A' ? '#86EFAC' : '#15803D';
  return (
    <View style={[styles.organizerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Organizer</Text>
      <View style={styles.organizerRow}>
        <Image source={{ uri: organizer.avatarUrl }} style={[styles.organizerAvatar, { backgroundColor: colors.border }]} />
        <View style={styles.organizerTextWrap}>
          <Text style={[styles.organizerLabel, { color: colors.textMuted }]}>{isBusiness ? 'Business account' : 'Registered user'}</Text>
          <Text style={[styles.organizerName, { color: colors.text }]}>{organizer.name}</Text>
          {isBusiness ? (
            <View style={styles.ratingRow}>
              <Stars value={Math.round(organizer.rating ?? 0)} />
              <Text style={[styles.organizerMetric, { color: colors.textMuted }]}>
                {organizer.rating?.toFixed(1) ?? '-'} stars
              </Text>
            </View>
          ) : (
            <View style={[styles.trustBadge, { backgroundColor: trustBg }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color={trustTextColor} />
              <Text style={[styles.trustText, { color: trustTextColor }]}>Trust Score: {organizer.trustScore ?? '-'}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ParticipantsModal({
  event,
  visible,
  onClose,
  colors,
}: {
  event: EventItem;
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const avatarBg = colors.background === '#0F172A' ? '#1E293B' : '#EEF0FF';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Participation List</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          {event.participantNames.map((name, index) => (
            <View key={`${name}-${index}`} style={styles.participantRow}>
              <View style={[styles.modalAvatar, { backgroundColor: avatarBg }]}>
                <Text style={[styles.initialText, { color: colors.primary }]}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={[styles.participantName, { color: colors.text }]}>{name}</Text>
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
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
  coverImage: {
    width: '100%',
    height: 220,
    borderRadius: 24,
  },
  titleBlock: {
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  description: {
    fontSize: theme.fontSize.md,
    lineHeight: 23,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  infoCard: {
    width: '47.5%',
    minHeight: 130,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    lineHeight: 19,
  },
  organizerCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  organizerAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  organizerTextWrap: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  organizerLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  organizerName: {
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  organizerMetric: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  trustBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  trustText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  participantsCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  initialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  initialText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  participantSummary: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  actionWrap: {
    gap: theme.spacing.md,
  },
  primaryButton: {
    height: 54,
    borderRadius: theme.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 52,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  modalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
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
