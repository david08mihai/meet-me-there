import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';

import { supabase } from '../../src/lib/supabase';
import { Button } from '../../src/ui/Button';
import { FormField } from '../../src/ui/FormField';
import { Input } from '../../src/ui/Input';
import { Screen } from '../../src/ui/Screen';
import { theme } from '../../src/ui/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to log in'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MEET ME THERE</Text>
        <Text style={styles.title}>Log in</Text>
        <Text style={styles.subtitle}>
          Welcome back. Sign in to continue discovering nearby events and people.
        </Text>
      </View>

      <View style={styles.card}>
        <FormField label="Email" required>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </FormField>

        <FormField label="Password" required>
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </FormField>

        <Link href="/forgot-password" asChild>
          <Pressable style={styles.forgotPasswordWrap}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        </Link>

        <Button
          label="Log in"
          onPress={handleLogin}
          loading={loading}
          style={styles.submitButton}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  eyebrow: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  forgotPasswordWrap: {
    alignSelf: 'flex-end',
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  footerLink: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});