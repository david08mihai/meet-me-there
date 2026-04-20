import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  error?: string | null;
  maximumDate?: Date;
  minimumDate?: Date;
};

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromYMD(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// Web implementation uses the browser's native <input type="date">.
function WebDateField({ value, onChange, error, maximumDate, minimumDate }: Props) {
  return React.createElement('input', {
    type: 'date',
    value: value ? toYMD(value) : '',
    max: maximumDate ? toYMD(maximumDate) : undefined,
    min: minimumDate ? toYMD(minimumDate) : undefined,
    onChange: (e: { target: { value: string } }) => {
      const parsed = fromYMD(e.target.value);
      if (parsed) onChange(parsed);
    },
    style: {
      height: 48,
      width: '100%',
      boxSizing: 'border-box',
      border: `1px solid ${error ? theme.colors.error : theme.colors.border}`,
      borderRadius: theme.radius.md,
      padding: `0 ${theme.spacing.md}px`,
      fontSize: theme.fontSize.md,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      fontFamily: 'inherit',
      outline: 'none',
    },
  });
}

export function DateField(props: Props) {
  if (Platform.OS === 'web') return <WebDateField {...props} />;

  const { value, onChange, placeholder = 'Select date', error, maximumDate, minimumDate } = props;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date(2000, 0, 1));

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'set' && selected) onChange(selected);
  };

  const handleIosChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) setDraft(selected);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(value ?? new Date(2000, 0, 1));
          setOpen(true);
        }}
        style={[styles.trigger, error ? styles.errored : null]}
        accessibilityRole="button"
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? toYMD(value) : placeholder}
        </Text>
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value ?? new Date(2000, 0, 1)}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.sheetAction}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.sheetAction, styles.sheetDone]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                onChange={handleIosChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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
    justifyContent: 'center',
  },
  errored: { borderColor: theme.colors.error },
  value: { fontSize: theme.fontSize.md, color: theme.colors.text },
  placeholder: { color: theme.colors.textMuted },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingBottom: theme.spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetAction: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.sm,
  },
  sheetDone: { color: theme.colors.primary, fontWeight: '600' },
});
