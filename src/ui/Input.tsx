import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

import { theme } from './theme';

type Props = TextInputProps & {
  error?: string | null;
};

export const Input = forwardRef<TextInput, Props>(function Input(props, ref) {
  const { error, style, onFocus, onBlur, ...rest } = props;
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={theme.colors.textMuted}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        styles.input,
        focused && styles.focused,
        error && styles.errored,
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  focused: { borderColor: theme.colors.primary },
  errored: { borderColor: theme.colors.error },
});
