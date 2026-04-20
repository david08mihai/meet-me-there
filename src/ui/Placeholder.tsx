import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from './Screen';
import { theme } from './theme';

type Props = {
  title: string;
  owner?: string;
  description?: string;
};

export function Placeholder({ title }: Props) {
  return (
    <Screen>
      <View style={styles.wrapper}>
        <View style={styles.iconCircle}>
          <Ionicons name="construct-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>Coming soon.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
