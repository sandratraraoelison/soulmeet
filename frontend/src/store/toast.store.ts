import { create } from 'zustand';

type Toast = { id: number; kind: 'success' | 'error'; message: string };
let nextId = 0;
export const useToastStore = create<{
  toasts: Toast[];
  dismiss: (id: number) => void;
}>((set) => ({
  toasts: [],
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function showToast(kind: Toast['kind'], message: string) {
  useToastStore.setState((state) => ({ toasts: [...state.toasts.slice(-2), { id: ++nextId, kind, message }] }));
}
