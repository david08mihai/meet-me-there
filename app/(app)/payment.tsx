import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Input } from '../../src/ui/Input';
import { ScreenHeader } from '../../src/ui/ScreenHeader';
import { theme, useThemeColors } from '../../src/ui/theme';

type PaymentMethod = 'apple' | 'card';
type PaymentErrors = Partial<Record<'cardNumber' | 'expiry' | 'cvv', string>>;

type EventRow = {
  event_id: number;
  title: string;
  start_datetime: string;
  end_datetime: string;
  location_text: string;
  ticket_price: number | null;
  pricing_model: string;
};

function formatEventSchedule(start: string, end: string, includeLocation = false, location?: string) {
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

  const base = `${datePart} · ${startTime} - ${endTime}`;
  return includeLocation && location ? `${base} · ${location}` : base;
}

export default function ReviewPurchase() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user } = useAuth();

  const params = useLocalSearchParams<{ eventId?: string }>();
  const rawEventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const eventId = rawEventId ? Number(rawEventId) : NaN;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      if (!Number.isFinite(eventId)) {
        setLoading(false);
        setEvent(null);
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
            start_datetime,
            end_datetime,
            location_text,
            ticket_price,
            pricing_model
          `
          )
          .eq('event_id', eventId)
          .single();

        if (error) throw error;
        setEvent(data);
      } catch (error) {
        console.error(error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const total = useMemo(() => {
    if (!event) return 0;
    return event.pricing_model === 'paid' ? event.ticket_price ?? 0 : 0;
  }, [event]);

  const validateCard = () => {
    const nextErrors: PaymentErrors = {};
    const digits = cardNumber.replace(/\D/g, '');
    const cleanCvv = cvv.replace(/\D/g, '');
    const expiryMatch = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry.trim());

    if (!digits) nextErrors.cardNumber = 'Card number is required';
    else if (digits.length < 13 || digits.length > 19) {
      nextErrors.cardNumber = 'Please enter a valid card number';
    }

    if (!expiry.trim()) nextErrors.expiry = 'Expiry date is required';
    else if (!expiryMatch) nextErrors.expiry = 'Please enter a valid expiry date';
    else {
      const month = Number(expiryMatch[1]);
      const year = 2000 + Number(expiryMatch[2]);
      const expiresAt = new Date(year, month, 0, 23, 59, 59);
      if (expiresAt < new Date()) nextErrors.expiry = 'Please enter a valid expiry date';
    }

    if (!cleanCvv) nextErrors.cvv = 'CVV is required';
    else if (!/^\d{3,4}$/.test(cleanCvv)) nextErrors.cvv = 'Please enter a valid CVV';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const upsertBookingAndPayment = async () => {
    if (!user || !event) throw new Error('Missing user or event');

    const { data: existingBooking, error: bookingLookupError } = await supabase
      .from('bookings')
      .select('booking_id, booking_status')
      .eq('event_id', event.event_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (bookingLookupError) throw bookingLookupError;

    let bookingId: number;

    if (existingBooking?.booking_id) {
      const { data: updatedBooking, error: updateBookingError } = await supabase
        .from('bookings')
        .update({ booking_status: 'confirmed' })
        .eq('booking_id', existingBooking.booking_id)
        .select('booking_id')
        .single();

      if (updateBookingError) throw updateBookingError;
      bookingId = updatedBooking.booking_id;
    } else {
      const { data: insertedBooking, error: insertBookingError } = await supabase
        .from('bookings')
        .insert({
          event_id: event.event_id,
          user_id: user.id,
          booking_status: 'confirmed',
        })
        .select('booking_id')
        .single();

      if (insertBookingError) throw insertBookingError;
      bookingId = insertedBooking.booking_id;
    }

    const paymentMethod =
      method === 'apple' ? 'apple_pay' : 'card';

    const { data: existingPayment, error: paymentLookupError } = await supabase
      .from('payments')
      .select('payment_id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (paymentLookupError) throw paymentLookupError;

    if (existingPayment?.payment_id) {
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          amount: total,
          payment_method: paymentMethod,
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('payment_id', existingPayment.payment_id);

      if (updatePaymentError) throw updatePaymentError;
    } else {
      const { error: insertPaymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          amount: total,
          payment_method: paymentMethod,
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        });

      if (insertPaymentError) throw insertPaymentError;
    }
  };

  const handlePay = async () => {
    setBanner(null);

    if (!user) {
      setBanner('You must be logged in to complete this purchase');
      return;
    }

    if (!event) {
      setBanner('The selected event is unavailable');
      return;
    }

    if (method === 'apple' && Platform.OS !== 'ios') {
      setBanner('Apple Pay is not available on this device');
      return;
    }

    if (event.pricing_model === 'paid' && method === 'card' && !validateCard()) {
      return;
    }

    try {
      setProcessing(true);
      await upsertBookingAndPayment();

      Alert.alert('Payment complete', 'Your booking is confirmed.', [
        { text: 'OK', onPress: () => router.replace('/bookings') },
      ]);
    } catch (error) {
      console.error(error);
      setBanner(
        error instanceof Error
          ? error.message
          : 'Payment could not be completed. Please try again'
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatCard = (value: string) =>
    value
      .replace(/\D/g, '')
      .slice(0, 19)
      .replace(/(.{4})/g, '$1 ')
      .trim();

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <ScreenHeader title="Review Purchase" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading ticket...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <ScreenHeader title="Review Purchase" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Ticket unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            The selected ticket could not be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScreenHeader title="Review Purchase" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {banner ? (
            <View style={[styles.errorBanner, { borderColor: colors.error }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{banner}</Text>
            </View>
          ) : null}

          <View
            style={[
              styles.ticketCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardEyebrow, { color: colors.textMuted }]}>Ticket Detail</Text>
            <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>

            <View style={styles.ticketRow}>
              <Ionicons name="calendar-outline" size={17} color={colors.textMuted} />
              <Text style={[styles.ticketText, { color: colors.textMuted }]}>
                {formatEventSchedule(event.start_datetime, event.end_datetime, false)}
              </Text>
            </View>

            <View style={styles.ticketRow}>
              <Ionicons name="person-outline" size={17} color={colors.textMuted} />
              <Text style={[styles.ticketText, { color: colors.textMuted }]}>1x Guest</Text>
            </View>

            <View style={styles.ticketRow}>
              <Ionicons name="location-outline" size={17} color={colors.textMuted} />
              <Text style={[styles.ticketText, { color: colors.textMuted }]}>
                {event.location_text}
              </Text>
            </View>

            <View style={[styles.priceBadge, { backgroundColor: `${colors.success}22` }]}>
              <Text style={[styles.priceText, { color: colors.success }]}>
                ${total.toFixed(2)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>

            <PaymentOption
              active={method === 'apple'}
              icon="logo-apple"
              title="Apple Pay"
              subtitle="Pay with your device wallet"
              onPress={() => {
                setMethod('apple');
                setErrors({});
                setBanner(null);
              }}
            />

            <PaymentOption
              active={method === 'card'}
              icon="card-outline"
              title="Credit Card"
              subtitle="Enter card details below"
              onPress={() => {
                setMethod('card');
                setBanner(null);
              }}
            />
          </View>

          {method === 'card' ? (
            <View
              style={[
                styles.section,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Credit Card</Text>

              <Field label="Card Number" error={errors.cardNumber}>
                <Input
                  value={cardNumber}
                  onChangeText={(value) => {
                    setCardNumber(formatCard(value));
                    setErrors((current) => ({ ...current, cardNumber: undefined }));
                  }}
                  placeholder="0000 0000 0000 0000"
                  keyboardType="number-pad"
                  error={errors.cardNumber}
                />
              </Field>

              <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                  <Field label="Expiry" error={errors.expiry}>
                    <Input
                      value={expiry}
                      onChangeText={(value) => {
                        const clean = value.replace(/[^\d]/g, '').slice(0, 4);
                        setExpiry(
                          clean.length > 2
                            ? `${clean.slice(0, 2)}/${clean.slice(2)}`
                            : clean
                        );
                        setErrors((current) => ({ ...current, expiry: undefined }));
                      }}
                      placeholder="MM/YY"
                      keyboardType="number-pad"
                      error={errors.expiry}
                    />
                  </Field>
                </View>

                <View style={styles.inlineField}>
                  <Field label="CVV" error={errors.cvv}>
                    <Input
                      value={cvv}
                      onChangeText={(value) => {
                        setCvv(value.replace(/\D/g, '').slice(0, 4));
                        setErrors((current) => ({ ...current, cvv: undefined }));
                      }}
                      placeholder="***"
                      keyboardType="number-pad"
                      secureTextEntry
                      error={errors.cvv}
                    />
                  </Field>
                </View>
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={handlePay}
            disabled={processing}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.payButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              pressed && styles.pressed,
              processing && styles.disabled,
            ]}
          >
            <Text style={styles.payButtonText}>
              {processing ? 'Processing...' : `Pay Now • $${total.toFixed(2)}`}
            </Text>
          </Pressable>

          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            By clicking "Pay Now", you agree to our{' '}
            <Text style={[styles.linkText, { color: colors.primary }]} onPress={() => Alert.alert('Terms of Service')}>
              Terms of Service
            </Text>{' '}
            and acknowledge our{' '}
            <Text style={[styles.linkText, { color: colors.primary }]} onPress={() => Alert.alert('Refund Policy')}>
              Refund Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PaymentOption({
  active,
  icon,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => [
        styles.paymentOption,
        { borderColor: active ? colors.primary : colors.border },
        active && styles.paymentOptionActive,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.paymentIcon}>
        <Ionicons name={icon} size={22} color={active ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.paymentTextWrap}>
        <Text style={[styles.paymentTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.paymentSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, { borderColor: active ? colors.primary : colors.border }, active && styles.radioActive]}>
        {active ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {children}
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    backgroundColor: '#3B1B21',
    padding: theme.spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  ticketCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardEyebrow: {
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '900',
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  ticketText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  priceBadge: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  priceText: {
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  section: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  paymentOption: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  paymentOptionActive: {},
  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTextWrap: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  paymentSubtitle: {
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {},
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  field: {
    gap: theme.spacing.xs,
  },
  fieldLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  inlineFields: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  inlineField: {
    flex: 1,
  },
  payButton: {
    height: 54,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  termsText: {
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  linkText: {
    fontWeight: '800',
  },
  error: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
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