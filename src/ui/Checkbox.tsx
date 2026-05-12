import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme, useThemeColors } from './theme';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  error?: string | null;
};

export function Checkbox({ value, onChange, label, error }: Props) {
  const colors = useThemeColors();

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
            { backgroundColor: value ? colors.primary : colors.background, borderColor: error && !value ? colors.error : value ? colors.primary : colors.border },
          ]}
        >
          {value ? <Text style={[styles.check, { color: '#FFFFFF' }]}>✓</Text> : null}
        </View>
        <View style={styles.labelWrap}>
          {typeof label === 'string' ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : label}
        </View>
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  check: { fontSize: 14, fontWeight: '700', lineHeight: 16 },
  labelWrap: { flex: 1 },
  label: {
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  error: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
