import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { BackButton } from '@/components/navigation/BackButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth.api';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { MessageComposer } from '@/features/chat/components/MessageComposer';
import { ConversationHeader } from '@/features/chat/components/ConversationHeader';
import { CHAT_EVENTS } from '@/features/chat/constants/chat-events';
import {
  chatKeys,
  useConversation,
  useConversationMessages,
  useConversationPresence,
  useConversationSocket,
  useDeleteMessage,
  useEditMessage,
  useSendMessage,
} from '@/features/chat/hooks/use-chat';
import { getChatSocket } from '@/features/chat/services/chat.socket';
import { useChatStore } from '@/features/chat/store/chat.store';
import type { Conversation, Message } from '@/features/chat/types/chat.types';

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const queryClient = useQueryClient();
  const conversation = useConversation(conversationId, me.data?.id);
  const history = useConversationMessages(conversationId);
  const connection = useChatStore((state) => state.connection);
  const typingUser = useChatStore((state) => state.typingByConversation[conversationId]);
  const otherUserOnline = useConversationPresence(conversationId);
  const senderId = me.data?.id ?? '';
  const sendMessage = useSendMessage(conversationId, senderId);
  const editMessage = useEditMessage(conversationId);
  const deleteMessage = useDeleteMessage(conversationId);
  const [selected, setSelected] = useState<Message | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  useConversationSocket(conversationId, me.data?.id);
  const messages = useMemo(
    () => history.data?.pages.flatMap((page) => page.messages) ?? [],
    [history.data],
  );

  useEffect(() => {
    const unread = messages.filter(
      (message) => message.senderId !== senderId && message.status !== 'READ',
    );
    if (!unread.length || !senderId) return;
    void getChatSocket().then((socket) =>
      socket.emit(CHAT_EVENTS.read, {
        conversationId,
        messageIds: unread.map((message) => message.id),
      }),
    );
    queryClient.setQueryData<Conversation[]>(chatKeys.conversations, (current) =>
      current?.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: 0 } : item,
      ),
    );
  }, [conversationId, messages, queryClient, senderId]);

  const openActions = (message: Message) => {
    setSelected(message);
    setEditContent(message.content ?? '');
  };
  const confirmDelete = () => {
    if (!selected) return;
    Alert.alert(
      'Delete this message?',
      'This message will be deleted for both participants.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMessage.mutate(selected.id);
            setSelected(null);
          },
        },
      ],
    );
  };

  if (conversation.isLoading || history.isLoading || me.isLoading)
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#D4AF37" />
      </View>
    );
  if (conversation.isError || history.isError || !conversation.data)
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas px-7">
        <Text className="text-center font-body text-muted">
          This conversation is no longer available.
        </Text>
        <View className="mt-5"><BackButton /></View>
      </SafeAreaView>
    );

  const other = conversation.data.otherParticipant;
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ThemedStatusBar />
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ConversationHeader
          firstName={other.firstName}
          online={otherUserOnline}
          typing={Boolean(typingUser)}
          onOpenProfile={() => router.push(`/(app)/person/${other.id}` as Href)}
        />

        {connection !== 'connected' ? (
          <View className="bg-secondary/10 px-4 py-2">
            <Text className="text-center font-label text-xs text-secondary">Connection interrupted · reconnecting…</Text>
          </View>
        ) : null}

        <FlatList
          data={messages}
          inverted
          keyExtractor={(message) => message.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              mine={item.senderId === senderId}
              onLongPress={() => openActions(item)}
              onRetry={() => item.content && void sendMessage.send(item.content, item.clientMessageId)}
            />
          )}
          contentContainerClassName="px-4 py-5"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          windowSize={7}
          onEndReachedThreshold={0.25}
          onEndReached={() => {
            if (history.hasNextPage && !history.isFetchingNextPage)
              void history.fetchNextPage();
          }}
          ListFooterComponent={
            history.isFetchingNextPage ? <ActivityIndicator color="#D4AF37" /> : null
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-3xl text-secondary">✦</Text>
              <Text className="mt-4 text-center font-body text-muted">This connection is waiting for its first message.</Text>
            </View>
          }
        />
        {typingUser ? (
          <Text className="px-5 pb-2 font-body text-xs italic text-secondary">{other.firstName} is typing…</Text>
        ) : null}
        {sendMessage.error ? (
          <Text accessibilityRole="alert" className="px-5 pb-2 font-body text-xs text-danger">{sendMessage.error}</Text>
        ) : null}
        <MessageComposer conversationId={conversationId} onSend={(content) => void sendMessage.send(content)} />
      </KeyboardAvoidingView>

      <Modal transparent visible={Boolean(selected)} animationType="fade" onRequestClose={() => setSelected(null)}>
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setSelected(null)}>
            <SafeAreaView
              edges={['bottom', 'left', 'right']}
              className="w-full bg-surface"
            >
              <Pressable
                accessibilityRole="menu"
                className="rounded-t-[28px] border-t border-border bg-surface px-5 pb-14 pt-5"
                onPress={(event) => event.stopPropagation()}
              >
            {editing ? (
              <View className="gap-4 pb-2">
                <Text className="font-headline text-lg font-bold text-ink">Edit message</Text>
                <TextInput
                  accessibilityLabel="Message text to edit"
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  maxLength={2_000}
                  autoFocus
                  textAlignVertical="top"
                  className="max-h-36 min-h-24 rounded-2xl border border-primary/50 bg-surface-raised px-4 py-4 font-body text-base leading-6 text-ink"
                />
                <View className="flex-row gap-3">
                  <SheetButton label="Cancel" grow onPress={() => setEditing(false)} />
                  <SheetButton label="Save" grow primary onPress={() => {
                    if (!selected || !editContent.trim()) return;
                    editMessage.mutate({ id: selected.id, content: editContent.trim() });
                    setEditing(false);
                    setSelected(null);
                  }} />
                </View>
              </View>
            ) : (
              <View className="gap-3 pb-3">
                <Text className="mb-2 font-headline text-lg font-bold text-ink">Message actions</Text>
                <SheetButton label="Edit" onPress={() => setEditing(true)} />
                <SheetButton label="Delete" destructive onPress={confirmDelete} />
                <SheetButton label="Cancel" onPress={() => setSelected(null)} />
              </View>
            )}
              </Pressable>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SheetButton({ label, onPress, primary, destructive, grow }: { label: string; onPress: () => void; primary?: boolean; destructive?: boolean; grow?: boolean }) {
  return (
    <Pressable accessibilityRole="menuitem" onPress={onPress} className={`min-h-14 items-center justify-center rounded-2xl border px-4 py-3 ${grow ? 'flex-1' : 'w-full'} ${primary ? 'border-primary bg-primary' : 'border-border bg-surface-raised'}`}>
      <Text className={`font-label font-bold ${primary ? 'text-white' : destructive ? 'text-danger' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
