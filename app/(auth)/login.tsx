import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SignInError, useAuth } from '../../src/contexts/AuthContext';
import { validateEmail } from '../../src/lib/validation';
import { ErrorBanner } from '../../src/ui/ErrorBanner';
import { Input } from '../../src/ui/Input';
import { Screen } from '../../src/ui/Screen';
import { theme } from '../../src/ui/theme';

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

type Errors = Partial<Record<'email' | 'password', string>>;

function formatCooldown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Login() {
  const router = useRouter();
  const { signIn, resendVerificationFor } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const [suspended, setSuspended] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);

  // Timer for cooldown display
  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  // Clear cooldown when it expires
  useEffect(() => {
    if (cooldownUntil && now >= cooldownUntil) {
      setCooldownUntil(null);
      setFailedAttempts(0);
    }
  }, [now, cooldownUntil]);

  const cooldownActive = cooldownUntil !== null && now < cooldownUntil;
  const cooldownRemaining = cooldownUntil ? cooldownUntil - now : 0;

  const fieldsDisabled = suspended || cooldownActive || submitting;

  const validate = (): Errors => {
    const next: Errors = {};
    next.email = validateEmail(email) ?? undefined;
    if (!password) next.password = 'Password is required';
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as Errors;
  };

  const registerFailedAttempt = () => {
    const nextCount = failedAttempts + 1;
    if (nextCount >= MAX_ATTEMPTS) {
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setFailedAttempts(0);
    } else {
      setFailedAttempts(nextCount);
    }
  };

  const onSubmit = async () => {
    if (cooldownActive || suspended) return;

    setResendNotice(null);
    setNeedsVerification(false);

    const found = validate();
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signIn({ email, password });
      // Success: reset counters. Redirect handled by app/_layout.tsx.
      setFailedAttempts(0);
      setCooldownUntil(null);
    } catch (err) {
      if (err instanceof SignInError) {
        if (err.code === 'invalid-credentials') {
          setServerError(err.message);
          setPassword('');
          emailRef.current?.focus();
          registerFailedAttempt();
        } else if (err.code === 'too-many-attempts') {
          setServerError(err.message);
          setCooldownUntil(Date.now() + COOLDOWN_MS);
        } else if (err.code === 'user-disabled') {
          setServerError(err.message);
          setSuspended(true);
        } else if (err.code === 'email-not-verified') {
          setNeedsVerification(true);
          setServerError(null);
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('Something went wrong. Please try again');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setResendNotice(null);
    try {
      await resendVerificationFor({ email, password });
      setResendNotice('Verification email sent. Check your inbox.');
    } catch {
      setResendNotice('Could not send email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen scrollable style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="people" size={28} color={theme.colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to find your friends</Text>

        {serverError ? <ErrorBanner message={serverError} /> : null}

        {needsVerification ? (
          <View style={styles.verifyBox}>
            <Text style={styles.verifyText}>Please verify your email before logging in.</Text>
            <Pressable
              onPress={onResend}
              disabled={resending}
              style={({ pressed }) => [
                styles.verifyBtn,
                pressed && styles.pressed,
                resending && styles.disabled,
              ]}
            >
              <Text style={styles.verifyBtnText}>{resending ? 'Sending…' : 'Resend email'}</Text>
            </Pressable>
            {resendNotice ? <Text style={styles.resendNotice}>{resendNotice}</Text> : null}
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Input
            ref={emailRef}
            variant="pill"
            value={email}
            onChangeText={setEmail}
            placeholder="hello@example.com"
            editable={!fieldsDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            error={errors.email}
            leftElement={<Ionicons name="mail-outline" size={20} color={theme.colors.textMuted} />}
          />
          {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <Pressable onPress={() => router.push('/forgot-password')} disabled={fieldsDisabled}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </Pressable>
          </View>
          <Input
            variant="pill"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            editable={!fieldsDisabled}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            error={errors.password}
            leftElement={
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textMuted} />
            }
            rightElement={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            }
          />
          {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
        </View>

        {cooldownActive ? (
          <Text style={styles.timer}>Try again in {formatCooldown(cooldownRemaining)}</Text>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={fieldsDisabled}
          style={({ pressed }) => [
            styles.buttonShadow,
            pressed && styles.pressed,
            fieldsDisabled && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#5D5FEF', '#A5A6F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </LinearGradient>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Pressable onPress={() => router.replace('/register')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F3F6FC',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoWrap: { alignItems: 'center', marginBottom: theme.spacing.md },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  field: { marginBottom: theme.spacing.lg },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  forgot: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  fieldError: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.md,
  },
  timer: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  buttonShadow: {
    borderRadius: 26,
    shadowColor: '#5D5FEF',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    marginTop: theme.spacing.sm,
  },
  button: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  footerLink: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  verifyBox: {
    backgroundColor: '#FFF7E6',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  verifyText: {
    color: '#92400E',
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  verifyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    backgroundColor: '#F59E0B',
  },
  verifyBtnText: { color: '#fff', fontSize: theme.fontSize.sm, fontWeight: '600' },
  resendNotice: {
    color: '#92400E',
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.sm,
  },
});
