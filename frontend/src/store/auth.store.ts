import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isRestoring: boolean;
  setAuthenticated: (value: boolean) => void;
  finishRestoring: (authenticated: boolean) => void;
  reset: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isRestoring: true,
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  finishRestoring: (isAuthenticated) =>
    set({ isAuthenticated, isRestoring: false }),
  reset: () => set({ isAuthenticated: false, isRestoring: false }),
}));
