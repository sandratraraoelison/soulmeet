import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { BackButton } from '@/components/navigation/BackButton';
import { CopySelectionModal } from '@/components/common/CopySelectionModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authApi } from '@/api/auth.api';
import { mediaUrl, MessageBubble } from '@/features/chat/components/MessageBubble';
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
  useSendAttachment,
} from '@/features/chat/hooks/use-chat';
import { getChatSocket } from '@/features/chat/services/chat.socket';
import { useChatStore } from '@/features/chat/store/chat.store';
import type { Conversation, Message } from '@/features/chat/types/chat.types';

type MediaGroup = { id: string; senderId: string; items: Message[] };
const groupMediaMessages = (messages: Message[]): (Message | MediaGroup)[] => {
  const result: (Message | MediaGroup)[] = [];
  for (const message of messages) {
    const previous = result.at(-1);
    const previousMessage = previous && 'items' in previous ? previous.items.at(-1) : previous;
    const sameBatch =
      message.type === 'IMAGE' &&
      previousMessage?.type === 'IMAGE' &&
      previousMessage.senderId === message.senderId &&
      Math.abs(new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()) < 15_000;
    if (sameBatch && previous) {
      if ('items' in previous) previous.items.push(message);
      else result[result.length - 1] = { id: `media-${previous.id}`, senderId: message.senderId, items: [previous, message] };
    } else result.push(message);
  }
  return result;
};

export default function ConversationScreen() {
  const { width: screenWidth } = useWindowDimensions();
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
  const sendAttachment = useSendAttachment(conversationId);
  const editMessage = useEditMessage(conversationId);
  const deleteMessage = useDeleteMessage(conversationId);
  const [selected, setSelected] = useState<Message | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyText, setCopyText] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ urls: string[]; index: number } | null>(null);

  useConversationSocket(conversationId, me.data?.id);
  const messages = useMemo(
    () => history.data?.pages.flatMap((page) => page.messages) ?? [],
    [history.data],
  );
  const displayItems = useMemo(() => groupMediaMessages(messages), [messages]);

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

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timeout);
  }, [copied]);

  const openActions = (message: Message) => {
    setSelected(message);
    setEditing(false);
    setConfirmingDelete(false);
    setEditContent(message.content ?? '');
  };
  const confirmDelete = () => {
    if (!selected) return;
    deleteMessage.mutate(selected.id);
    setConfirmingDelete(false);
    setSelected(null);
  };
  const selectTextToCopy = () => {
    if (!selected?.content) return;
    setCopyText(selected.content);
    setSelected(null);
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
            <Text className="text-center font-label text-xs text-secondary">Connection interrupted - reconnecting...</Text>
          </View>
        ) : null}

        <FlatList
          data={displayItems}
          inverted
          keyExtractor={(message) => message.id}
          renderItem={({ item }) => (
            'items' in item ? (
              <PhotoGroup
                items={item.items}
                mine={item.senderId === senderId}
                onOpen={(index) => setGallery({ urls: item.items.map((message) => mediaUrl(message.mediaUrl!)), index })}
              />
            ) : (
              <MessageBubble
                message={item}
                mine={item.senderId === senderId}
                onLongPress={() => openActions(item)}
                onImagePress={() => item.mediaUrl && setGallery({ urls: [mediaUrl(item.mediaUrl)], index: 0 })}
                onRetry={() => item.content && void sendMessage.send(item.content, item.clientMessageId)}
              />
            )
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
              <Text className="mt-4 text-center font-body text-muted">This connection is waiting for its first message.</Text>
            </View>
          }
        />
        {typingUser ? (
          <Text className="px-5 pb-2 font-body text-xs italic text-secondary">{other.firstName} is typing...</Text>
        ) : null}
        {sendMessage.error ? (
          <Text accessibilityRole="alert" className="px-5 pb-2 font-body text-xs text-danger">{sendMessage.error}</Text>
        ) : null}
        {sendAttachment.error ? (
          <Text accessibilityRole="alert" className="px-5 pb-2 font-body text-xs text-danger">The attachment could not be sent. Please try again.</Text>
        ) : null}
        <MessageComposer
          conversationId={conversationId}
          onSend={(content) => void sendMessage.send(content)}
          onAttachment={(input) => sendAttachment.mutateAsync(input)}
          attachmentPending={sendAttachment.isPending}
        />
        {copied ? <View className="absolute bottom-24 self-center rounded-full bg-ink px-5 py-3"><Text className="font-label text-sm font-bold text-canvas">Message copied</Text></View> : null}
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
            {confirmingDelete ? (
              <View className="gap-4 pb-2">
                <Text className="font-headline text-lg font-bold text-ink">Delete this message?</Text>
                <Text className="font-body text-sm leading-5 text-muted">This message will be deleted for both participants.</Text>
                <View className="flex-row gap-3">
                  <SheetButton label="Cancel" grow onPress={() => setConfirmingDelete(false)} />
                  <SheetButton label="Delete" grow destructive onPress={confirmDelete} />
                </View>
              </View>
            ) : editing ? (
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
                {selected?.type === 'TEXT' ? <SheetButton label="Copy message" onPress={selectTextToCopy} /> : null}
                {selected?.senderId === senderId && selected.type === 'TEXT' ? <SheetButton label="Edit" onPress={() => setEditing(true)} /> : null}
                {selected?.senderId === senderId ? <SheetButton label="Delete" destructive onPress={() => setConfirmingDelete(true)} /> : null}
                <SheetButton label="Cancel" onPress={() => setSelected(null)} />
              </View>
            )}
              </Pressable>
            </SafeAreaView>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <CopySelectionModal text={copyText} onClose={() => setCopyText(null)} onCopied={() => setCopied(true)} />
      <Modal visible={Boolean(gallery)} animationType="fade" onRequestClose={() => setGallery(null)}>
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Close gallery" onPress={() => setGallery(null)} className="h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <MaterialCommunityIcons name="close" size={25} color="#FFFFFF" />
            </Pressable>
            <Text className="font-label text-sm text-white">{gallery ? `${gallery.index + 1} / ${gallery.urls.length}` : ''}</Text>
            <View className="h-12 w-12" />
          </View>
          {gallery ? (
            <FlatList
              key={`${gallery.urls.join('|')}-${screenWidth}`}
              data={gallery.urls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={gallery.index}
              getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
              keyExtractor={(uri, index) => `${uri}-${index}`}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setGallery((current) => current && ({ ...current, index }));
              }}
              renderItem={({ item, index }) => (
                <View style={{ width: screenWidth }} className="flex-1 items-center justify-center">
                  <Image source={{ uri: item }} resizeMode="contain" accessibilityLabel={`Photo ${index + 1}`} className="h-full w-full" />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PhotoGroup({ items, mine, onOpen }: { items: Message[]; mine: boolean; onOpen: (index: number) => void }) {
  const { width } = useWindowDimensions();
  const groupWidth = Math.min(340, width * 0.78);
  const visible = items.slice(0, 4);
  const photo = (message: Message, index: number, tall = false) => (
    <Pressable
      key={message.id}
      style={{ height: tall ? 268 : items.length === 2 ? 180 : 132 }}
      accessibilityRole="button"
      accessibilityLabel={`Open photo ${index + 1}`}
      onPress={() => onOpen(index)}
      className="relative flex-1 overflow-hidden bg-surface-raised"
    >
      <Image source={{ uri: mediaUrl(message.mediaUrl!) }} resizeMode="cover" className="h-full w-full" />
      {index === 3 && items.length > 4 ? <View className="absolute inset-0 items-center justify-center bg-black/60"><Text className="font-headline text-3xl font-bold text-white">+{items.length - 4}</Text></View> : null}
    </Pressable>
  );
  return (
    <View style={{ width: groupWidth }} className={`mb-2 overflow-hidden rounded-2xl border p-1 ${mine ? 'ml-auto rounded-br-sm border-primary bg-primary' : 'mr-auto rounded-bl-sm border-border bg-surface'}`}>
      <View className="gap-1 overflow-hidden rounded-xl">
        {visible.length === 3 ? (
          <View className="flex-row gap-1">
            {photo(visible[0]!, 0, true)}
            <View className="flex-1 gap-1">{photo(visible[1]!, 1)}{photo(visible[2]!, 2)}</View>
          </View>
        ) : visible.length === 2 ? (
          <View className="flex-row gap-1">{photo(visible[0]!, 0)}{photo(visible[1]!, 1)}</View>
        ) : (
          <>
            <View className="flex-row gap-1">{visible[0] ? photo(visible[0]!, 0) : null}{visible[1] ? photo(visible[1]!, 1) : null}</View>
            {visible.length > 2 ? <View className="flex-row gap-1">{photo(visible[2]!, 2)}{visible[3] ? photo(visible[3]!, 3) : null}</View> : null}
          </>
        )}
      </View>
      <Text className={`px-2 pb-1 pt-2 text-right font-label text-[10px] ${mine ? 'text-indigo-100' : 'text-muted'}`}>{new Date(items.at(-1)!.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
    </View>
  );
}

function SheetButton({ label, onPress, primary, destructive, grow }: { label: string; onPress: () => void; primary?: boolean; destructive?: boolean; grow?: boolean }) {
  return (
    <Pressable accessibilityRole="menuitem" onPress={onPress} className={`min-h-14 items-center justify-center rounded-2xl border px-4 py-3 ${grow ? 'flex-1' : 'w-full'} ${primary ? 'border-primary bg-primary' : 'border-border bg-surface-raised'}`}>
      <Text className={`font-label font-bold ${primary ? 'text-white' : destructive ? 'text-danger' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
