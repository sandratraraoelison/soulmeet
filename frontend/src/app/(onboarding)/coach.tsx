import { router, type Href } from 'expo-router';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import { Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { BackButton } from '@/components/navigation/BackButton';
import { useOnboardingStore } from '@/store/onboarding.store';

const suggestions = [
  'Lumina',
  'Milo',
  'Nova',
  'Sage',
  'Kai',
  'Ari',
  'Zara',
  'Orion',
  'Lyra',
  'Atlas',
  'Luna',
  'Phoenix',
  'Sora',
];

export default function CoachNameScreen() {
  const name = useOnboardingStore((state) => state.coachName);
  const setName = useOnboardingStore((state) => state.setCoachName);
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ThemedStatusBar />
      <KeyboardAwareScrollView
        bottomOffset={32}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingBottom: 128,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="flex-row items-center border-b border-white/5 py-3">
          <BackButton />
          <Text className="text-sm text-muted">Soulmeet</Text>
        </View>
        <View className="mt-7 flex-row justify-between">
          <Text className="text-xs font-bold tracking-wider text-[#AFA9E8]">
            STEP 2 OF 3
          </Text>
          <Text className="text-xs text-muted">Coach identity</Text>
        </View>
        <View className="mt-4 h-[3px] rounded-full bg-surface-raised">
          <View className="h-[3px] w-2/3 rounded-full bg-[#E9694F]" />
        </View>
        <Text className="mt-10 text-center text-[30px] font-bold text-ink">
          Name your <Text className="text-[#E9694F]">coach</Text>
        </Text>
        <Text className="mx-3 mb-8 mt-3 text-center text-base leading-6 text-muted">
          Choose a suggested name or create one that feels personal to you.
        </Text>
        <Input
          dark
          label="Custom name"
          placeholder="Enter a coach name"
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Text className="mb-3 mt-7 text-sm font-semibold text-[#D9D5E3]">
          Suggested names
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              onPress={() => setName(suggestion)}
              className={`rounded-full border px-5 py-3 ${name === suggestion ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
            >
              <Text
                className={`font-semibold ${name === suggestion ? 'text-[#E9694F]' : 'text-[#A6A0B2]'}`}
              >
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="mt-10">
          <Button
            label="Continue"
            variant="light"
            disabled={!name.trim()}
            onPress={() => router.push('/(onboarding)/personality' as Href)}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
