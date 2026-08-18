import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useThemePalette } from '@/store/theme.store';

type Selection = { start: number; end: number };

export function selectedText(text: string, selection: Selection) {
  const start = Math.max(0, Math.min(selection.start, text.length));
  const end = Math.max(start, Math.min(selection.end, text.length));
  return text.slice(start, end);
}

export function preserveNonEmptySelection(current: Selection, next: Selection) {
  return next.end > next.start ? next : current;
}

export function CopySelectionModal({ text, onClose, onCopied }: { text: string | null; onClose: () => void; onCopied: () => void }) {
  const { colors } = useThemePalette();
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  useEffect(() => setSelection({ start: 0, end: text?.length ?? 0 }), [text]);
  const copy = async () => {
    if (!text) return;
    const value = selectedText(text, selection);
    if (!value) return;
    await Clipboard.setStringAsync(value);
    onClose();
    onCopied();
  };
  const hasSelection = Boolean(text && selection.end > selection.start);
  return (
    <Modal transparent visible={Boolean(text)} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-center bg-black/60 px-5">
        <Pressable accessibilityRole="button" accessibilityLabel="Close text selection" className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[28px] border border-border bg-canvas p-5">
          <Text className="font-headline text-xl font-bold text-ink">Select text to copy</Text>
          <Text className="mb-4 mt-2 font-body text-sm leading-5 text-muted">Drag the selection handles, then tap Copy selection. Android’s context menu is disabled.</Text>
          <TextInput
            accessibilityLabel="Text to copy"
            value={text ?? ''}
            multiline
            contextMenuHidden
            showSoftInputOnFocus={false}
            selectionColor={colors.secondary}
            selectionHandleColor={colors.primary}
            cursorColor={colors.primary}
            selection={selection}
            onSelectionChange={(event) => {
              // React Native recycles synthetic events after this callback.
              // Copy the coordinates before scheduling the state updater.
              const next = { ...event.nativeEvent.selection };
              setSelection((current) => preserveNonEmptySelection(current, next));
            }}
            className="max-h-72 min-h-32 rounded-2xl border border-primary/40 bg-surface px-4 py-4 font-body text-base leading-6 text-ink"
          />
          <View className="mt-5 flex-row gap-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel text selection" onPress={onClose} className="min-h-14 flex-1 items-center justify-center rounded-2xl border border-border bg-surface px-4">
              <Text className="font-label font-bold text-ink">Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Copy selection" disabled={!hasSelection} onPress={() => void copy()} className={`min-h-14 flex-1 items-center justify-center rounded-2xl px-4 ${hasSelection ? 'bg-primary' : 'bg-primary/30'}`}>
              <Text className="font-label font-bold text-white">Copy selection</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
