import { StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

type Props = { message: string };

export function ErrorBanner({ message }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEE2E2',
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  text: { color: theme.colors.error, fontSize: theme.fontSize.sm },
});
