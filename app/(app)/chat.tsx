import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { sendPushNotification } from '../../src/lib/notifications';
import { Input } from '../../src/ui/Input';
import { ScreenHeader } from '../../src/ui/ScreenHeader';
import { theme, useThemeColors } from '../../src/ui/theme';

type EventRow = {
  event_id: number;
  organizer_user_id: string;
  title: string;
};

type EventChatRow = {
  chat_id: number;
  event_id: number;
};

type ChatMessageRow = {
  message_id: number;
  chat_id: number;
  sender_user_id: string;
  message_text: string | null;
  sent_at: string;
  is_deleted: boolean;
};

type PersonalProfileRow = {
  user_id: string;
  full_name: string;
  photo_url: string | null;
};

type BusinessProfileRow = {
  user_id: string;
  business_name: string;
  logo_url: string | null;
};

type DisplayMessage = {
  id: number;
  senderUserId: string;
  senderName: string;
  senderAvatar: string | null;
  isOrganizer: boolean;
  isCurrentUser: boolean;
  text: string;
  sentAt: string;
  isDeleted: boolean;
};

type RealtimeStatus = 'connecting' | 'live' | 'fallback';

export default function Chat() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();

  const params = useLocalSearchParams<{ eventId?: string }>();
  const rawEventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const eventId = rawEventId ? Number(rawEventId) : NaN;
  const validEventId = useMemo(() => Number.isFinite(eventId), [eventId]);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [chat, setChat] = useState<EventChatRow | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const messagesScrollRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(
    async (chatId: number, currentEvent: EventRow) => {
      const { data: rawMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('message_id, chat_id, sender_user_id, message_text, sent_at, is_deleted')
        .eq('chat_id', chatId)
        .order('sent_at', { ascending: true });

      if (messagesError) throw messagesError;

      const senderIds = [...new Set((rawMessages ?? []).map((m) => m.sender_user_id))];

      let personalProfiles: PersonalProfileRow[] = [];
      let businessProfiles: BusinessProfileRow[] = [];

      if (senderIds.length > 0) {
        const [{ data: personalData, error: personalError }, { data: businessData, error: businessError }] =
          await Promise.all([
            supabase
              .from('personal_profiles')
              .select('user_id, full_name, photo_url')
              .in('user_id', senderIds),
            supabase
              .from('business_profiles')
              .select('user_id, business_name, logo_url')
              .in('user_id', senderIds),
          ]);

        if (personalError) throw personalError;
        if (businessError) throw businessError;

        personalProfiles = personalData ?? [];
        businessProfiles = businessData ?? [];
      }

      const personalMap = new Map(personalProfiles.map((p) => [p.user_id, p]));
      const businessMap = new Map(businessProfiles.map((b) => [b.user_id, b]));

      const hydrated: DisplayMessage[] = (rawMessages ?? []).map((message: ChatMessageRow) => {
        const personalProfile = personalMap.get(message.sender_user_id);
        const businessProfile = businessMap.get(message.sender_user_id);

        const senderName =
          businessProfile?.business_name ??
          personalProfile?.full_name ??
          'Unknown user';

        const senderAvatar =
          businessProfile?.logo_url ??
          personalProfile?.photo_url ??
          null;

        return {
          id: message.message_id,
          senderUserId: message.sender_user_id,
          senderName,
          senderAvatar,
          isOrganizer: currentEvent.organizer_user_id === message.sender_user_id,
          isCurrentUser: user?.id === message.sender_user_id,
          text: message.message_text ?? '',
          sentAt: message.sent_at,
          isDeleted: message.is_deleted,
        };
      });

      setMessages(hydrated);
    },
    [user?.id]
  );

  const loadChatData = useCallback(async () => {
    if (!validEventId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('event_id, organizer_user_id, title')
        .eq('event_id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: chatData, error: chatError } = await supabase
        .from('event_chats')
        .select('chat_id, event_id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (chatError) throw chatError;

      let nextChat = chatData;

      if (!nextChat) {
        const { data: createdChat, error: createChatError } = await supabase
          .from('event_chats')
          .upsert({ event_id: eventId }, { onConflict: 'event_id' })
          .select('chat_id, event_id')
          .single();

        if (createChatError) throw createChatError;
        nextChat = createdChat;
      }

      setChat(nextChat);

      await loadMessages(nextChat.chat_id, eventData);
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to load chat'
      );
    } finally {
      setLoading(false);
    }
  }, [eventId, loadMessages, validEventId]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  useEffect(() => {
    if (!chat?.chat_id || !event) return;

    let active = true;

    const syncMessages = async () => {
      try {
        await loadMessages(chat.chat_id, event);
      } catch (error) {
        console.error(error);
      }
    };

    setRealtimeStatus('connecting');

    const channel = supabase
      .channel(`chat-${chat.chat_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chat.chat_id}`,
        },
        async () => {
          await syncMessages();
        }
      )
      .subscribe((status) => {
        if (!active) return;

        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live');
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('fallback');
        }
      });

    const fallbackTimer = setInterval(syncMessages, 3500);

    return () => {
      active = false;
      clearInterval(fallbackTimer);
      supabase.removeChannel(channel);
    };
  }, [chat?.chat_id, event, loadMessages]);

  useEffect(() => {
    requestAnimationFrame(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length]);

  const handleSend = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to send messages.');
      return;
    }

    if (!chat || !event) {
      Alert.alert('Error', 'Chat is not ready yet.');
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) return;

    try {
      setSending(true);

      const { error } = await supabase.from('chat_messages').insert({
        chat_id: chat.chat_id,
        sender_user_id: user.id,
        message_text: trimmed,
      });

      if (error) throw error;
      const { data: participants, error: participantsError } = await supabase
          .from("bookings")
          .select("user_id")
          .eq("event_id", event.event_id)
            .eq("booking_status", "confirmed");
          
          console.log(participants, participantsError)
          
      if (participantsError) throw participantsError;
          for (const p of participants ?? []) {
            if (p.user_id === user.id) continue;

            await supabase.functions.invoke("send-notification", {
              body: {
                receiverId: p.user_id,
                title: "You have a new message in the event chat!",
                body: trimmed,
              },
            });
          }
      setDraft('');
      await loadMessages(chat.chat_id, event);

    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send message'
      );
    } finally {
      setSending(false);
    }
  };

  const handleMessageActions = (message: DisplayMessage) => {
    const canDelete = user?.id === message.senderUserId;

    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        onPress: async () => {
          if (!user) return;

          try {
            const { error } = await supabase.from('message_reports').insert({
              message_id: message.id,
              reporter_user_id: user.id,
              reason: 'Reported from chat UI',
              status: 'pending',
            });

            if (error) throw error;

            Alert.alert('Reported', 'The message was sent for moderation review.');
          } catch (error) {
            Alert.alert(
              'Error',
              error instanceof Error ? error.message : 'Failed to report message'
            );
          }
        },
      },
    ];

    if (canDelete) {
      buttons.splice(1, 0, {
        text: 'Delete for Yourself',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('chat_messages')
              .update({
                is_deleted: true,
                message_text: 'This message was deleted',
              })
              .eq('message_id', message.id);

            if (error) throw error;
            if (chat && event) await loadMessages(chat.chat_id, event);
          } catch (error) {
            Alert.alert(
              'Error',
              error instanceof Error ? error.message : 'Failed to delete message'
            );
          }
        },
      });
    }

    Alert.alert(
      'Message Actions',
      message.isDeleted ? 'This message was deleted' : message.text,
      buttons
    );
  };

  if (!validEventId) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Event Chat" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Chat unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Invalid event id.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Event Chat" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event || !chat) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Event Chat" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Chat unavailable</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>The selected event chat could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Event Chat" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.onlineText, { color: colors.success }]}>
            {realtimeStatus === 'live' ? 'Live event chat' : 'Syncing event chat'}
          </Text>
        </View>

        <ScrollView
          ref={messagesScrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.dateSeparator, { backgroundColor: colors.border }]}>
            <Text style={[styles.dateSeparatorText, { color: colors.textMuted }]}>TODAY</Text>
          </View>

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onLongPress={() => handleMessageActions(message)}
            />
          ))}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Pressable
            onPress={() => setDraft((value) => `${value}🙂 `)}
            accessibilityRole="button"
            accessibilityLabel="Insert emoji"
            style={({ pressed }) => [styles.inputIconButton, { backgroundColor: colors.surface }, pressed && styles.pressed]}
          >
            <Ionicons name="happy-outline" size={22} color={colors.primary} />
          </Pressable>

          <View style={styles.inputWrap}>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message..."
            />
          </View>

          <Pressable
            onPress={handleSend}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
              sending && styles.disabled,
            ]}
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
  message: DisplayMessage;
  onLongPress: () => void;
}) {
  const outgoing = message.isCurrentUser;
  const colors = useThemeColors();

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={280}
      style={[
        styles.messageRow,
        outgoing ? styles.messageRowOutgoing : styles.messageRowIncoming,
      ]}
    >
      {!outgoing ? (
        message.senderAvatar ? (
          <Image source={{ uri: message.senderAvatar }} style={styles.messageAvatar} />
        ) : (
          <View style={[styles.messageAvatar, { backgroundColor: colors.border }]}>
            <Text style={[styles.messageAvatarFallbackText, { color: colors.text }]}>
              {message.senderName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )
      ) : null}

      <View style={[
        styles.bubble,
        outgoing
          ? [styles.outgoingBubble, { backgroundColor: colors.primary }]
          : [styles.incomingBubble, { backgroundColor: colors.background, borderColor: colors.border }],
      ]}>
        {!outgoing ? (
          <View style={styles.senderRow}>
            <Text style={[styles.senderName, { color: colors.text }]}>{message.senderName}</Text>
            {message.isOrganizer ? (
              <View style={styles.organizerBadge}>
                <Text style={styles.organizerBadgeText}>Organizer</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {message.isDeleted ? (
          <Text style={[styles.deletedText, { color: colors.textMuted }]}>This message was deleted</Text>
        ) : (
          <Text style={[styles.messageText, { color: outgoing ? '#FFFFFF' : colors.text }]}>
            {message.text}
          </Text>
        )}

        <Text style={[styles.messageTime, { color: outgoing ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
          {new Intl.DateTimeFormat('en', {
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(message.sentAt))}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  eventTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
  },
  onlineText: {
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
  },
  dateSeparatorText: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarFallbackText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: 5,
  },
  incomingBubble: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  outgoingBubble: {
    borderTopRightRadius: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  senderName: {
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
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  outgoingText: {},
  deletedText: {
    fontSize: theme.fontSize.sm,
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  outgoingTime: {},
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
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
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
