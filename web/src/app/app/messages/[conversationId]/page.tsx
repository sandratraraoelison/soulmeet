'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  Check,
  ImagePlus,
  Mic,
  Pencil,
  Send,
  Smile,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/services/api';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Failure, Loading } from '@/components/remote';
import { BackButton } from '@/components/ui/back-button';
import { useMeQuery } from '@/providers/me';
import {
  chatKeys,
  useChatSocketLifecycle,
  useConversation,
  useConversationPresence,
  useConversationSocket,
  useSendMessage,
} from '@/features/chat/use-chat';
import { useChatConnection, useTypingStatus } from '@/features/chat/chat-store';
import type { MessagePage } from '@/features/chat/chat-utils';
import { upsertMessageList } from '@/features/chat/chat-utils';
import type { ChatMessage } from '@/types';
const statusMark: Record<string, string> = {
  PENDING: '◦',
  SENT: '✓',
  DELIVERED: '✓',
  READ: '✓✓',
};
const statusTitle: Record<string, string> = {
  PENDING: 'Sending',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
};
const mediaSource = (value: string) => {
  try {
    const url = new URL(value);
    if (url.pathname.startsWith('/uploads/')) {
      return `/api/backend-media/${url.pathname.slice('/uploads/'.length)}`;
    }
    return value;
  } catch {
    const path = value.replace(/^\/?uploads\//, '');
    return `/api/backend-media/${path}`;
  }
};
type MediaGroup = { id: string; senderId: string; items: ChatMessage[] };
const groupMediaMessages = (messages: ChatMessage[]): (ChatMessage | MediaGroup)[] => {
  const result: (ChatMessage | MediaGroup)[] = [];
  for (const message of messages) {
    const previous = result.at(-1);
    const previousMessage = previous && 'items' in previous ? previous.items.at(-1) : previous;
    const sameBatch =
      message.type === 'IMAGE' &&
      previousMessage?.type === 'IMAGE' &&
      previousMessage.senderId === message.senderId &&
      Math.abs(new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime()) <
        15_000;
    if (sameBatch && previous) {
      if ('items' in previous) previous.items.push(message);
      else result[result.length - 1] = { id: `media-${previous.id}`, senderId: message.senderId, items: [previous, message] };
    } else result.push(message);
  }
  return result;
};
export default function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [gallery, setGallery] = useState<{ urls: string[]; index: number } | null>(null);
  const selectedFilesRef = useRef(selectedFiles);
  const [recorded, setRecorded] = useState<{ blob: Blob; url: string; seconds: number } | null>(
    null,
  );
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [seconds, setSeconds] = useState(0);
  const me = useMeQuery();
  useChatSocketLifecycle(true);
  useEffect(() => {
    if (!emojiOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!emojiPickerRef.current?.contains(event.target as Node)) setEmojiOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEmojiOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [emojiOpen]);
  useConversationSocket(conversationId, me.data?.id);
  const conversation = useConversation(conversationId);
  const presenceOnline = useConversationPresence(conversationId);
  const connection = useChatConnection();
  const typing = useTypingStatus(conversationId);
  const q = useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: () =>
      api<MessagePage>(`/conversations/${conversationId}/messages?limit=50`),
    refetchInterval: 10_000,
  });
  const messageCount = q.data?.messages.length ?? 0;
  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);
  useEffect(
    () => () => {
      selectedFilesRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    },
    [],
  );
  useEffect(() => {
    if (messageCount <= previousMessageCount.current) return;
    previousMessageCount.current = messageCount;
    requestAnimationFrame(() => {
      if (messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight;
    });
  }, [messageCount]);
  const refresh = () => qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
  const send = useSendMessage(conversationId, me.data?.id ?? '');
  const other = conversation.data?.participants.find((p) => p.userId !== me.data?.id);
  const otherId = other?.userId;
  const manageMessage = async ({
    id,
    method,
    content,
  }: {
    id: string;
    method: 'PATCH' | 'DELETE';
    content?: string;
  }) => {
    await api(
      `/messages/${id}`,
      method === 'PATCH'
        ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }
        : { method: 'DELETE' },
    );
    if (method === 'PATCH') setEditing(null);
    void refresh();
  };
  const upload = async (files: File[]) => {
    const groupId = crypto.randomUUID();
    for (const [index, file] of files.entries()) {
      const form = new FormData();
      form.append('type', file.type.startsWith('audio/') ? 'AUDIO' : 'IMAGE');
      form.append('clientMessageId', `${groupId}:${index}`);
      form.append('file', file);
      const message = await api<ChatMessage>(`/conversations/${conversationId}/attachments`, {
        method: 'POST',
        body: form,
      });
      qc.setQueryData<MessagePage>(chatKeys.messages(conversationId), (data) =>
        upsertMessageList(data, message),
      );
    }
    void refresh();
  };
  const [uploadState, setUploadState] = useState<'idle' | 'busy' | 'error'>('idle');
  const clearSelectedFiles = () => {
    setSelectedFiles((selected) => {
      selected.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      return [];
    });
  };
  const sendSelectedFiles = async () => {
    if (!selectedFiles.length) return;
    try {
      setUploadState('busy');
      await upload(selectedFiles.map(({ file }) => file));
      clearSelectedFiles();
      setUploadState('idle');
    } catch {
      setUploadState('error');
    }
  };
  const sendRecorded = async () => {
    if (!recorded) return;
    try {
      setUploadState('busy');
      await upload([new File([recorded.blob], 'voice.webm', { type: recorded.blob.type })]);
      setRecorded(null);
      setUploadState('idle');
    } catch {
      setUploadState('error');
    }
  };
  const startRecording = async () => {
    setRecordingError(null);
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setRecordingError('Voice recording requires HTTPS or localhost in a supported browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        setRecorded({
          blob,
          url: URL.createObjectURL(blob),
          seconds,
        });
        stream.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1_000);
    } catch (error) {
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      const missing = error instanceof DOMException && error.name === 'NotFoundError';
      setRecordingError(
        denied
          ? 'Microphone access was blocked. Allow it in your browser site settings, then try again.'
          : missing
            ? 'No microphone was found on this device.'
            : 'The microphone could not be started. Check your browser permissions and try again.',
      );
    }
  };
  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };
  const cancelRecorded = () => {
    if (recorded) URL.revokeObjectURL(recorded.url);
    setRecorded(null);
    setSeconds(0);
  };
  const sendText = (text: string) => {
    const content = text.trim();
    if (!content) return;
    send
      .mutateAsync(content)
      .then(() => setDraft((current) => (current === text ? '' : current)))
      .catch(() => undefined);
  };
  const submitComposer = async () => {
    if (selectedFiles.length) await sendSelectedFiles();
    if (draft.trim()) sendText(draft);
  };
  if (me.isLoading || q.isLoading || conversation.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (me.isError || q.isError || conversation.isError)
    return (
      <div className="page">
        <Failure
          retry={() => void Promise.all([me.refetch(), q.refetch(), conversation.refetch()])}
        />
      </div>
    );
  const messages = [...(q.data?.messages ?? [])].reverse().filter((m) => !m.isDeleted);
  const displayItems = groupMediaMessages(messages);
  return (
    <section className="page panel chat">
      <header className="chat-head">
        <BackButton fallback="/app/messages" />
        <span className="chat-peer-avatar" aria-hidden="true">
          {(other?.user?.profile?.firstName ?? 'P').charAt(0).toUpperCase()}
        </span>
        <div>
          {otherId ? (
            <Link className="text-link" href={`/app/people/${otherId}`}>
              {other?.user?.profile?.firstName ?? 'Private conversation'}
            </Link>
          ) : (
            <strong>Private conversation</strong>
          )}
          <div
            className={`chat-presence ${
              connection !== 'connected' ? 'reconnecting' : presenceOnline ? 'online' : 'offline'
            }`}
          >
            {typing ? (
              <span className="typing-indicator">typing…</span>
            ) : connection !== 'connected' ? (
              'Reconnecting…'
            ) : presenceOnline ? (
              'Online'
            ) : (
              'Offline'
            )}
          </div>
        </div>
      </header>
      <div className="messages" ref={messageList}>
        {displayItems.map((item) =>
          'items' in item ? (
            <article
              key={item.id}
              className={`media-group-bubble ${item.senderId === me.data?.id ? 'user' : 'assistant'}`}
            >
              <div className={`media-group-grid count-${Math.min(item.items.length, 4)}`}>
                {item.items.slice(0, 4).map((photo, index) => (
                  <button
                    type="button"
                    key={photo.id}
                    onClick={() =>
                      setGallery({
                        urls: item.items.map((entry) => mediaSource(entry.mediaUrl!)),
                        index,
                      })
                    }
                  >
                    <Image
                      unoptimized
                      src={mediaSource(photo.mediaUrl!)}
                      alt={`Shared attachment ${index + 1}`}
                      width={300}
                      height={240}
                    />
                    {index === 3 && item.items.length > 4 && (
                      <span className="media-group-more">+{item.items.length - 4}</span>
                    )}
                  </button>
                ))}
              </div>
              <time>{new Date(item.items.at(-1)!.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </article>
          ) : (
          <article
            key={item.id}
            className={`bubble ${item.senderId === me.data?.id ? 'user' : 'assistant'} ${
              item.type === 'IMAGE' ? 'image-bubble' : ''
            }`}
          >
            {(() => { const m = item; return (
            <>
            {editing === m.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const content = editText.trim();
                  if (content) void manageMessage({ id: m.id, method: 'PATCH', content });
                }}
              >
                <textarea
                  aria-label="Edit message"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={2000}
                />
                <div className="bubble-actions">
                  <button className="button icon-button" aria-label="Save message" title="Save">
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    className="button ghost icon-button"
                    aria-label="Cancel editing"
                    title="Cancel"
                    onClick={() => setEditing(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </form>
            ) : (
              <>
                {m.type === 'IMAGE' && m.mediaUrl ? (
                  <button type="button" className="chat-image-button" onClick={() => setGallery({ urls: [mediaSource(m.mediaUrl!)], index: 0 })}>
                    <Image unoptimized className="chat-image" src={mediaSource(m.mediaUrl)} alt="Shared attachment" width={420} height={360} />
                  </button>
                ) : m.type === 'AUDIO' && m.mediaUrl ? (
                  <audio controls src={mediaSource(m.mediaUrl)} />
                ) : (
                  m.content
                )}
                <div className="bubble-meta">
                  {m.isEdited && <small>Edited</small>}
                  <time dateTime={m.createdAt}>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  {m.senderId === me.data?.id && m.type === 'TEXT' && (
                    <span
                      className="chat-status"
                      title={statusTitle[m.status] ?? m.status}
                      aria-label={statusTitle[m.status] ?? m.status}
                    >
                      {statusMark[m.status] ?? '✓'}
                    </span>
                  )}
                </div>
                {m.senderId === me.data?.id && m.type === 'TEXT' && (
                  <div className="bubble-actions">
                    <button
                      type="button"
                      className="button ghost icon-button chat-message-action"
                      aria-label="Edit message"
                      title="Edit"
                      onClick={() => {
                        setEditing(m.id);
                        setEditText(m.content ?? '');
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <ConfirmButton
                      icon={<Trash2 size={16} />}
                      confirmIcon={<Check size={16} />}
                      label="Delete message"
                      ariaLabel="Delete message"
                      className="button ghost icon-button chat-message-action chat-message-delete"
                      onConfirm={() => void manageMessage({ id: m.id, method: 'DELETE' })}
                    />
                  </div>
                )}
              </>
            )}
            </>); })()}
          </article>
          ),
        )}
      </div>
      <div className="chat-footer">
      {(send.isError || uploadState === 'error') && (
        <p className="error" role="alert">
          {send.isError ? send.error?.message : 'Could not send the attachment. Try again.'}
        </p>
      )}
      {recordingError && (
        <p className="error" role="alert">
          {recordingError}
        </p>
      )}
      {selectedFiles.length > 0 && (
        <div className="attachment-preview">
          <div className="attachment-preview-head">
            <strong>
              {selectedFiles.length} {selectedFiles.length === 1 ? 'attachment' : 'attachments'}
              {' '}selected
            </strong>
          </div>
          <div className="attachment-preview-list">
            {selectedFiles.map(({ file, previewUrl }, index) => (
              <div className="attachment-preview-item" key={`${file.name}-${file.lastModified}`}>
                {file.type.startsWith('image/') ? (
                  <Image unoptimized src={previewUrl} alt={file.name} width={92} height={92} />
                ) : (
                  <audio controls src={previewUrl} />
                )}
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setSelectedFiles((selected) => {
                      URL.revokeObjectURL(selected[index].previewUrl);
                      return selected.filter((_, itemIndex) => itemIndex !== index);
                    })
                  }
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {recorded ? (
        <div className="recorder">
          <audio controls src={recorded.url} />
          <span className="muted">{Math.max(1, Math.round(recorded.seconds))}s</span>
          <button
            className="button"
            disabled={uploadState === 'busy'}
            onClick={() => void sendRecorded()}
          >
            {uploadState === 'busy' ? 'Sending…' : 'Send'}
          </button>
          <button
            type="button"
            className="button ghost icon-button"
            aria-label="Discard recording"
            title="Discard"
            disabled={uploadState === 'busy'}
            onClick={cancelRecorded}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submitComposer();
          }}
        >
          <input
            ref={fileInput}
            hidden
            type="file"
            accept="image/*,audio/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).slice(0, 10);
              if (files.length) {
                setUploadState('idle');
                setSelectedFiles((selected) => [
                  ...selected,
                  ...files.slice(0, Math.max(0, 10 - selected.length)).map((file) => ({
                    file,
                    previewUrl: URL.createObjectURL(file),
                  })),
                ]);
              }
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="button secondary"
            aria-label="Add photos or audio"
            disabled={uploadState === 'busy'}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus size={18} />
          </button>
          {recording ? (
            <button
              type="button"
              className="button"
              aria-label="Stop recording"
              title="Stop and preview"
              onClick={stopRecording}
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="button secondary"
              aria-label="Record a voice message"
              title="Record voice message"
              onClick={() => void startRecording()}
            >
              <Mic size={18} />
            </button>
          )}
          <textarea
            aria-label="Message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submitComposer();
              }
            }}
            maxLength={2000}
            placeholder="Share a thought..."
          />
          <div className="emoji-picker-wrap" ref={emojiPickerRef}>
            <button type="button" className="button secondary" aria-label="Choose an emoji" onClick={() => setEmojiOpen((open) => !open)}>
              <Smile size={18} />
            </button>
            {emojiOpen && (
              <div className="emoji-picker-panel" role="dialog" aria-label="Emoji picker">
                <EmojiPicker
                  theme={Theme.DARK}
                  lazyLoadEmojis
                  searchPlaceHolder="Search emojis"
                  width={320}
                  height={420}
                  onEmojiClick={(emoji) => {
                    setDraft((text) => `${text}${emoji.emoji}`);
                    setEmojiOpen(false);
                  }}
                />
              </div>
            )}
          </div>
          <button
            className="button"
            disabled={
              send.isPending || uploadState === 'busy' || (!draft.trim() && !selectedFiles.length)
            }
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </form>
      )}
      {recording && (
        <div className="recorder recorder-live" role="status">
          <span className="record-dot" />
          Recording {seconds}s — press the square to stop
        </div>
      )}
      </div>
      {gallery && (
        <div className="media-gallery" role="dialog" aria-modal="true" aria-label="Photo gallery">
          <button className="media-gallery-close" type="button" aria-label="Close gallery" onClick={() => setGallery(null)}><X size={24} /></button>
          <Image unoptimized src={gallery.urls[gallery.index]} alt={`Photo ${gallery.index + 1} of ${gallery.urls.length}`} width={1200} height={900} />
          {gallery.urls.length > 1 && (
            <div className="media-gallery-nav">
              <button type="button" onClick={() => setGallery((current) => current && ({ ...current, index: (current.index - 1 + current.urls.length) % current.urls.length }))}>Previous</button>
              <span>{gallery.index + 1} / {gallery.urls.length}</span>
              <button type="button" onClick={() => setGallery((current) => current && ({ ...current, index: (current.index + 1) % current.urls.length }))}>Next</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
