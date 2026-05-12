import { ReactNode, forwardRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { theme, useThemeColors } from './theme';

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
  const colors = useThemeColors();

  const hasAffix = Boolean(leftElement || rightElement);
  const wrapperStyle = [
    variant === 'pill' ? styles.pillWrap : styles.wrap,
    focused && styles.focused,
    error && styles.errored,
    {
      backgroundColor: variant === 'pill' ? colors.surface : colors.background,
      borderColor: error ? colors.error : focused ? colors.primary : colors.border,
    },
  ];

  const textInput = (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textMuted}
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
        {
          backgroundColor: variant === 'default' ? colors.background : 'transparent',
          color: colors.text,
        },
        rest.multiline && { height: 'auto' },
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
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
  },
  wrap: {
    height: 48,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillWrap: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputInner: {
    flex: 1,
    height: '100%',
    fontSize: theme.fontSize.md,
    paddingHorizontal: theme.spacing.sm,
  },
  affix: {
    paddingHorizontal: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focused: {},
  errored: {},
});
