import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';

export function GuidanceComposer({ value, onChangeText, onSend, onStop, generating }: { value: string; onChangeText: (value: string) => void; onSend: () => void; onStop: () => void; generating: boolean }) {
  return (
    <View className="border-t border-border bg-canvas px-4 pb-3 pt-3">
      <View className="flex-row items-end rounded-[22px] border border-border bg-surface px-3 py-2">
        <TextInput accessibilityLabel="Message your coach" multiline maxLength={8000} value={value} onChangeText={onChangeText} placeholder="Talk to your coach…" placeholderTextColor="#9494A3" className="max-h-32 min-h-12 flex-1 px-2 py-3 font-body text-base text-ink" />
        <MotionPressable accessibilityRole="button" accessibilityLabel={generating ? 'Stop generating' : 'Send message'} onPress={generating ? onStop : onSend} disabled={!generating && !value.trim()} className={`mb-1 h-11 w-11 items-center justify-center rounded-full ${generating ? 'bg-danger' : 'bg-primary'} ${!generating && !value.trim() ? 'opacity-40' : ''}`}>
          {generating ? <Text className="font-label text-sm font-bold text-canvas">■</Text> : <Text className="font-label text-xl font-bold text-white">↑</Text>}
        </MotionPressable>
      </View>
      {generating ? <View className="mt-2 flex-row items-center justify-center"><ActivityIndicator size="small" color="#D4AF37" /><Text className="ml-2 font-body text-xs text-muted">Your coach is thinking…</Text></View> : null}
    </View>
  );
}
