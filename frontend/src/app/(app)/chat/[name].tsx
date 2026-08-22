import { useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { BackButton } from '@/components/navigation/BackButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockMatches } from '@/data/mock-matches';

type Message = { id: number; text: string; mine: boolean; pending?: boolean };

export default function ChatScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const match = mockMatches.find((item) => item.slug === name);
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');
  const initialMessages = useMemo<Message[]>(
    () => [
      { id: 1, text: `Hey 😊 Nice to meet you.`, mine: false },
      {
        id: 2,
        text: 'Nice to meet you too. First time using Soulmeet?',
        mine: true,
      },
      {
        id: 3,
        text: "Yeah haha. I wasn't sure what to expect honestly.",
        mine: false,
      },
      { id: 4, text: '•••', mine: false, pending: true },
    ],
    [],
  );
  const [messages, setMessages] = useState(initialMessages);

  if (!match) return null;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current.filter((message) => !message.pending),
      { id: Date.now(), text, mine: true },
    ]);
    setDraft('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ThemedStatusBar />
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
      >
        <View className="flex-row items-center border-b border-border px-5 py-2">
          <BackButton />
          <Text className="flex-1 text-center font-headline text-xl font-bold text-ink">
            {match.name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${match.name}`}
            onPress={() => Alert.alert('Calls coming soon', `Voice calls with ${match.name} will be available soon.`)}
            className="h-11 w-11 items-end justify-center"
          >
            <Text className="text-xl text-secondary">⌕</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View className="items-center pb-10 pt-16">
            <View className="h-24 w-24 items-center justify-center rounded-full border border-secondary/30 bg-surface shadow-lg shadow-secondary">
              <Text className="text-4xl text-secondary">✦</Text>
            </View>
            <Text className="mt-7 font-label text-xs font-bold uppercase tracking-[2px] text-ink">
              Soul connected
            </Text>
          </View>

          <View className="gap-5">
            {messages.map((message) => (
              <View
                key={message.id}
                className={`max-w-[82%] rounded-2xl border px-4 py-4 ${message.mine ? 'ml-auto rounded-br-sm border-secondary/30 bg-transparent' : 'mr-auto rounded-bl-sm border-border bg-surface'}`}
              >
                <Text
                  className={`font-body text-base leading-6 ${message.pending ? 'font-bold tracking-[3px] text-secondary' : 'text-ink'}`}
                >
                  {message.text}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View className="flex-row items-end gap-3 border-t border-border px-5 py-4">
          <TextInput
            accessibilityLabel="Message"
            value={draft}
            onChangeText={setDraft}
            onFocus={() =>
              setTimeout(
                () => scrollRef.current?.scrollToEnd({ animated: true }),
                250,
              )
            }
            onSubmitEditing={send}
            placeholder="Share a thought..."
            placeholderTextColor="#9494A3"
            multiline
            maxLength={1000}
            className="max-h-28 min-h-14 flex-1 rounded-2xl border border-border bg-surface px-5 py-4 font-body text-base text-ink"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() }}
            disabled={!draft.trim()}
            onPress={send}
            className={`h-14 w-14 items-center justify-center rounded-full bg-primary ${draft.trim() ? 'active:opacity-80' : 'opacity-40'}`}
          >
            <Text className="text-2xl font-bold text-[#25262E]">➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
