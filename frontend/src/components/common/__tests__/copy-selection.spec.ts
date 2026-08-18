import { preserveNonEmptySelection, selectedText } from '../CopySelectionModal';

describe('copy selection', () => {
  it('returns only the selected passage', () => {
    expect(selectedText('Hello beautiful world', { start: 6, end: 15 })).toBe('beautiful');
  });

  it('keeps selection bounds inside the message', () => {
    expect(selectedText('Hello', { start: -4, end: 99 })).toBe('Hello');
  });

  it('keeps the last passage selected when Android reports a collapsed cursor', () => {
    expect(preserveNonEmptySelection(
      { start: 6, end: 15 },
      { start: 15, end: 15 },
    )).toEqual({ start: 6, end: 15 });
  });

  it('accepts a new non-empty selection', () => {
    expect(preserveNonEmptySelection(
      { start: 0, end: 5 },
      { start: 6, end: 15 },
    )).toEqual({ start: 6, end: 15 });
  });
});
