import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useMemo, useState } from 'react';
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

import {
  formatEventSchedule,
  getEventById,
  joinEvent,
} from '../../src/lib/mockEvents';
import { Input } from '../../src/ui/Input';
import { ScreenHeader } from '../../src/ui/ScreenHeader';
import { theme, useThemeColors } from '../../src/ui/theme';

type PaymentMethod = 'apple' | 'card';
type PaymentErrors = Partial<Record<'cardNumber' | 'expiry' | 'cvv', string>>;

export default function ReviewPurchase() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const event = useMemo(() => getEventById(eventId), [eventId]);

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [banner, setBanner] = useState<string | null>(null);

  if (!event) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Review Purchase" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Ticket unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>The selected ticket could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const total = event.price;

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

  const handlePay = () => {
    setBanner(null);

    if (method === 'apple') {
      if (Platform.OS !== 'ios') {
        setBanner('Apple Pay is not available on this device');
        return;
      }
      completePayment();
      return;
    }

    if (!validateCard()) return;
    completePayment();
  };

  const completePayment = () => {
    try {
      joinEvent(event.id);
      Alert.alert('Payment complete', 'Your booking is confirmed.', [
        { text: 'OK', onPress: () => router.replace('/bookings') },
      ]);
    } catch {
      setBanner('Payment could not be completed. Please try again');
    }
  };

  const formatCard = (value: string) =>
    value
      .replace(/\D/g, '')
      .slice(0, 19)
      .replace(/(.{4})/g, '$1 ')
      .trim();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
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
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{banner}</Text>
            </View>
          ) : null}

          <View style={[styles.ticketCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardEyebrow, { color: colors.textMuted }]}>Ticket Detail</Text>
            <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
            <View style={styles.ticketRow}>
              <Ionicons name="calendar-outline" size={17} color={colors.textMuted} />
              <Text style={[styles.ticketText, { color: colors.textMuted }]}>{formatEventSchedule(event, false)}</Text>
            </View>
            <View style={styles.ticketRow}>
              <Ionicons name="person-outline" size={17} color={colors.textMuted} />
              <Text style={[styles.ticketText, { color: colors.textMuted }]}>1x Guest</Text>
            </View>
            <View style={[styles.priceBadge, { backgroundColor: `${colors.success}22` }]}>
              <Text style={[styles.priceText, { color: colors.success }]}>${total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                        setExpiry(clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean);
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
            accessibilityRole="button"
            style={({ pressed }) => [styles.payButton, pressed && styles.pressed]}
          >
            <Text style={styles.payButtonText}>Pay Now • ${total.toFixed(2)}</Text>
          </Pressable>

          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            By clicking "Pay Now", you agree to our{' '}
            <Text style={styles.linkText} onPress={() => Alert.alert('Terms of Service')}>
              Terms of Service
            </Text>{' '}
            and acknowledge our{' '}
            <Text style={styles.linkText} onPress={() => Alert.alert('Refund Policy')}>
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
      <View style={[styles.radio, active && styles.radioActive]}>
        {active ? <View style={styles.radioDot} /> : null}
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
    backgroundColor: theme.colors.surface,
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
    borderColor: theme.colors.error,
    backgroundColor: '#3B1B21',
    padding: theme.spacing.md,
  },
  errorBannerText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  ticketCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardEyebrow: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  eventTitle: {
    color: theme.colors.text,
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
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  priceBadge: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: '#12331F',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  priceText: {
    color: '#86EFAC',
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  section: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
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
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
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
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  paymentSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  field: {
    gap: theme.spacing.xs,
  },
  fieldLabel: {
    color: theme.colors.text,
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
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
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
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
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
