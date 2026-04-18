import { StyleSheet, Text, View } from 'react-native';

import { Screen } from './Screen';
import { theme } from './theme';

type Props = {
  title: string;
  owner: string;
  description?: string;
};

export function Placeholder({ title, owner, description }: Props) {
  return (
    <Screen>
      <View style={styles.wrapper}>
        <Text style={styles.badge}>TODO · {owner}</Text>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.body}>{description}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.md },
  badge: {
    alignSelf: 'flex-start',
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    overflow: 'hidden',
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text,
  },
  body: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
});
