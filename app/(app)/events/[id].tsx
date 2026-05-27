import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/lib/supabase';
import { Stars, TagPills } from '../../../src/ui/EventCard';
import { Input } from '../../../src/ui/Input';
import { ScreenHeader } from '../../../src/ui/ScreenHeader';
import { theme, useThemeColors } from '../../../src/ui/theme';

type EventRow = {
  event_id: number;
  organizer_user_id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  start_datetime: string;
  end_datetime: string;
  location_text: string;
  max_participants: number;
  pricing_model: string;
  ticket_price: number | null;
  status: string;
  rating_avg: number | null;
  rating_count: number | null;
};

type BookingRow = {
  booking_id: number;
  user_id: string;
  booking_status: string;
};

type PersonalProfileRow = {
  profile_id?: number;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  trust_score: number;
};

type BusinessProfileRow = {
  business_profile_id?: number;
  user_id: string;
  business_name: string;
  logo_url: string | null;
  rating_avg: number;
  rating_count?: number;
  trust_score?: number;
};

type OrganizerInfo =
  | {
      type: 'business';
      userId: string;
      businessProfileId: number | null;
      name: string;
      avatarUrl: string | null;
      rating: number;
      ratingCount: number;
      trustScore: number;
    }
  | {
      type: 'personal';
      userId: string;
      profileId: number | null;
      name: string;
      avatarUrl: string | null;
      trustScore: number;
    };

type EventDetailsModel = {
  eventId: number;
  title: string;
  description: string;
  imageUrl: string | null;
  venue: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  attendees: number;
  price: number;
  paymentModel: 'Free' | 'Paid';
  isBooked: boolean;
  currentUserBookingId: number | null;
  participantNames: string[];
  tags: string[];
  organizer: OrganizerInfo;
  ratingAvg: number;
  ratingCount: number;
};

type ExistingReviewRow = {
  review_id: number;
  stars: number;
  comment: string | null;
};

function formatEventSchedule(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const datePart = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(start);

  const startTime = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);

  const endTime = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(end);

  return `${datePart} · ${startTime} - ${endTime}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export default function EventDetails() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const eventId = Array.isArray(id) ? id[0] : id;
  const numericEventId = eventId ? Number(eventId) : NaN;
  const validEventId = useMemo(() => Number.isFinite(numericEventId), [numericEventId]);

  const [event, setEvent] = useState<EventDetailsModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!validEventId) {
      setLoading(false);
      setEvent(null);
      return;
    }

    try {
      setLoading(true);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(
          `
          event_id,
          organizer_user_id,
          title,
          description,
          cover_image_url,
          start_datetime,
          end_datetime,
          location_text,
          max_participants,
          pricing_model,
          ticket_price,
          status,
          rating_avg,
          rating_count
        `
        )
        .eq('event_id', numericEventId)
        .single<EventRow>();

      if (eventError) throw eventError;

      const [
        tagsResult,
        bookingsResult,
        personalParticipantsResult,
        businessParticipantsResult,
        organizerPersonalResult,
        organizerBusinessResult,
      ] = await Promise.all([
        supabase
          .from('event_tags')
          .select('tag_id, tags(tag_id, name)')
          .eq('event_id', numericEventId),

        supabase
          .from('bookings')
          .select('booking_id, user_id, booking_status')
          .eq('event_id', numericEventId)
          .in('booking_status', ['pending', 'confirmed']),

        supabase
          .from('personal_profiles')
          .select('profile_id, user_id, full_name, photo_url, trust_score'),

        supabase
          .from('business_profiles')
          .select('business_profile_id, user_id, business_name, logo_url, rating_avg, rating_count, trust_score'),

        supabase
          .from('personal_profiles')
          .select('profile_id, user_id, full_name, photo_url, trust_score')
          .eq('user_id', eventData.organizer_user_id)
          .maybeSingle<PersonalProfileRow>(),

        supabase
          .from('business_profiles')
          .select('business_profile_id, user_id, business_name, logo_url, rating_avg, rating_count, trust_score')
          .eq('user_id', eventData.organizer_user_id)
          .maybeSingle<BusinessProfileRow>(),
      ]);

      if (tagsResult.error) throw tagsResult.error;
      if (bookingsResult.error) throw bookingsResult.error;
      if (personalParticipantsResult.error) throw personalParticipantsResult.error;
      if (businessParticipantsResult.error) throw businessParticipantsResult.error;
      if (organizerPersonalResult.error) throw organizerPersonalResult.error;
      if (organizerBusinessResult.error) throw organizerBusinessResult.error;

      const bookings = (bookingsResult.data ?? []) as BookingRow[];

      const participantUserIds = bookings.map((b) => b.user_id);

      const personalMap = new Map(
        (personalParticipantsResult.data ?? []).map((p) => [p.user_id, p as PersonalProfileRow])
      );
      const businessMap = new Map(
        (businessParticipantsResult.data ?? []).map((b) => [b.user_id, b as BusinessProfileRow])
      );

      const participantNames = participantUserIds
        .map((userId) => {
          const personal = personalMap.get(userId);
          if (personal) return personal.full_name;

          const business = businessMap.get(userId);
          if (business) return business.business_name;

          return null;
        })
        .filter(Boolean) as string[];

      const organizer: OrganizerInfo = organizerBusinessResult.data
        ? {
            type: 'business',
            userId: eventData.organizer_user_id,
            businessProfileId: organizerBusinessResult.data.business_profile_id ?? null,
            name: organizerBusinessResult.data.business_name,
            avatarUrl: organizerBusinessResult.data.logo_url,
            rating: organizerBusinessResult.data.rating_avg ?? 0,
            ratingCount: organizerBusinessResult.data.rating_count ?? 0,
            trustScore: organizerBusinessResult.data.trust_score ?? 0,
          }
        : {
            type: 'personal',
            userId: eventData.organizer_user_id,
            profileId: organizerPersonalResult.data?.profile_id ?? null,
            name: organizerPersonalResult.data?.full_name ?? 'Unknown user',
            avatarUrl: organizerPersonalResult.data?.photo_url ?? null,
            trustScore: organizerPersonalResult.data?.trust_score ?? 0,
          };

      const tags = (tagsResult.data ?? [])
        .map((row: any) => row.tags?.name)
        .filter(Boolean);

      const currentUserBooking = bookings.find((booking) => booking.user_id === user?.id);
      const isBooked = !!currentUserBooking;

      setEvent({
        eventId: eventData.event_id,
        title: eventData.title,
        description: eventData.description,
        imageUrl: eventData.cover_image_url,
        venue: eventData.location_text,
        startsAt: eventData.start_datetime,
        endsAt: eventData.end_datetime,
        capacity: eventData.max_participants,
        attendees: bookings.length,
        price: eventData.ticket_price ?? 0,
        paymentModel: eventData.pricing_model === 'paid' ? 'Paid' : 'Free',
        isBooked,
        currentUserBookingId: currentUserBooking?.booking_id ?? null,
        participantNames,
        tags,
        organizer,
        ratingAvg: eventData.rating_avg ?? 0,
        ratingCount: eventData.rating_count ?? 0,
      });
    } catch (error) {
      console.error(error);
      setEvent(null);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to load event details'
      );
    } finally {
      setLoading(false);
    }
  }, [numericEventId, user?.id, validEventId]);

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [loadEvent])
  );

  const handleJoin = async () => {
    if (!user || !event) {
      Alert.alert('Error', 'You must be logged in to join this event.');
      return;
    }

    if (event.paymentModel === 'Paid') {
      router.push({ pathname: '/payment', params: { eventId: String(event.eventId) } });
      return;
    }

    try {
      const { error } = await supabase.from('bookings').insert({
        event_id: event.eventId,
        user_id: user.id,
        booking_status: 'confirmed',
      });

      if (error) throw error;

      Alert.alert('Joined', 'You are attending this event.');
      await loadEvent();
    } catch (error) {
      console.log(error)
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to join event'
      );
    }
  };

  const handleCancel = () => {
    if (!user || !event) return;

    Alert.alert('Cancel Attendance', 'Do you want to cancel your attendance?', [
      { text: 'Keep Booking', style: 'cancel' },
      {
        text: 'Cancel Attendance',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.rpc('cancel_own_booking', {
              p_event_id: event.eventId,
            });

            if (error) throw error;

            await loadEvent();
          } catch (error) {
            Alert.alert(
              'Error',
              error instanceof Error ? error.message : 'Failed to cancel attendance'
            );
          }
        },
      },
    ]);
  };

  const eventHasEnded = event ? new Date(event.endsAt) <= new Date() : false;
  const hasReviewTarget = event
    ? event.organizer.type === 'personal'
      ? event.organizer.profileId !== null
      : event.organizer.businessProfileId !== null
    : false;
  const canReview =
    !!user &&
    !!event &&
    event.isBooked &&
    event.currentUserBookingId !== null &&
    eventHasEnded &&
    hasReviewTarget &&
    event.organizer.userId !== user.id;

  const openReviewModal = async () => {
    if (!user || !event || !canReview) return;

    setReviewStars(5);
    setReviewComment('');
    setReviewOpen(true);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('review_id, stars, comment')
        .eq('booking_id', event.currentUserBookingId)
        .maybeSingle<ExistingReviewRow>();

      if (error) throw error;

      if (data) {
        setReviewStars(data.stars);
        setReviewComment(data.comment ?? '');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const submitReview = async () => {
    if (!user || !event || !canReview) return;

    try {
      setReviewSubmitting(true);
      if (!event.currentUserBookingId) throw new Error('Booking not found for this event.');

      const { error } = await supabase.from('reviews').upsert(
        {
          booking_id: event.currentUserBookingId,
          event_id: event.eventId,
          reviewer_user_id: user.id,
          target_user_id: event.organizer.userId,
          target_personal_profile_id:
            event.organizer.type === 'personal' ? event.organizer.profileId : null,
          target_business_profile_id:
            event.organizer.type === 'business' ? event.organizer.businessProfileId : null,
          review_type: 'event',
          stars: reviewStars,
          comment: reviewComment.trim() || null,
        },
        { onConflict: 'booking_id' }
      );

      if (error) throw error;

      setReviewOpen(false);
      Alert.alert('Review saved', 'Thanks for helping the community stay trustworthy.');
      await loadEvent();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to save review'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.surface }]}
        edges={['top', 'left', 'right']}
      >
        <ScreenHeader title="Event Details" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.surface }]}
        edges={['top', 'left', 'right']}
      >
        <ScreenHeader title="Event Details" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Event unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            The selected event could not be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.surface }]}
      edges={['top', 'left', 'right']}
    >
      <ScreenHeader title="Event Details" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.coverFallback]}>
            <Ionicons name="image-outline" size={42} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.titleBlock}>
          <TagPills tags={event.tags} />
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          {event.ratingCount > 0 ? (
            <View style={styles.eventRatingRow}>
              <Stars value={Math.round(event.ratingAvg)} />
              <Text style={[styles.eventRatingText, { color: colors.textMuted }]}>
                {event.ratingAvg.toFixed(1)} from {event.ratingCount} review
                {event.ratingCount === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.description, { color: colors.textMuted }]}>{event.description}</Text>
        </View>

        <View style={styles.infoGrid}>
          <InfoCard
            icon="calendar-outline"
            label="Date & Time"
            value={formatEventSchedule(event.startsAt, event.endsAt)}
            colors={colors}
          />
          <InfoCard
            icon="location-outline"
            label="Location"
            value={event.venue}
            colors={colors}
          />
          <InfoCard
            icon="people-outline"
            label="Capacity"
            value={`${event.attendees}/${event.capacity} spots filled`}
            colors={colors}
          />
          <InfoCard
            icon="ticket-outline"
            label="Cost"
            value={event.price > 0 ? `${event.price} RON per guest` : 'Free'}
            colors={colors}
          />
        </View>

        <OrganizerCard event={event} colors={colors} />

        <Pressable
          onPress={() => setParticipantsOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.participantsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Who&apos;s going</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>

          <View style={styles.avatarRow}>
            {event.participantNames.slice(0, 4).map((name, index) => (
              <View
                key={`${name}-${index}`}
                style={[
                  styles.initialAvatar,
                  {
                    left: -index * 8,
                    backgroundColor:
                      colors.background === '#0F172A' ? '#1E293B' : '#EEF0FF',
                    borderColor: colors.surface,
                  },
                ]}
              >
                <Text style={[styles.initialText, { color: colors.primary }]}>
                  {name.slice(0, 1).toUpperCase()}
                </Text>
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
              {canReview ? (
                <Pressable
                  onPress={openReviewModal}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="star-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Review Event</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/chat',
                    params: { eventId: String(event.eventId) },
                  })
                }
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>See Chat</Text>
              </Pressable>

              {!eventHasEnded ? (
                <Pressable
                  onPress={handleCancel}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: colors.error, backgroundColor: colors.surface },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.error }]}>
                    Cancel Attendance
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Pressable
              onPress={handleJoin}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
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

      <ReviewModal
        visible={reviewOpen}
        stars={reviewStars}
        comment={reviewComment}
        submitting={reviewSubmitting}
        organizerName={event.organizer.name}
        onStarsChange={setReviewStars}
        onCommentChange={setReviewComment}
        onSubmit={submitReview}
        onClose={() => setReviewOpen(false)}
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

function OrganizerCard({
  event,
  colors,
}: {
  event: EventDetailsModel;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const organizer = event.organizer;
  const isBusiness = organizer.type === 'business';
  const trustBg = colors.background === '#0F172A' ? '#12331F' : '#DCFCE7';
  const trustTextColor = colors.background === '#0F172A' ? '#86EFAC' : '#15803D';

  return (
    <View style={[styles.organizerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Organizer</Text>

      <View style={styles.organizerRow}>
        {organizer.avatarUrl ? (
          <Image
            source={{ uri: organizer.avatarUrl }}
            style={[styles.organizerAvatar, { backgroundColor: colors.border }]}
          />
        ) : (
          <View
            style={[
              styles.organizerAvatar,
              styles.organizerAvatarFallback,
              { backgroundColor: colors.border },
            ]}
          >
            <Text style={[styles.initialText, { color: colors.primary }]}>
              {organizer.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.organizerTextWrap}>
          <Text style={[styles.organizerLabel, { color: colors.textMuted }]}>
            {isBusiness ? 'Business account' : 'Registered user'}
          </Text>
          <Text style={[styles.organizerName, { color: colors.text }]}>{organizer.name}</Text>

          {isBusiness ? (
            <>
              <View style={styles.ratingRow}>
                <Stars value={Math.round(organizer.rating ?? 0)} />
                <Text style={[styles.organizerMetric, { color: colors.textMuted }]}>
                  {organizer.rating?.toFixed(1) ?? '0.0'} stars
                </Text>
              </View>
              <View style={[styles.trustBadge, { backgroundColor: trustBg }]}>
                <Ionicons name="shield-checkmark-outline" size={15} color={trustTextColor} />
                <Text style={[styles.trustText, { color: trustTextColor }]}>
                  Trust Score: {organizer.trustScore ?? 0}
                </Text>
              </View>
            </>
          ) : (
            <View style={[styles.trustBadge, { backgroundColor: trustBg }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color={trustTextColor} />
              <Text style={[styles.trustText, { color: trustTextColor }]}>
                Trust Score: {organizer.trustScore ?? 0}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ReviewModal({
  visible,
  stars,
  comment,
  submitting,
  organizerName,
  onStarsChange,
  onCommentChange,
  onSubmit,
  onClose,
  colors,
}: {
  visible: boolean;
  stars: number;
  comment: string;
  submitting: boolean;
  organizerName: string;
  onStarsChange: (value: number) => void;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalKeyboardAvoider}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <View style={styles.reviewTitleWrap}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Review Event</Text>
                <Text style={[styles.reviewSubtitle, { color: colors.textMuted }]}>
                  Rate your experience with {organizerName}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.starPicker}>
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                const active = value <= stars;

                return (
                  <Pressable
                    key={value}
                    onPress={() => onStarsChange(value)}
                    accessibilityRole="button"
                    accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
                    style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}
                  >
                    <Ionicons
                      name={active ? 'star' : 'star-outline'}
                      size={34}
                      color="#F59E0B"
                    />
                  </Pressable>
                );
              })}
            </View>

            <Input
              value={comment}
              onChangeText={onCommentChange}
              placeholder="What should others know?"
              multiline
              textAlignVertical="top"
              style={styles.reviewInput}
            />

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
                submitting && styles.disabled,
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Saving...' : 'Save Review'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ParticipantsModal({
  event,
  visible,
  onClose,
  colors,
}: {
  event: EventDetailsModel;
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const avatarBg = colors.background === '#0F172A' ? '#1E293B' : '#EEF0FF';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Participation List</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {event.participantNames.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No participants yet.</Text>
          ) : (
            event.participantNames.map((name, index) => (
              <View key={`${name}-${index}`} style={styles.participantRow}>
                <View style={[styles.modalAvatar, { backgroundColor: avatarBg }]}>
                  <Text style={[styles.initialText, { color: colors.primary }]}>
                    {name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.participantName, { color: colors.text }]}>{name}</Text>
              </View>
            ))
          )}
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
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  titleBlock: {
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  eventRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  eventRatingText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
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
  organizerAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
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
  disabled: {
    opacity: 0.55,
  },
  modalKeyboardAvoider: {
    flex: 1,
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
  reviewTitleWrap: {
    flex: 1,
    gap: 3,
  },
  reviewSubtitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  starPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  starButton: {
    padding: 3,
  },
  reviewInput: {
    minHeight: 110,
    paddingTop: theme.spacing.md,
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
