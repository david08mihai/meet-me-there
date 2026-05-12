import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme, useThemeColors } from './theme';

type Props = {
  children: ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scrollable = false, style }: Props) {
  const colors = useThemeColors();

  const content = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { backgroundColor: colors.background }, style]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { backgroundColor: colors.background }, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: theme.spacing.lg },
});
