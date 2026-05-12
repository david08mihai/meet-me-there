import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme, useThemeColors } from './theme';

type Props = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
};

export function ScreenHeader({ title, onBack, right }: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.header}>
      <View style={styles.leftSlot}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.rightSlot}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  leftSlot: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
