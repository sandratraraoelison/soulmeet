import { fireEvent, render } from '@testing-library/react-native';
import { GuidanceMessageActions } from '../components/GuidanceMessageActions';
import type { GuidanceMessage } from '../types/guidance.types';

const message: GuidanceMessage = {
  id: 'message-id', conversationId: 'conversation-id', role: 'USER', content: 'Copy this message',
  isEdited: false, isDeleted: false, createdAt: '2026-08-17T12:00:00Z', updatedAt: '2026-08-17T12:00:00Z',
};

describe('GuidanceMessageActions', () => {
  it('uses an in-app action sheet and exposes copy for a sent message', async () => {
    const onCopy = jest.fn();
    const screen = await render(<GuidanceMessageActions message={message} onClose={jest.fn()} onCopy={onCopy} onDelete={jest.fn()} onRegenerate={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Copy message'));
    expect(onCopy).toHaveBeenCalledWith(message);
    expect(screen.getByText('Message actions')).toBeTruthy();
  });

  it('shows regenerate only for coach responses', async () => {
    const screen = await render(<GuidanceMessageActions message={{ ...message, role: 'ASSISTANT' }} onClose={jest.fn()} onCopy={jest.fn()} onDelete={jest.fn()} onRegenerate={jest.fn()} />);
    expect(screen.getByLabelText('Regenerate response')).toBeTruthy();
  });
});
