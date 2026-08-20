'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function ConfirmButton({
  label,
  confirmLabel = 'Confirm?',
  icon,
  confirmIcon,
  ariaLabel,
  onConfirm,
  disabled,
  className = 'button ghost',
}: {
  label: string;
  confirmLabel?: string;
  icon?: ReactNode;
  confirmIcon?: ReactNode;
  ariaLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const handle = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    onConfirm();
  };
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={handle}
      aria-label={ariaLabel ?? label}
      title={label}
    >
      {armed ? (confirmIcon ?? confirmLabel) : (icon ?? label)}
    </button>
  );
}