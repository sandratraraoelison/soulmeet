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
    };
    window.addEventListener(eventName, receive);
    return () => window.removeEventListener(eventName, receive);
  }, []);

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} setToasts={setToasts} />
      ))}
    </div>
  );
}

function ToastItem({ toast, setToasts }: { toast: Toast; setToasts: React.Dispatch<React.SetStateAction<Toast[]>> }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || toast.kind === 'error') return;
    const timer = window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 5000);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.kind, paused, setToasts]);
  return (
    <div className={`app-toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {toast.kind === 'success' ? <CheckCircle2 aria-hidden /> : <CircleAlert aria-hidden />}
      <span>{toast.message}</span>
      <button type="button" aria-label="Close notification" title="Close notification" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
        <X aria-hidden />
      </button>
    </div>
  );
}
