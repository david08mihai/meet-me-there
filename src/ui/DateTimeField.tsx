import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme, useThemeColors } from './theme';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  error?: string | null;
  minimumDate?: Date;
};

type AndroidPickerMode = 'date' | 'time';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toInputValue(date: Date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromInputValue(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function nextDefaultDate() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

function WebDateTimeField({ value, onChange, error, minimumDate }: Props) {
  const colors = useThemeColors();

  return React.createElement('input', {
    type: 'datetime-local',
    value: value ? toInputValue(value) : '',
    min: minimumDate ? toInputValue(minimumDate) : undefined,
    onChange: (event: { target: { value: string } }) => {
      const parsed = fromInputValue(event.target.value);
      if (parsed) onChange(parsed);
    },
    style: {
      height: 48,
      width: '100%',
      boxSizing: 'border-box',
      border: `1px solid ${error ? colors.error : colors.border}`,
      borderRadius: theme.radius.md,
      padding: `0 ${theme.spacing.md}px`,
      fontSize: theme.fontSize.md,
      color: colors.text,
      backgroundColor: colors.background,
      fontFamily: 'inherit',
      outline: 'none',
    },
  });
}

export function DateTimeField(props: Props) {
  if (Platform.OS === 'web') return <WebDateTimeField {...props} />;
  return <NativeDateTimeField {...props} />;
}

function NativeDateTimeField({
  value,
  onChange,
  placeholder = 'Select date and time',
  error,
  minimumDate,
}: Props) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? nextDefaultDate());
  const [androidMode, setAndroidMode] = useState<AndroidPickerMode>('date');

  const openPicker = () => {
    setDraft(value ?? nextDefaultDate());
    setAndroidMode('date');
    setOpen(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type !== 'set' || !selected) {
      setOpen(false);
      return;
    }

    if (androidMode === 'date') {
      const nextDraft = new Date(draft);
      nextDraft.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setDraft(nextDraft);
      setAndroidMode('time');
      return;
    }

    const nextDate = new Date(draft);
    nextDate.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(nextDate);
    setOpen(false);
  };

  const handleIosChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) setDraft(selected);
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.error : colors.border,
          },
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.value, { color: colors.text }, !value && { color: colors.textMuted }]}>
          {value ? formatDateTime(value) : placeholder}
        </Text>
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draft}
          mode={androidMode}
          display="default"
          is24Hour
          onChange={handleAndroidChange}
          minimumDate={androidMode === 'date' ? minimumDate : undefined}
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
            <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
              <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={[styles.sheetAction, { color: colors.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.sheetAction, { color: colors.primary, fontWeight: '600' }]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="datetime"
                display="spinner"
                onChange={handleIosChange}
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
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  value: { fontSize: theme.fontSize.md },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingBottom: theme.spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
  },
  sheetAction: {
    fontSize: theme.fontSize.md,
    paddingHorizontal: theme.spacing.sm,
  },
});
