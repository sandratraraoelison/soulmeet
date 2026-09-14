import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CoachVoice } from './coach-voice';

class MockRecognition {
  static instances: MockRecognition[] = [];
  onresult?: (event: { results: { transcript: string }[][] }) => void;
  onend?: () => void;
  onerror?: (event: { error: string }) => void;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    MockRecognition.instances.push(this);
  }
}
class MockUtterance {
  onend?: () => void;
  constructor(public text: string) {}
}
const speak = vi.fn();
const cancel = vi.fn();
beforeEach(() => {
  MockRecognition.instances = [];
  vi.stubGlobal('React', React);
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('SpeechRecognition', MockRecognition);
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  vi.stubGlobal('speechSynthesis', { speak, cancel });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const mount = (onSend = vi.fn().mockResolvedValue('Bonjour !')) =>
  render(<CoachVoice busy={false} onSend={onSend} onStop={vi.fn()} onActiveChange={vi.fn()} />);
async function say() {
  await act(async () => {
    const mic = MockRecognition.instances[0];
    mic.onresult?.({ results: [[{ transcript: 'Bonjour' }]] });
    mic.onend?.();
  });
}
it('sends speech once, reads the reply and resumes listening only after playback', async () => {
  const send = vi.fn().mockResolvedValue('Bonjour !');
  mount(send);
  fireEvent.click(screen.getByRole('button', { name: 'Parler au coach' }));
  await say();
  expect(send).toHaveBeenCalledExactlyOnceWith('Bonjour');
  expect(speak.mock.calls[0][0].text).toBe('Bonjour !');
  expect(MockRecognition.instances).toHaveLength(1);
  act(() => speak.mock.calls[0][0].onend());
  expect(MockRecognition.instances).toHaveLength(2);
  expect(screen.getByRole('status')).toHaveTextContent('Je vous écoute');
});
it('does not play a late reply after the user stops', async () => {
  let resolve!: (text: string) => void;
  mount(
    vi.fn().mockImplementation(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Parler au coach' }));
  await say();
  fireEvent.click(screen.getByRole('button', { name: 'Arrêter le vocal' }));
  await act(async () => resolve('Late reply'));
  expect(speak).not.toHaveBeenCalled();
  expect(MockRecognition.instances).toHaveLength(1);
});
it('handles microphone denial without restarting', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Parler au coach' }));
  act(() => MockRecognition.instances[0].onerror?.({ error: 'not-allowed' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Autorisez le microphone');
  expect(MockRecognition.instances[0].abort).toHaveBeenCalled();
});
it('stops capture when leaving the chat', () => {
  const view = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Parler au coach' }));
  view.unmount();
  expect(MockRecognition.instances[0].abort).toHaveBeenCalled();
  expect(MockRecognition.instances[0].onend).toBeNull();
});
it('explains unsupported browsers', () => {
  vi.stubGlobal('SpeechRecognition', undefined);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Parler au coach' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Vocal indisponible');
});
