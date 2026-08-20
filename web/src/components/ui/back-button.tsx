'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ fallback = '/app', label = 'Back' }: { fallback?: string; label?: string }) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <button type="button" className="back-button" onClick={goBack}>
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}