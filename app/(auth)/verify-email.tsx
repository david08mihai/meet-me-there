import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { theme, useThemeColors } from '../../src/ui/theme';

const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

export default function VerifyEmail() {
  const router = useRouter();
  const { user, reloadUser, resendVerificationEmail, signOut } = useAuth();
  const colors = useThemeColors();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Poll every 5s to auto-detect verification (user clicks link in another tab)
  useEffect(() => {
    const id = setInterval(() => {
      reloadUser().catch(() => {
        setError('Could not reach Supabase to check verification status.');
      });
    }, 5000);
    return () => clearInterval(id);
  }, [reloadUser]);

  // Timer tick for the resend cooldown display
  useEffect(() => {
    if (!resendAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendAt]);

  const cooldownLeft = resendAt ? Math.max(0, resendAt - now) : 0;
  const canResend = cooldownLeft === 0 && !resending;

  const onCheck = async () => {
    setChecking(true);
    setError(null);
    setNotice(null);
    try {
      await reloadUser();
      // If verified, app/_layout.tsx redirects to /map automatically.
      // Otherwise, show a notice.
      setTimeout(() => {
        if (!checking) return;
      }, 300);
      setNotice('Still not verified. Please check your inbox.');
    } catch {
      setError('Could not check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      await resendVerificationEmail();
      setResendAt(Date.now() + RESEND_COOLDOWN_MS);
      setNotice('Verification email sent. Check your inbox.');
    } catch {
      setError('Could not send email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const onUseDifferentAccount = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
          <Ionicons name="mail-unread-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>We&apos;ve sent a verification link to</Text>
        {user?.email ? <Text style={[styles.email, { color: colors.text }]}>{user.email}</Text> : null}
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Click the link in the email to verify your account. This page will refresh automatically
          once you&apos;re verified.
        </Text>
      </View>

      {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="I've verified my email"
          onPress={onCheck}
          loading={checking}
          disabled={checking}
        />

        <Pressable
          onPress={onResend}
          disabled={!canResend}
          style={({ pressed }) => [
            styles.resendBtn,
            pressed && canResend && styles.pressed,
            !canResend && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.resendText, { color: colors.primary }]}>
            {resending
              ? 'Sending…'
              : cooldownLeft > 0
                ? `Resend email (${Math.ceil(cooldownLeft / 1000)}s)`
                : 'Resend email'}
          </Text>
        </Pressable>

        <Pressable onPress={onUseDifferentAccount} style={styles.footerLinkWrap}>
          <Text style={[styles.footerLink, { color: colors.textMuted }]}>Use a different account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  email: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  body: {
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.md,
  },
  notice: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontSize: theme.fontSize.sm,
  },
  error: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontSize: theme.fontSize.sm,
  },
  actions: { gap: theme.spacing.md },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  resendText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  footerLinkWrap: { alignItems: 'center', marginTop: theme.spacing.md },
  footerLink: {
    fontSize: theme.fontSize.sm,
    textDecorationLine: 'underline',
  },
});
