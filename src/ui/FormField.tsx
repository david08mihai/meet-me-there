import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

type Props = {
  label: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
};

export function FormField({ label, error, required, children }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.lg },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  required: { color: theme.colors.error },
  error: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
