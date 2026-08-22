import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EmojiPicker, { fr as emojiFrench } from 'rn-emoji-keyboard';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { getChatSocket } from '../services/chat.socket';
import { CHAT_EVENTS } from '../constants/chat-events';

export type AttachmentInput = {
  uri: string;
  name: string;
  mimeType: string;
  type: 'IMAGE' | 'AUDIO';
  durationMs?: number;
  clientMessageId?: string;
};

export function MessageComposer({
  conversationId,
  onSend,
  onAttachment,
  attachmentPending = false,
}: {
  conversationId: string;
  onSend: (content: string) => void;
  onAttachment: (input: AttachmentInput) => Promise<unknown> | void;
  attachmentPending?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentInput[]>([]);
  const [sendingAttachments, setSendingAttachments] = useState(false);
  const [imageSourceVisible, setImageSourceVisible] = useState(false);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const typing = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
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
  const imageInput = (asset: ImagePicker.ImagePickerAsset): AttachmentInput | null => {
    if ((asset.fileSize ?? 0) > 10 * 1024 * 1024) {
      Alert.alert('Image too large', 'Choose an image smaller than 10 MB.');
      return null;
    }
    return { uri: asset.uri, name: asset.fileName || `photo-${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg', type: 'IMAGE' };
  };
  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 10 });
    if (result.canceled) return;
    const images = result.assets.map(imageInput).filter((item): item is AttachmentInput => Boolean(item));
    setPendingAttachments((current) => [...current, ...images].slice(0, 10));
  };
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const image = imageInput(result.assets[0]);
      if (image) setPendingAttachments((current) => [...current, image].slice(0, 10));
    }
  };
  const chooseImageSource = () => setImageSourceVisible(true);
  const chooseSource = (source: 'camera' | 'library') => {
    setImageSourceVisible(false);
    setTimeout(() => void (source === 'camera' ? takePhoto() : pickFromLibrary()), 150);
  };
  const toggleRecording = async () => {
    if (recorderState.isRecording) {
      const durationMs = recorderState.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) setPendingAttachments([{ uri: recorder.uri, name: `voice-${Date.now()}.m4a`, mimeType: 'audio/mp4', type: 'AUDIO', durationMs }]);
      return;
    }
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone permission required', 'Allow microphone access to send a voice message.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };
  return (
    <View className="border-t border-border bg-canvas px-3 py-3">
      {pendingAttachments.length ? (
        <AttachmentPreview
          attachments={pendingAttachments}
          sending={attachmentPending || sendingAttachments}
          onDelete={(index) => setPendingAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          onClear={() => setPendingAttachments([])}
          onSend={async () => {
            setSendingAttachments(true);
            try {
              const groupId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
              for (const [index, attachment] of pendingAttachments.entries()) {
                await onAttachment({ ...attachment, clientMessageId: `${groupId}:${index}` });
                setPendingAttachments((current) => current.filter((item) => item !== attachment));
              }
            } finally {
              setSendingAttachments(false);
            }
          }}
        />
      ) : null}
      <View className="flex-row items-end gap-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" disabled={attachmentPending || sendingAttachments || recorderState.isRecording || pendingAttachments.some((item) => item.type === 'AUDIO')} onPress={chooseImageSource} className="h-14 w-10 items-center justify-center rounded-full active:bg-surface-raised">
          <MaterialCommunityIcons name="image-outline" size={25} color="#D57FAC" />
        </Pressable>
        <TextInput
          accessibilityLabel="Message"
          value={draft}
          onChangeText={change}
          placeholder={recorderState.isRecording ? `Recording ${Math.ceil(recorderState.durationMillis / 1000)}s` : 'Share a thought...'}
          placeholderTextColor="#9494A3"
          multiline
          maxLength={2_000}
          editable={!recorderState.isRecording}
          className="max-h-28 min-h-14 flex-1 rounded-2xl border border-border bg-surface px-4 py-4 font-body text-base text-ink"
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Choose an emoji" onPress={() => setEmojiVisible(true)} className="h-14 min-w-10 items-center justify-center rounded-full active:bg-surface-raised">
          <MaterialCommunityIcons name="emoticon-happy-outline" size={25} color="#D57FAC" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={recorderState.isRecording ? 'Stop voice recording' : 'Record a voice message'} disabled={attachmentPending || sendingAttachments || pendingAttachments.length > 0} onPress={() => void toggleRecording()} className={`h-14 min-w-12 items-center justify-center rounded-full ${recorderState.isRecording ? 'bg-danger/20' : ''}`}>
          {attachmentPending ? <ActivityIndicator color="#D4AF37" /> : <MaterialCommunityIcons name={recorderState.isRecording ? 'stop-circle-outline' : 'microphone-outline'} size={25} color={recorderState.isRecording ? '#F87171' : '#D57FAC'} />}
        </Pressable>
        {draft.trim() ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={send} className="h-14 min-w-12 items-center justify-center rounded-full bg-primary px-2">
            <MaterialCommunityIcons name="send" size={20} color="#25262E" />
          </Pressable>
        ) : null}
      </View>
      <EmojiPicker
        open={emojiVisible}
        onClose={() => setEmojiVisible(false)}
        onEmojiSelected={(emoji) => change(`${draft}${emoji.emoji}`)}
        translation={emojiFrench}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        theme={{
          backdrop: '#00000099',
          container: '#171922',
          header: '#F4F1F7',
          category: { icon: '#9494A3', iconActive: '#D57FAC' },
          search: { background: '#222530', text: '#F4F1F7', placeholder: '#9494A3', icon: '#9494A3' },
        }}
      />
      <Modal transparent visible={imageSourceVisible} animationType="fade" onRequestClose={() => setImageSourceVisible(false)}>
        <Pressable className="flex-1 justify-end bg-black/70" onPress={() => setImageSourceVisible(false)}>
          <SafeAreaView edges={['bottom', 'left', 'right']} className="bg-surface">
            <Pressable className="rounded-t-[28px] border-t border-border bg-surface px-5 pb-5 pt-4" onPress={(event) => event.stopPropagation()}>
              <View className="mb-5 h-1 w-11 self-center rounded-full bg-white/20" />
              <Text className="font-headline text-xl font-bold text-ink">Add a photo</Text>
              <Text className="mb-5 mt-1 font-body text-sm text-muted">Choose a source</Text>
              <View className="flex-row gap-3">
                <SourceButton icon="camera-outline" label="Camera" onPress={() => chooseSource('camera')} />
                <SourceButton icon="image-multiple-outline" label="Gallery" onPress={() => chooseSource('library')} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel photo selection" onPress={() => setImageSourceVisible(false)} className="mt-3 min-h-12 items-center justify-center rounded-2xl">
                <Text className="font-label text-sm font-bold text-muted">Cancel</Text>
              </Pressable>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
}

function SourceButton({ icon, label, onPress }: { icon: 'camera-outline' | 'image-multiple-outline'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-28 flex-1 items-center justify-center rounded-2xl border border-border bg-surface-raised active:border-primary active:bg-primary/10">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/15">
        <MaterialCommunityIcons name={icon} size={25} color="#D57FAC" />
      </View>
      <Text className="mt-3 font-label text-sm font-bold text-ink">{label}</Text>
    </Pressable>
  );
}

function AttachmentPreview({ attachments, sending, onDelete, onClear, onSend }: { attachments: AttachmentInput[]; sending: boolean; onDelete: (index: number) => void; onClear: () => void; onSend: () => Promise<void> }) {
  const multiple = attachments.length > 1;
  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-border bg-surface p-3">
      <ScrollView horizontal={multiple} showsHorizontalScrollIndicator={false} contentContainerStyle={multiple ? { gap: 10 } : undefined}>
        {attachments.map((attachment, index) => (
          <View key={`${attachment.uri}-${index}`} style={multiple ? { width: 170 } : { width: '100%' }}>
            {attachment.type === 'IMAGE' ? (
              <View className="overflow-hidden rounded-xl bg-black/30">
                <Image source={{ uri: attachment.uri }} resizeMode="contain" accessibilityLabel={`Selected photo preview ${index + 1}`} style={{ width: '100%', height: multiple ? 170 : 220 }} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${index + 1}`} disabled={sending} onPress={() => onDelete(index)} className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-black/70">
                  <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : <AudioPreview uri={attachment.uri} durationMs={attachment.durationMs} />}
          </View>
        ))}
      </ScrollView>
      {multiple ? <Text className="mt-2 text-center text-xs text-muted">{attachments.length} photos selected</Text> : null}
      <View className="mt-3 flex-row gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Delete attachments" disabled={sending} onPress={onClear} className="min-h-12 min-w-14 items-center justify-center rounded-xl border border-border bg-surface-raised">
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#F87171" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Send attachments" disabled={sending} onPress={() => void onSend()} className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-primary">
          {sending ? <ActivityIndicator color="#25262E" /> : <><MaterialCommunityIcons name="send" size={19} color="#25262E" /><Text className="ml-2 font-bold text-[#25262E]">Send{multiple ? ` ${attachments.length}` : ''}</Text></>}
        </Pressable>
      </View>
    </View>
  );
}

function AudioPreview({ uri, durationMs }: { uri: string; durationMs?: number }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.currentTime >= status.duration) void player.seekTo(0);
      player.play();
    }
  };
  const seconds = Math.round((durationMs ?? status.duration * 1000) / 1000);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause audio preview' : 'Play audio preview'} onPress={toggle} className="min-h-20 flex-row items-center rounded-xl bg-surface-raised px-4">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <MaterialCommunityIcons name={status.playing ? 'pause' : 'play'} size={25} color="#25262E" />
      </View>
      <View className="ml-4 flex-1">
        <View className="h-1 rounded-full bg-white/20" />
        <MaterialCommunityIcons name="microphone" size={18} color="#D57FAC" style={{ marginTop: 8 }} />
      </View>
      <MaterialCommunityIcons name="clock-outline" size={16} color="#9494A3" />
      <Text className="ml-1 text-xs text-muted">{formatDuration(seconds)}</Text>
    </Pressable>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}
