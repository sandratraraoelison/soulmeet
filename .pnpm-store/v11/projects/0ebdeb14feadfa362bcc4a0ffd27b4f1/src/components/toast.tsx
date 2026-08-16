"use client";

import { CircleCheck, CircleX, X } from "lucide-react";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; message: string };
type ToastContextValue = { notify: (kind: ToastKind, message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextToastId;
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 4000);
  }, [dismiss]);
  const value = useMemo(() => ({ notify }), [notify]);

  return <ToastContext value={value}>
    {children}
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = toast.kind === "success" ? CircleCheck : CircleX;
        return <div className={`toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"} key={toast.id}>
          <Icon size={20} aria-hidden="true" />
          <span>{toast.message}</span>
          <button className="toast-close" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}><X size={16} /></button>
        </div>;
      })}
    </div>
  </ToastContext>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
