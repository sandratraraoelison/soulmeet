import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Input } from '@/components/common/Input';

interface Props {
  label: string;
  value: string;
  suggestions: readonly string[];
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  dark?: boolean;
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function LocationAutocompleteInput({
  label,
  value,
  suggestions,
  onChangeText,
  error,
  placeholder,
  dark,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const matches = useMemo(() => {
    const query = normalize(draft);
    return suggestions.filter((suggestion) =>
      !query || normalize(suggestion).includes(query),
    );
  }, [draft, suggestions]);

  const show = () => {
    setDraft(value);
    setOpen(true);
  };
  const select = (suggestion: string) => {
    onChangeText(suggestion);
    setOpen(false);
  };
  const useTypedValue = () => {
    const next = draft.trim();
    if (next) onChangeText(next);
    setOpen(false);
  };

  return (
    <View className="gap-2">
      <Text className="font-label text-sm font-semibold text-ink">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label}`}
        onPress={show}
        className={`min-h-14 justify-center rounded-2xl border bg-surface-raised px-4 ${error ? 'border-danger' : 'border-border'}`}
      >
        <Text className={`font-body text-base ${value ? 'text-ink' : 'text-muted'}`}>
          {value || placeholder || `Choose ${label.toLowerCase()}`}
        </Text>
      </Pressable>
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="h-[82%] rounded-t-[28px] border-t border-border bg-surface px-4 pb-6 pt-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-headline text-xl font-bold text-ink">{label}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close location selector" onPress={() => setOpen(false)} className="min-h-11 min-w-11 items-center justify-center rounded-full bg-surface-raised">
                <Text className="font-label text-sm font-bold text-muted">Close</Text>
              </Pressable>
            </View>
            <Input
              autoFocus
              dark={dark}
              label={`Search ${label.toLowerCase()}`}
              value={draft}
              onChangeText={setDraft}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder={placeholder}
            />
            <FlatList
              className="mt-3 flex-1"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              data={matches}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item}`}
                  onPress={() => select(item)}
                  className="min-h-12 justify-center border-b border-border px-2 active:bg-surface-raised"
                >
                  <Text className="font-body text-base text-ink">{item}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text className="py-5 text-center text-sm text-muted">No matching suggestion. You can keep your typed value.</Text>
              }
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Use ${draft.trim() || 'typed location'}`}
              disabled={!draft.trim()}
              onPress={useTypedValue}
              className={`mt-3 min-h-14 items-center justify-center rounded-2xl bg-primary ${draft.trim() ? 'active:opacity-80' : 'opacity-40'}`}
            >
              <Text className="font-label font-bold text-white">{`Use "${draft.trim() || '...'}"`}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
