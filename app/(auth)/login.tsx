import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/contexts/AuthContext';
import { isAuthNetworkError, signInLocalAccount } from '../../src/lib/localAuth';
import { supabase } from '../../src/lib/supabase';
import { validateEmail } from '../../src/lib/validation';
import { ErrorBanner } from '../../src/ui/ErrorBanner';
import { Input } from '../../src/ui/Input';
import { theme, useThemeColors } from '../../src/ui/theme';

export default function Login() {
  const router = useRouter();
  const { setLocalSession } = useAuth();
  const emailInputRef = useRef<TextInput>(null);
  const colors = useThemeColors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suspendedAccount, setSuspendedAccount] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Timer for cooldown and resend email state
  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownLeft = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;
  const cooldownMinutes = Math.ceil(cooldownLeft / 60000);
  const isLockedOut = cooldownLeft > 0;

  const handleResendEmail = async () => {
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });

      if (!error) {
        setErrorMessage('Verification email sent. Please check your inbox.');
        setShowResendEmail(false);
      }
    } catch {
      setErrorMessage('Failed to resend email. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const nextEmailError = validateEmail(normalizedEmail);
    const nextPasswordError = password ? null : 'Password is required';

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setErrorMessage(null);
    setShowResendEmail(false);

    if (nextEmailError || nextPasswordError) return;
    if (isLockedOut) {
      setErrorMessage(`Too many login attempts. Please try again in ${cooldownMinutes} minute${cooldownMinutes !== 1 ? 's' : ''}.`);
      return;
    }
    if (suspendedAccount) {
      setErrorMessage('Your account has been suspended. Please contact support');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error('Something went wrong. Please try again.');

      if (!user.email_confirmed_at) {
        setShowResendEmail(true);
        setErrorMessage('Please verify your email before logging in');
        return;
      }

      // Success - reset attempt counter
      setFailedAttempts(0);
      setCooldownUntil(null);
      router.replace('/map');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log in';

      if (isAuthNetworkError(error)) {
        const localUser = await signInLocalAccount(normalizedEmail, password);

        if (localUser) {
          await setLocalSession(localUser);
          setFailedAttempts(0);
          setCooldownUntil(null);
          router.replace('/map');
          return;
        }

        setErrorMessage(
          'Cannot reach Supabase right now. If you just created a local development account, check the email and password. If this is a Supabase account, update EXPO_PUBLIC_SUPABASE_URL in .env.',
        );
        return;
      }

      // Handle suspended account
      if (message.toLowerCase().includes('account is disabled') ||
          message.toLowerCase().includes('suspended')) {
        setSuspendedAccount(true);
        setErrorMessage('Your account has been suspended. Please contact support');
        return;
      }

      // Handle email not confirmed
      if (message.toLowerCase().includes('email not confirmed')) {
        setShowResendEmail(true);
        setErrorMessage('Please verify your email before logging in');
        return;
      }

      // Handle invalid credentials
      if (message.toLowerCase().includes('invalid login credentials') ||
          message.toLowerCase().includes('invalid grant')) {
        setPassword('');
        setPasswordError(null);
        emailInputRef.current?.blur();

        // Increment failed attempts and set cooldown if needed
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= 5) {
          const cooldownEnd = Date.now() + (15 * 60 * 1000); // 15 minutes
          setCooldownUntil(cooldownEnd);
          setErrorMessage('Too many login attempts. Please try again in 15 minutes.');
        } else {
          setErrorMessage('Invalid email or password');
        }
        return;
      }

      // Unknown error
      setErrorMessage('Something went wrong. Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={colors.background === '#0F172A' ? ['#0F172A', '#111827'] : ['#EEF0FF', '#E4F5ED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBg}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.logoCircle, { backgroundColor: colors.surface }]}>
                <View
                  style={[
                    styles.logoDot,
                    { width: 18, height: 18, top: 22, right: 18 },
                  ]}
                />
                <View
                  style={[
                    styles.logoDot,
                    { width: 12, height: 12, top: 24, left: 22 },
                  ]}
                />
                <View
                  style={[
                    styles.logoDot,
                    { width: 10, height: 10, bottom: 20, right: 26 },
                  ]}
                />
              </View>

              <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to find your friends</Text>

              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                <Input
                  ref={emailInputRef}
                  variant="pill"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setEmailError(null);
                    setErrorMessage(null);
                    setShowResendEmail(false);
                  }}
                  placeholder="hello@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={emailError}
                  editable={!suspendedAccount}
                  leftElement={
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={colors.textMuted}
                    />
                  }
                />
                {emailError ? <Text style={[styles.fieldError, { color: colors.error }]}>{emailError}</Text> : null}
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                  <Link href="/forgot-password" asChild>
                    <Pressable hitSlop={8} disabled={suspendedAccount}>
                      <Text style={[styles.forgotText, { color: colors.primary }, suspendedAccount && styles.disabled]}>Forgot Password?</Text>
                    </Pressable>
                  </Link>
                </View>
                <Input
                  variant="pill"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setPasswordError(null);
                    setErrorMessage(null);
                    setShowResendEmail(false);
                  }}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={passwordError}
                  editable={!suspendedAccount}
                  leftElement={
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={colors.textMuted}
                    />
                  }
                  rightElement={
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      disabled={suspendedAccount}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  }
                />
                {passwordError ? <Text style={[styles.fieldError, { color: colors.error }]}>{passwordError}</Text> : null}
              </View>

              {isLockedOut && (
                <View style={styles.timerBanner}>
                  <Ionicons name="time-outline" size={16} color={colors.error} />
                  <Text style={[styles.timerText, { color: colors.error }]}>
                    Try again in {cooldownMinutes} minute{cooldownMinutes !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}

              {showResendEmail && (
                <Pressable
                  onPress={handleResendEmail}
                  disabled={resendingEmail}
                  style={({ pressed }) => [styles.resendButton, pressed && styles.pressed]}
                >
                  {resendingEmail ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={16} color={colors.primary} />
                      <Text style={[styles.resendButtonText, { color: colors.primary }]}>Resend Verification Email</Text>
                    </>
                  )}
                </Pressable>
              )}

              <Pressable
                onPress={handleLogin}
                disabled={loading || isLockedOut || suspendedAccount}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.loginButtonWrap,
                  (pressed || loading) && styles.pressed,
                  (isLockedOut || suspendedAccount) && styles.disabled,
                ]}
              >
                <LinearGradient
                  colors={
                    isLockedOut || suspendedAccount
                        ? [colors.textMuted, colors.textMuted]
                        : [colors.primary, '#8B8EEE']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonLabel}>Log In</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.signupRow}>
                <Text style={[styles.signupText, { color: colors.textMuted }]}>
                  Don&apos;t have an account?{' '}
                </Text>
                <Link href="/register" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={[styles.signupLink, { color: colors.primary }]}>Sign Up</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBg: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF0FF',
    marginBottom: theme.spacing.lg,
  },
  logoDot: {
    position: 'absolute',
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  field: {
    width: '100%',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  fieldError: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  forgotText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  loginButtonWrap: {
    width: '100%',
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  loginButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonLabel: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  pressed: { opacity: 0.85 },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  signupText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  signupLink: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  timerBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#FFE8E8',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  timerText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.error,
  },
  resendButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  resendButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
