import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { theme, useThemeColors } from '../../src/ui/theme';

export default function Welcome() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={[styles.title, { color: colors.text }]}>Meet Me There</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}> 
            Discover local events. Meet people nearby.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button label="Get Started" onPress={() => router.push('/register')} />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push('/login')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  actions: { gap: theme.spacing.md },
});
