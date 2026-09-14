import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { showToast, ToastViewport } from './toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('dismisses success messages automatically but keeps errors available', () => {
  render(<ToastViewport />);
  act(() => { showToast('success', 'Coach updated.'); showToast('error', 'Unable to save.'); });
  expect(screen.getByText('Coach updated.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.queryByText('Coach updated.')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save.');
  fireEvent.click(screen.getByRole('button', { name: 'Close notification' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('pauses dismissal while a notification is being read', () => {
  render(<ToastViewport />);
  act(() => showToast('success', 'Profile updated.'));
  fireEvent.mouseEnter(screen.getByRole('status'));
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByRole('status')).toBeInTheDocument();
  fireEvent.mouseLeave(screen.getByRole('status'));
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
