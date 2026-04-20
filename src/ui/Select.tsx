import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

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
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, error ? styles.errored : null]}
        accessibilityRole="button"
      >
        <Text style={[styles.value, !selected && styles.placeholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
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
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
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
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errored: { borderColor: theme.colors.error },
  value: { fontSize: theme.fontSize.md, color: theme.colors.text },
  placeholder: { color: theme.colors.textMuted },
  caret: { color: theme.colors.textMuted, fontSize: theme.fontSize.md },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    maxHeight: '70%',
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  option: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  optionSelected: { backgroundColor: theme.colors.surface },
  optionPressed: { opacity: 0.7 },
  optionLabel: { fontSize: theme.fontSize.md, color: theme.colors.text },
  optionLabelSelected: { color: theme.colors.primary, fontWeight: '600' },
});
