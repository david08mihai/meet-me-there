import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  error?: string | null;
};

export function Checkbox({ value, onChange, label, error }: Props) {
  return (
    <View>
      <Pressable
        onPress={() => onChange(!value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value }}
        style={styles.row}
      >
        <View
          style={[
            styles.box,
            value && styles.boxChecked,
            error && !value ? styles.boxErrored : null,
          ]}
        >
          {value ? <Text style={styles.check}>✓</Text> : null}
        </View>
        <View style={styles.labelWrap}>
          {typeof label === 'string' ? <Text style={styles.label}>{label}</Text> : label}
        </View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  box: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginTop: 2,
    backgroundColor: theme.colors.background,
  },
  boxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  boxErrored: { borderColor: theme.colors.error },
  check: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 16 },
  labelWrap: { flex: 1 },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  error: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
