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
import { theme } from '../../../src/ui/theme';

export default function EventDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [, setVersion] = useState(0);
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const event = getEventById(eventId);

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Event Details" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Event unavailable</Text>
          <Text style={styles.emptyText}>The selected event could not be found.</Text>
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Event Details" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: event.imageUrl }} style={styles.coverImage} />

        <View style={styles.titleBlock}>
          <TagPills tags={event.tags} />
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.infoGrid}>
          <InfoCard
            icon="calendar-outline"
            label="Date & Time"
            value={formatEventSchedule(event)}
          />
          <InfoCard icon="location-outline" label="Location" value={event.venue} />
          <InfoCard
            icon="people-outline"
            label="Capacity"
            value={`${event.attendees}/${event.capacity} spots filled`}
          />
          <InfoCard
            icon="ticket-outline"
            label="Cost"
            value={event.price > 0 ? `$${event.price} per guest` : 'Free'}
          />
        </View>

        <OrganizerCard event={event} />

        <Pressable
          onPress={() => setParticipantsOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.participantsCard, pressed && styles.pressed]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Who's going</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </View>
          <View style={styles.avatarRow}>
            {event.participantNames.slice(0, 4).map((name, index) => (
              <View key={`${name}-${index}`} style={[styles.initialAvatar, { left: -index * 8 }]}>
                <Text style={styles.initialText}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.participantSummary}>
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
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>See Chat</Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                accessibilityRole="button"
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>Cancel Attendance</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleJoin}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
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
      />
    </SafeAreaView>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function OrganizerCard({ event }: { event: EventItem }) {
  const organizer = event.organizer;
  const isBusiness = organizer.type === 'business';

  return (
    <View style={styles.organizerCard}>
      <Text style={styles.sectionTitle}>Organizer</Text>
      <View style={styles.organizerRow}>
        <Image source={{ uri: organizer.avatarUrl }} style={styles.organizerAvatar} />
        <View style={styles.organizerTextWrap}>
          <Text style={styles.organizerLabel}>{isBusiness ? 'Business account' : 'Registered user'}</Text>
          <Text style={styles.organizerName}>{organizer.name}</Text>
          {isBusiness ? (
            <View style={styles.ratingRow}>
              <Stars value={Math.round(organizer.rating ?? 0)} />
              <Text style={styles.organizerMetric}>
                {organizer.rating?.toFixed(1) ?? '-'} stars
              </Text>
            </View>
          ) : (
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark-outline" size={15} color={theme.colors.success} />
              <Text style={styles.trustText}>Trust Score: {organizer.trustScore ?? '-'}</Text>
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
}: {
  event: EventItem;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Participation List</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          {event.participantNames.map((name, index) => (
            <View key={`${name}-${index}`} style={styles.participantRow}>
              <View style={styles.modalAvatar}>
                <Text style={styles.initialText}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={styles.participantName}>{name}</Text>
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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.border,
  },
  titleBlock: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  description: {
    color: theme.colors.textMuted,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    lineHeight: 19,
  },
  organizerCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surface,
  },
  organizerTextWrap: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  organizerLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  organizerName: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  organizerMetric: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  trustBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  trustText: {
    color: '#15803D',
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  participantsCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: '#EEF0FF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  initialText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  participantSummary: {
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.primary,
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
    borderColor: theme.colors.error,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: theme.colors.error,
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
    backgroundColor: '#FFFFFF',
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
    color: theme.colors.text,
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
    backgroundColor: '#EEF0FF',
  },
  participantName: {
    color: theme.colors.text,
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
