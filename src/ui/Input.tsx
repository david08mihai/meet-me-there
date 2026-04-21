import { ReactNode, forwardRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { theme } from './theme';

type Props = TextInputProps & {
  error?: string | null;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  variant?: 'default' | 'pill';
};

export const Input = forwardRef<TextInput, Props>(function Input(props, ref) {
  const {
    error,
    style,
    onFocus,
    onBlur,
    leftElement,
    rightElement,
    variant = 'default',
    ...rest
  } = props;
  const [focused, setFocused] = useState(false);

  const hasAffix = Boolean(leftElement || rightElement);
  const wrapperStyle = [
    variant === 'pill' ? styles.pillWrap : styles.wrap,
    focused && styles.focused,
    error && styles.errored,
  ];

  const textInput = (
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
        hasAffix || variant === 'pill' ? styles.inputInner : styles.input,
        focused && !hasAffix && variant === 'default' && styles.focused,
        error && !hasAffix && variant === 'default' && styles.errored,
        style,
      ]}
    />
  );

  if (!hasAffix && variant === 'default') return textInput;

  return (
    <View style={wrapperStyle}>
      {leftElement ? <View style={styles.affix}>{leftElement}</View> : null}
      {textInput}
      {rightElement ? <View style={styles.affix}>{rightElement}</View> : null}
    </View>
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
  wrap: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillWrap: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputInner: {
    flex: 1,
    height: '100%',
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    paddingHorizontal: theme.spacing.sm,
  },
  affix: {
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focused: { borderColor: theme.colors.primary },
  errored: { borderColor: theme.colors.error },
});
