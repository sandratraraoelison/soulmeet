import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AudioModule } from 'expo-audio';
import { MessageComposer } from '../components/MessageComposer';

jest.mock('expo-crypto', () => ({ randomUUID: () => '69e7cbab-6d0f-4a14-9304-d09d5ba3df4b' }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('rn-emoji-keyboard', () => ({ __esModule: true, default: () => null, fr: {} }));
jest.mock('../services/chat.socket', () => ({ getChatSocket: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual('react-native').View }));
jest.mock('@/api/client', () => ({ getErrorMessage: () => 'Upload failed' }));

const mockRecorder = { isRecording: false, currentTime: 2, uri: 'file:///voice.m4a', stop: jest.fn(), prepareToRecordAsync: jest.fn(), record: jest.fn() };
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0 }),
  useAudioRecorder: () => mockRecorder,
  useAudioRecorderState: () => ({ isRecording: mockRecorder.isRecording, durationMillis: 2000 }),
  AudioModule: { getRecordingPermissionsAsync: jest.fn(), requestRecordingPermissionsAsync: jest.fn() },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRecorder.isRecording = false;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.useRealTimers());

it('sends a photo with a valid UUID and preserves it after an upload failure', async () => {
  jest.useFakeTimers();
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photo.jpg', width: 10, height: 10 }] });
  const upload = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
  const view = await render(<MessageComposer conversationId="conversation" onSend={jest.fn()} onAttachment={upload} />);
  await fireEvent.press(view.getByLabelText('Add a photo'));
  await fireEvent.press(view.getByLabelText('Gallery'));
  await act(async () => { jest.advanceTimersByTime(150); });
  await fireEvent.press(view.getByLabelText('Send attachments'));
  expect(Alert.alert).toHaveBeenCalledWith('Attachment not sent', 'Upload failed');
  expect(view.getByLabelText('Selected photo preview 1')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Send attachments'));
  expect(upload.mock.calls[0][0].clientMessageId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(upload.mock.calls[1][0].clientMessageId).toBe(upload.mock.calls[0][0].clientMessageId);
  expect(view.queryByLabelText('Send attachments')).toBeNull();
});

it('offers Settings when microphone permission cannot be requested again', async () => {
  jest.mocked(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: false } as never);
  const view = await render(<MessageComposer conversationId="conversation" onSend={jest.fn()} onAttachment={jest.fn()} />);
  await fireEvent.press(view.getByLabelText('Record a voice message'));
  expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
  expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Microphone permission required', expect.any(String), expect.arrayContaining([expect.objectContaining({ text: 'Open Settings' })]));
});

it('requests microphone permission before preparing a recording', async () => {
  jest.mocked(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: true } as never);
  jest.mocked(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({ granted: true } as never);
  const view = await render(<MessageComposer conversationId="conversation" onSend={jest.fn()} onAttachment={jest.fn()} />);
  await fireEvent.press(view.getByLabelText('Record a voice message'));
  expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(mockRecorder.record).toHaveBeenCalledTimes(1);
});

it('sends a recorded voice message with a UUID', async () => {
  mockRecorder.isRecording = true;
  const upload = jest.fn().mockResolvedValue({});
  const view = await render(<MessageComposer conversationId="conversation" onSend={jest.fn()} onAttachment={upload} />);
  await fireEvent.press(view.getByLabelText('Stop voice recording'));
  await fireEvent.press(view.getByLabelText('Send attachments'));
  expect(upload).toHaveBeenCalledWith(expect.objectContaining({ type: 'AUDIO', durationMs: 2000, clientMessageId: '69e7cbab-6d0f-4a14-9304-d09d5ba3df4b' }));
});
