import { queryClient } from '../query-client';
import { useToastStore } from '@/store/toast.store';

jest.mock('@/api/client', () => ({ getErrorMessage: (error: Error) => error.message }));

afterEach(() => { queryClient.clear(); useToastStore.setState({ toasts: [] }); });

it('reports a successful save only after the request completes', async () => {
  let finish!: (value: string) => void;
  const mutation = queryClient.getMutationCache().build(queryClient, {
    gcTime: 0,
    meta: { successMessage: 'Coach updated.', errorMessage: true },
    mutationFn: () => new Promise<string>((resolve) => { finish = resolve; }),
  });
  const request = mutation.execute(undefined);
  await Promise.resolve();
  expect(useToastStore.getState().toasts).toHaveLength(0);
  finish('saved');
  await request;
  expect(useToastStore.getState().toasts[0]).toMatchObject({ kind: 'success', message: 'Coach updated.' });
});

it('reports failed saves without a success notification', async () => {
  const mutation = queryClient.getMutationCache().build(queryClient, {
    gcTime: 0,
    meta: { successMessage: 'Coach updated.', errorMessage: true },
    mutationFn: async () => { throw new Error('Unable to save.'); },
  });
  await expect(mutation.execute(undefined)).rejects.toThrow('Unable to save.');
  expect(useToastStore.getState().toasts).toEqual([expect.objectContaining({ kind: 'error', message: 'Unable to save.' })]);
});
