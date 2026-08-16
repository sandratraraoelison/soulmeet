import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { getChatSocket } from '../services/chat.socket';
import { CHAT_EVENTS } from '../constants/chat-events';

export function MessageComposer({
  conversationId,
  onSend,
}: {
  conversationId: string;
  onSend: (content: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const typing = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTyping = () => {
    if (timeout.current) clearTimeout(timeout.current);
    if (typing.current) {
      typing.current = false;
      void getChatSocket().then((socket) => socket.emit(CHAT_EVENTS.typingStop, { conversationId }));
    }
  };
  useEffect(() => stopTyping, []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (text: string) => {
    setDraft(text);
    if (!typing.current) {
      typing.current = true;
      void getChatSocket().then((socket) => socket.emit(CHAT_EVENTS.typingStart, { conversationId }));
    }
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(stopTyping, 1_500);
  };
  const send = () => {
    const content = draft.trim();
    if (!content) return;
    onSend(content);
    setDraft('');
    stopTyping();
  };
  return (
    <View className="flex-row items-end gap-3 border-t border-border bg-canvas px-4 py-3">
      <TextInput
        accessibilityLabel="Message"
        value={draft}
        onChangeText={change}
        placeholder="Share a thought…"
        placeholderTextColor="#9494A3"
        multiline
        maxLength={2_000}
        className="max-h-28 min-h-14 flex-1 rounded-2xl border border-border bg-surface px-4 py-4 font-body text-base text-ink"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        disabled={!draft.trim()}
        onPress={send}
        className={`h-14 w-14 items-center justify-center rounded-full bg-secondary ${draft.trim() ? 'active:opacity-80' : 'opacity-40'}`}
      >
        <Text className="text-xl font-bold text-[#25262E]">➤</Text>
      </Pressable>
    </View>
  );
}
