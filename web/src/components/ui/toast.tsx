'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';

export type ToastKind = 'success' | 'error';
type Toast = { id: number; kind: ToastKind; message: string };
const eventName = 'soulmeet:toast';

export function showToast(kind: ToastKind, message: string) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: { kind, message } }));
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<Omit<Toast, 'id'>>).detail;
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, ...detail }]);
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500);
    };
    window.addEventListener(eventName, receive);
    return () => window.removeEventListener(eventName, receive);
  }, []);

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className={`app-toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'} key={toast.id}>
          {toast.kind === 'success' ? <CheckCircle2 aria-hidden /> : <CircleAlert aria-hidden />}
          <span>{toast.message}</span>
          <button aria-label="Close notification" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
            <X aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
