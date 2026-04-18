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

import { theme } from './theme';

type Props = {
  children: ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scrollable = false, style }: Props) {
  const content = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, style]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.container}>
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: theme.spacing.lg },
});
