import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChatMessage,
  getChatMessages,
  getEventById,
  markMessageDeleted,
  receiveMockReply,
  reportMessage,
  sendChatMessage,
} from '../../src/lib/mockEvents';
import { Input } from '../../src/ui/Input';
import { ScreenHeader } from '../../src/ui/ScreenHeader';
import { theme } from '../../src/ui/theme';

export default function Chat() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const event = useMemo(() => getEventById(eventId ?? 'jazz-night'), [eventId]);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    getChatMessages(event?.id ?? 'jazz-night'),
  );
  const [draft, setDraft] = useState('');
  const [attachmentLabel, setAttachmentLabel] = useState<string | undefined>();

  useEffect(() => {
    setMessages(getChatMessages(event?.id ?? 'jazz-night'));
  }, [event?.id]);

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Event Chat" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Chat unavailable</Text>
          <Text style={styles.emptyText}>The selected event chat could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const refreshMessages = () => setMessages(getChatMessages(event.id));

  const handleMessageActions = (message: ChatMessage) => {
    Alert.alert('Message Actions', message.isDeleted ? 'This message was deleted' : message.text, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete for Yourself',
        style: 'destructive',
        onPress: () => {
          markMessageDeleted(event.id, message.id);
          refreshMessages();
        },
      },
      {
        text: 'Report',
        onPress: () => {
          reportMessage(event.id, message.id);
          refreshMessages();
          Alert.alert('Reported', 'The message was sent for moderation review.');
        },
      },
    ]);
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed && !attachmentLabel) return;

    const sent = sendChatMessage({
      eventId: event.id,
      text: trimmed || 'Attachment',
      attachmentLabel,
    });
    setMessages((current) => [...current, sent]);
    setDraft('');
    setAttachmentLabel(undefined);

    setTimeout(() => {
      const reply = receiveMockReply(event.id);
      setMessages((current) => [...current, reply]);
    }, 700);
  };

  const handleAttachment = () => {
    setAttachmentLabel('Attachment selected');
    Alert.alert('Attachment', 'Attachment selected.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Event Chat" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.chatHeader}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.onlineText}>{Math.max(event.participantNames.length, 12)} members online</Text>
        </View>

        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>TODAY</Text>
          </View>

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onLongPress={() => handleMessageActions(message)}
            />
          ))}
        </ScrollView>

        {attachmentLabel ? (
          <View style={styles.attachmentChip}>
            <Ionicons name="attach-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.attachmentText}>{attachmentLabel}</Text>
            <Pressable onPress={() => setAttachmentLabel(undefined)} hitSlop={8}>
              <Ionicons name="close" size={16} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <Pressable
            onPress={handleAttachment}
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
            style={({ pressed }) => [styles.inputIconButton, pressed && styles.pressed]}
          >
            <Ionicons name="attach-outline" size={22} color={theme.colors.primary} />
          </Pressable>
          <View style={styles.inputWrap}>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message..."
              variant="pill"
            />
          </View>
          <Pressable
            onPress={() => setDraft((value) => `${value}:) `)}
            accessibilityRole="button"
            accessibilityLabel="Insert emoji"
            style={({ pressed }) => [styles.inputIconButton, pressed && styles.pressed]}
          >
            <Ionicons name="happy-outline" size={22} color={theme.colors.primary} />
          </Pressable>
          <Pressable
            onPress={handleSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  onLongPress,
}: {
  message: ChatMessage;
  onLongPress: () => void;
}) {
  const outgoing = message.isCurrentUser;

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={280}
      style={[
        styles.messageRow,
        outgoing ? styles.messageRowOutgoing : styles.messageRowIncoming,
      ]}
    >
      {!outgoing ? <Image source={{ uri: message.senderAvatar }} style={styles.messageAvatar} /> : null}
      <View style={[styles.bubble, outgoing ? styles.outgoingBubble : styles.incomingBubble]}>
        {!outgoing ? (
          <View style={styles.senderRow}>
            <Text style={styles.senderName}>{message.senderName}</Text>
            {message.isOrganizer ? (
              <View style={styles.organizerBadge}>
                <Text style={styles.organizerBadgeText}>Organizer</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {message.isDeleted ? (
          <Text style={styles.deletedText}>This message was deleted</Text>
        ) : (
          <>
            {message.attachmentLabel ? (
              <View style={styles.messageAttachment}>
                <Ionicons
                  name="document-attach-outline"
                  size={16}
                  color={outgoing ? '#FFFFFF' : theme.colors.primary}
                />
                <Text style={[styles.messageAttachmentText, outgoing && styles.outgoingText]}>
                  {message.attachmentLabel}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.messageText, outgoing && styles.outgoingText]}>{message.text}</Text>
          </>
        )}
        <Text style={[styles.messageTime, outgoing && styles.outgoingTime]}>
          {new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(
            new Date(message.sentAt),
          )}
          {outgoing ? ' - Sent' : ''}
          {message.isReported ? ' - Reported' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  flex: {
    flex: 1,
  },
  chatHeader: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  onlineText: {
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  messages: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  dateSeparator: {
    alignSelf: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
  },
  dateSeparatorText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
  },
  messageRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    maxWidth: '88%',
  },
  messageRowIncoming: {
    alignSelf: 'flex-start',
  },
  messageRowOutgoing: {
    alignSelf: 'flex-end',
  },
  messageAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.border,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 5,
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outgoingBubble: {
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  senderName: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
  },
  organizerBadge: {
    borderRadius: theme.radius.full,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  organizerBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '900',
  },
  messageText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  outgoingText: {
    color: '#FFFFFF',
  },
  deletedText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontStyle: 'italic',
  },
  messageTime: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  outgoingTime: {
    color: 'rgba(255,255,255,0.8)',
  },
  messageAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  messageAttachmentText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  attachmentChip: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: '#EEF0FF',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  attachmentText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  inputWrap: {
    flex: 1,
  },
  inputIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
