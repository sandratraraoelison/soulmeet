import { Modal, Pressable, Text, View } from 'react-native';
import type { GuidanceMessage } from '../types/guidance.types';

type Props = {
  message: GuidanceMessage | null;
  onClose: () => void;
  onCopy: (message: GuidanceMessage) => void;
  onDelete: (message: GuidanceMessage) => void;
  onRegenerate: (message: GuidanceMessage) => void;
};

function Action({ label, danger = false, onPress }: { label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="border-b border-border px-5 py-4 active:bg-surface-raised">
      <Text className={`font-headline text-base font-semibold ${danger ? 'text-danger' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}

export function GuidanceMessageActions({ message, onClose, onCopy, onDelete, onRegenerate }: Props) {
  const available = Boolean(message && !message.isDeleted && message.content);
  return (
    <Modal transparent visible={Boolean(message)} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable accessibilityRole="button" accessibilityLabel="Close message actions" className="absolute inset-0 bg-black/60" onPress={onClose} />
        <View className="rounded-t-[28px] border-t border-border bg-canvas px-5 pb-8 pt-3">
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
          <Text className="mb-3 font-headline text-xl font-bold text-ink">Message actions</Text>
          {available ? <Action label="Copy message" onPress={() => onCopy(message!)} /> : null}
          {available && message?.role === 'ASSISTANT' ? <Action label="Regenerate response" onPress={() => onRegenerate(message)} /> : null}
          {available ? <Action label="Delete message" danger onPress={() => onDelete(message!)} /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onClose} className="mt-4 rounded-2xl border border-border bg-surface px-5 py-4 active:bg-surface-raised">
            <Text className="text-center font-headline text-base font-semibold text-ink">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
