import { StyleSheet, Text, View } from 'react-native';

import { theme, useThemeColors } from './theme';

type Props = { message: string };

export function ErrorBanner({ message }: Props) {
  const colors = useThemeColors();
  // derive a muted background from the error color
  const bannerBg = colors.background === '#0F172A' ? '#3B1B21' : '#FEE2E2';

  return (
    <View style={[styles.banner, { backgroundColor: bannerBg, borderColor: colors.error }]} accessibilityRole="alert">
      <Text style={[styles.text, { color: colors.error }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  text: { fontSize: theme.fontSize.sm },
});
