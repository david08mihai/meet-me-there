import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../src/ui/Screen';
import { theme } from '../../../src/ui/theme';

type AccountType = 'personal' | 'business';

const OPTIONS: {
  type: AccountType;
  title: string;
  description: string;
  href: '/register/personal' | '/register/business';
}[] = [
  {
    type: 'personal',
    title: 'Personal account',
    description: 'Discover events nearby and meet people in your area.',
    href: '/register/personal',
  },
  {
    type: 'business',
    title: 'Business account',
    description: 'Promote your venue or service to the local community.',
    href: '/register/business',
  },
];

export default function RegisterAccountType() {
  const router = useRouter();

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Choose the type of account you want to create.</Text>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.type}
            onPress={() => router.push(opt.href)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.cardTitle}>{opt.title}</Text>
            <Text style={styles.cardBody}>{opt.description}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => router.replace('/login')} style={styles.login}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginLink}>Sign in</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.xl },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  options: { gap: theme.spacing.md },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  cardPressed: { opacity: 0.8 },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cardBody: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  login: { marginTop: theme.spacing.xl, alignItems: 'center' },
  loginText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  loginLink: { color: theme.colors.primary, fontWeight: '600' },
});
