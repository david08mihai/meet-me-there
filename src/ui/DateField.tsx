import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme, useThemeColors } from './theme';

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

function WebDateField({
  value,
  onChange,
  error,
  maximumDate,
  minimumDate,
}: Props) {
  const colors = useThemeColors();

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
      border: `1px solid ${error ? '#DC2626' : colors.border}`,
      borderRadius: theme.radius.md,
      padding: `0 ${theme.spacing.md}px`,
      fontSize: theme.fontSize.md,
      color: colors.text,
      backgroundColor: colors.surface,
      fontFamily: 'inherit',
      outline: 'none',
    },
  });
}

export function DateField(props: Props) {
  if (Platform.OS === 'web') return <WebDateField {...props} />;
  return <NativeDateField {...props} />;
}

function NativeDateField(props: Props) {
  const {
    value,
    onChange,
    placeholder = 'Select date',
    error,
    maximumDate,
    minimumDate,
  } = props;

  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date(2000, 0, 1));

  const handleAndroidChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    setOpen(false);

    if (event.type === 'set' && selected) {
      onChange(selected);
    }
  };

  const handleIosChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      setDraft(selected);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(value ?? new Date(2000, 0, 1));
          setOpen(true);
        }}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: error ? '#DC2626' : colors.border,
          },
        ]}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.value,
            {
              color: value ? colors.text : colors.textMuted,
            },
          ]}
        >
          {value ? toYMD(value) : placeholder}
        </Text>
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value ?? new Date(2000, 0, 1)}
          mode="date"
          display="calendar"
          onChange={handleAndroidChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          themeVariant="light"
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
            <Pressable
              style={[
                styles.sheet,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => {}}
            >
              <View
                style={[
                  styles.sheetHeader,
                  {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={[styles.cancelButton, { color: colors.text }]}>Cancel</Text>
                </Pressable>

                <Text style={[styles.sheetTitle, { color: colors.text }]}>Select date</Text>

                <Pressable
                  onPress={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.doneButton, { color: colors.primary }]}>Done</Text>
                </Pressable>
              </View>

              <View style={[styles.pickerWrapper, { backgroundColor: colors.surface }]}>
                <DateTimePicker
                  value={draft}
                  mode="date"
                  display="spinner"
                  onChange={handleIosChange}
                  maximumDate={maximumDate}
                  minimumDate={minimumDate}
                  themeVariant="light"
                  textColor={colors.text}
                  accentColor={colors.primary}
                  style={[styles.iosPicker, { backgroundColor: colors.surface }]}
                />
              </View>
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
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },

  value: {
    fontSize: theme.fontSize.md,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  sheet: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingBottom: theme.spacing.lg,
    overflow: 'hidden',
  },

  sheetHeader: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
  },

  sheetTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },

  cancelButton: {
    fontSize: theme.fontSize.md,
  },

  doneButton: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },

  pickerWrapper: {
  },

  iosPicker: {
  },
});