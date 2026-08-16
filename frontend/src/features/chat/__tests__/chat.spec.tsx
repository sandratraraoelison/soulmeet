import { fireEvent, render } from '@testing-library/react-native';
import type { InfiniteData } from '@tanstack/react-query';
import { MessageBubble } from '../components/MessageBubble';
import type { Message, MessagePage } from '../types/chat.types';
import { patchMessage, upsertMessage } from '../utils/chat.utils';

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'one',
  clientMessageId: 'client-one',
  conversationId: 'conversation',
  senderId: 'me',
  content: 'Bonjour',
  type: 'TEXT',
  status: 'SENT',
  isEdited: false,
  editedAt: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: '2026-08-06T12:00:00.000Z',
  updatedAt: '2026-08-06T12:00:00.000Z',
  ...overrides,
});
const data = (messages: Message[]): InfiniteData<MessagePage> => ({
  pages: [{ messages, nextCursor: null }],
  pageParams: [undefined],
});

describe('chat cache utilities', () => {
  it('adds a realtime message to the first page', () => {
    const result = upsertMessage(
      data([makeMessage()]),
      makeMessage({ id: 'two', clientMessageId: 'client-two' }),
    );
    expect(result?.pages[0]!.messages.map((item) => item.id)).toEqual(['two', 'one']);
  });

  it('deduplicates a server message using clientMessageId', () => {
    const pending = makeMessage({ id: 'pending:one', status: 'PENDING' });
    const confirmed = makeMessage({ id: 'server-one', status: 'SENT' });
    const result = upsertMessage(data([pending]), confirmed);
    expect(result?.pages[0]!.messages).toHaveLength(1);
    expect(result?.pages[0]!.messages[0]!.id).toBe('server-one');
  });

  it('updates an edited message without rebuilding other messages', () => {
    const other = makeMessage({ id: 'two' });
    const result = patchMessage(data([makeMessage(), other]), 'one', {
      content: 'Edited',
      isEdited: true,
    });
    expect(result?.pages[0]!.messages[0]).toMatchObject({ content: 'Edited', isEdited: true });
    expect(result?.pages[0]!.messages[1]).toBe(other);
  });

  it('removes original content when a message is deleted', () => {
    const result = patchMessage(data([makeMessage()]), 'one', {
      content: null,
      isDeleted: true,
    });
    expect(result?.pages[0]!.messages[0]).toMatchObject({ content: null, isDeleted: true });
  });
});

describe('MessageBubble', () => {
  it('renders sent message content and status', async () => {
    const view = await render(<MessageBubble message={makeMessage()} mine />);
    expect(view.getByText('Bonjour')).toBeTruthy();
    expect(view.getByText('✓')).toBeTruthy();
  });

  it('shows read status with two checks', async () => {
    const view = await render(
      <MessageBubble message={makeMessage({ status: 'READ' })} mine />,
    );
    expect(view.getByText('✓✓')).toBeTruthy();
  });

  it('never displays deleted original content', async () => {
    const view = await render(
      <MessageBubble
        message={makeMessage({ content: 'secret', isDeleted: true })}
        mine
      />,
    );
    expect(view.queryByText('secret')).toBeNull();
    expect(view.getByText('This message was deleted')).toBeTruthy();
  });

  it('opens actions only for an owned active message', async () => {
    const onLongPress = jest.fn();
    const view = await render(
      <MessageBubble message={makeMessage()} mine onLongPress={onLongPress} />,
    );
    fireEvent(view.getByText('Bonjour'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('allows retrying a failed message', async () => {
    const onRetry = jest.fn();
    const view = await render(
      <MessageBubble
        message={makeMessage({ status: 'FAILED' })}
        mine
        onRetry={onRetry}
      />,
    );
    fireEvent.press(view.getByText('Bonjour'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(view.getByText('Failed · Tap to try again')).toBeTruthy();
  });
});
