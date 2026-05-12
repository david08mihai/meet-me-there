import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { isAuthNetworkError, signInLocalAccount } from '../../src/lib/localAuth';
import { supabase } from '../../src/lib/supabase';
import { validateEmail } from '../../src/lib/validation';
import { ErrorBanner } from '../../src/ui/ErrorBanner';
import { Input } from '../../src/ui/Input';
import { theme } from '../../src/ui/theme';

export default function Login() {
  const router = useRouter();
  const { setLocalSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const nextEmailError = validateEmail(normalizedEmail);
    const nextPasswordError = password ? null : 'Password is required';

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setErrorMessage(null);

    if (nextEmailError || nextPasswordError) return;

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
        router.replace('/verify-email');
        return;
      }

      router.replace('/map');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to log in';

      if (isAuthNetworkError(error)) {
        const localUser = await signInLocalAccount(normalizedEmail, password);

        if (localUser) {
          await setLocalSession(localUser);
          router.replace('/map');
          return;
        }

        setErrorMessage(
          'Cannot reach Supabase right now. If you just created a local development account, check the email and password. If this is a Supabase account, update EXPO_PUBLIC_SUPABASE_URL in .env.',
        );
        return;
      }

      if (message.toLowerCase().includes('email not confirmed')) {
        let resendError: unknown = null;
        try {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: normalizedEmail,
          });
          resendError = error;
        } catch (error) {
          resendError = error;
        }

        setErrorMessage(
          resendError
            ? 'Email not confirmed. Please check your inbox for the confirmation email.'
            : 'Email not confirmed. I sent you a new confirmation email. Please confirm it, then log in again.',
        );
        return;
      }

      if (message.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage(
          'Invalid login credentials. If this account was created before the Supabase setup, create it again with Sign Up or reset the password.',
        );
        return;
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#EEF0FF', '#E4F5ED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBg}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.logoCircle}>
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

              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to find your friends</Text>

              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <Input
                  variant="pill"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setEmailError(null);
                    setErrorMessage(null);
                  }}
                  placeholder="hello@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={emailError}
                  leftElement={
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  }
                />
                {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Password</Text>
                  <Link href="/forgot-password" asChild>
                    <Pressable hitSlop={8}>
                      <Text style={styles.forgotText}>Forgot Password?</Text>
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
                  }}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={passwordError}
                  leftElement={
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  }
                  rightElement={
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  }
                />
                {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.loginButtonWrap,
                  (pressed || loading) && styles.pressed,
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#8B8EEE']}
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
                <Text style={styles.signupText}>
                  Don&apos;t have an account?{' '}
                </Text>
                <Link href="/register" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={styles.signupLink}>Sign Up</Text>
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
});
