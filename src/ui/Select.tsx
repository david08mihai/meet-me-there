import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text } from 'react-native';

import { theme, useThemeColors } from './theme';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T | null;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  error?: string | null;
  title?: string;
};

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  error,
  title,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const colors = useThemeColors();
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { backgroundColor: colors.background, borderColor: error ? colors.error : colors.border },
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.value, { color: selected ? colors.text : colors.textMuted }, !selected && styles.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={[styles.caret, { color: colors.textMuted }]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
            {title ? <Text style={[styles.title, { color: colors.text, borderBottomColor: colors.border }]}>{title}</Text> : null}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: isSelected ? colors.surface : colors.background },
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? colors.primary : colors.text },
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 48,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { fontSize: theme.fontSize.md },
  placeholder: {},
  caret: { fontSize: theme.fontSize.md },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    maxHeight: '70%',
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
  },
  option: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  optionPressed: { opacity: 0.7 },
  optionLabel: { fontSize: theme.fontSize.md },
  optionLabelSelected: { fontWeight: '600' },
});
