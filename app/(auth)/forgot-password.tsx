import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { supabase } from '../../src/lib/supabase';
import { validateEmail } from '../../src/lib/validation';
import { ErrorBanner } from '../../src/ui/ErrorBanner';
import { Input } from '../../src/ui/Input';
import { theme, useThemeColors } from '../../src/ui/theme';

type Stage = 'forgot' | 'reset';
type ResetErrors = Partial<Record<'password' | 'confirm', string>>;

const RESET_COOLDOWN_MS = 15 * 60 * 1000;

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function ForgotPassword() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    mode?: string;
    type?: string;
    error?: string;
    error_code?: string;
  }>();

  const initialStage: Stage =
    firstParam(params.mode) === 'reset' || firstParam(params.type) === 'recovery'
      ? 'reset'
      : 'forgot';

  const linkError = useMemo(() => {
    const errorCode = firstParam(params.error_code);
    const rawError = firstParam(params.error);
    if (!errorCode && !rawError) return null;
    if (errorCode === 'otp_expired') return 'This reset link has expired. Please request a new one.';
    if (errorCode === 'otp_used') return 'This reset link has already been used. Please request a new one.';
    return 'This reset link is invalid.';
  }, [params.error, params.error_code]);

  const [stage, setStage] = useState<Stage>(initialStage);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(linkError);
  const [loading, setLoading] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isDevReset, setIsDevReset] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetErrors, setResetErrors] = useState<ResetErrors>({});

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownLeft = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;
  const cooldownMinutes = Math.ceil(cooldownLeft / 60000);

  // DEV: Simulate reset link for local testing
  const simulateResetLink = () => {
    setStage('reset');
    setError(null);
    setNotice(null);
    setEmail('');
    setIsDevReset(true);
  };

  const validatePassword = () => {
    const nextErrors: ResetErrors = {};

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (/\s/.test(password)) {
      nextErrors.password = 'Password cannot contain spaces';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    } else if (password.length > 64) {
      nextErrors.password = 'Password is too long (max 64 characters)';
    } else {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
        nextErrors.password = 'Password must include uppercase, lowercase, number, and special character';
      }
    }

    if (!confirmPassword) {
      nextErrors.confirm = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      nextErrors.confirm = 'Passwords do not match';
    }

    setResetErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSendResetLink = async () => {
    setNotice(null);
    setError(null);

    if (cooldownLeft > 0) {
      setError('Too many reset requests. Please try again in 15 minutes.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const validation = validateEmail(normalizedEmail);
    if (validation) {
      setEmailError(validation);
      return;
    }

    if (requestCount >= 3) {
      setCooldownUntil(Date.now() + RESET_COOLDOWN_MS);
      setError('Too many reset requests. Please try again in 15 minutes.');
      return;
    }

    try {
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: Linking.createURL('/forgot-password?mode=reset'),
      });

      if (resetError) {
        if (resetError.message.toLowerCase().includes('rate')) {
          setCooldownUntil(Date.now() + RESET_COOLDOWN_MS);
          throw new Error('Too many reset requests. Please try again in 15 minutes.');
        }
        throw new Error('Failed to send reset email. Please try again.');
      }

      setRequestCount((value) => value + 1);
      setNotice('If an account with this email exists, you will receive a reset link.');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setNotice(null);
    setError(null);

    if (!validatePassword()) return;
    // DEV: Skip Supabase call in dev mode
    if (isDevReset) {
      Alert.alert('✅ Dev Test Success', 'Password validation passed (dev mode - not actually updated).', [
        { text: 'OK', onPress: () => {
          setPassword('');
          setConfirmPassword('');
          setResetErrors({});
          setIsDevReset(false);
          setStage('forgot');
        }},
      ]);
      return;
    }


    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      Alert.alert('Password reset', 'Your password has been reset successfully.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message.toLowerCase() : '';
      if (message.includes('expired')) {
        setError('This reset link has expired. Please request a new one.');
      } else if (message.includes('used')) {
        setError('This reset link has already been used. Please request a new one.');
      } else if (message.includes('weak')) {
        setResetErrors({ password: 'Password is too weak. Please choose a stronger password.' });
      } else if (message.includes('session') || message.includes('token') || message.includes('invalid')) {
        setError('This reset link is invalid.');
      } else {
        setError('Something went wrong. Please try again.');
      }
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.text }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.background === '#0F172A' ? '#1E293B' : '#EEF0FF' }]}>
                <Ionicons
                  name={stage === 'forgot' ? 'key-outline' : 'refresh-circle-outline'}
                  size={34}
                  color={colors.primary}
                />
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                {stage === 'forgot' ? 'Forgot Password' : 'Reset Password'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {stage === 'forgot'
                  ? 'Enter your email to receive a reset link.'
                  : 'Please enter and confirm your new password to regain access to your account.'}
              </Text>

              {error ? <ErrorBanner message={error} /> : null}
              {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}

              {stage === 'forgot' && __DEV__ ? (
                <Pressable
                  onPress={simulateResetLink}
                  style={({ pressed }) => [styles.devButton, pressed && styles.pressed]}
                >
                  <Text style={styles.devButtonText}>🧪 Test: Simulate Reset Link</Text>
                </Pressable>
              ) : null}

              {stage === 'forgot' ? (
                <ForgotForm
                  email={email}
                  emailError={emailError}
                  cooldownLeft={cooldownLeft}
                  cooldownMinutes={cooldownMinutes}
                  loading={loading}
                  onEmailChange={(value) => {
                    setEmail(value);
                    setEmailError(null);
                  }}
                  onSubmit={handleSendResetLink}
                />
              ) : (
                <ResetForm
                  password={password}
                  confirmPassword={confirmPassword}
                  showPassword={showPassword}
                  errors={resetErrors}
                  loading={loading}
                  onPasswordChange={(value) => {
                    setPassword(value);
                    setResetErrors((current) => ({ ...current, password: undefined }));
                  }}
                  onConfirmPasswordChange={(value) => {
                    setConfirmPassword(value);
                    setResetErrors((current) => ({ ...current, confirm: undefined }));
                  }}
                  onTogglePassword={() => setShowPassword((value) => !value)}
                  onSubmit={handleResetPassword}
                />
              )}

              {stage === 'reset' && error ? (
                <Pressable
                  onPress={() => {
                    setStage('forgot');
                    setError(null);
                  }}
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryActionText}>Request a new link</Text>
                </Pressable>
              ) : null}

              <Link href="/login" asChild>
                <Pressable style={({ pressed }) => [styles.footerLinkWrap, pressed && styles.pressed]}>
                  <Text style={[styles.footerLink, { color: colors.textMuted }]}>Back to login</Text>
                </Pressable>
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ForgotForm({
  email,
  emailError,
  cooldownLeft,
  cooldownMinutes,
  loading,
  onEmailChange,
  onSubmit,
}: {
  email: string;
  emailError: string | null;
  cooldownLeft: number;
  cooldownMinutes: number;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <Input
          value={email}
          onChangeText={onEmailChange}
          placeholder="hello@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          variant="pill"
          error={emailError}
          leftElement={<Ionicons name="mail-outline" size={18} color={colors.textMuted} />}
        />
        {emailError ? <Text style={[styles.fieldError, { color: colors.error }]}>{emailError}</Text> : null}
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={loading || cooldownLeft > 0}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading || cooldownLeft > 0, busy: loading }}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.primary },
          (pressed || loading) && styles.pressed,
          cooldownLeft > 0 && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {cooldownLeft > 0
              ? `Send Reset Link (${cooldownMinutes}m)`
              : 'Send Reset Link'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function ResetForm({
  password,
  confirmPassword,
  showPassword,
  errors,
  loading,
  onPasswordChange,
  onConfirmPasswordChange,
  onTogglePassword,
  onSubmit,
}: {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  errors: ResetErrors;
  loading: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
        <Input
          value={password}
          onChangeText={onPasswordChange}
          placeholder="New password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          variant="pill"
          error={errors.password}
          leftElement={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
          rightElement={
            <Pressable onPress={onTogglePassword} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          }
        />
        {errors.password ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.password}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
        <Input
          value={confirmPassword}
          onChangeText={onConfirmPasswordChange}
          placeholder="Confirm password"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          variant="pill"
          error={errors.confirm}
          leftElement={<Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />}
        />
        {errors.confirm ? <Text style={[styles.fieldError, { color: colors.error }]}>{errors.confirm}</Text> : null}
      </View>

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, (pressed || loading) && styles.pressed]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Save Password</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  iconCircle: {
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  notice: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  form: {
    gap: theme.spacing.lg,
  },
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  fieldError: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  primaryButton: {
    height: 54,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  secondaryActionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '900',
  },
  footerLinkWrap: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerLink: {
    fontSize: theme.fontSize.sm,
    textDecorationLine: 'underline',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.78,
  },
  devButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCCCC',
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  devButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});
