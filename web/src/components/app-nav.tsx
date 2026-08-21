'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Heart,
  LoaderCircle,
  MessageCircle,
  MessageCircleHeart,
  Settings,
  Sparkles,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { Brand } from './brand';

const items = [
  ['/app', 'Guidance', MessageCircleHeart],
  ['/app/insights', 'Insights', Sparkles],
  ['/app/growth', 'Growth', TrendingUp],
  ['/app/soul', 'Soul', Heart],
  ['/app/messages', 'Messages', MessageCircle],
  ['/app/profile', 'Profile', UserRound],
  ['/app/profile/coach', 'My Coach', Sparkles],
] as const;

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'DELETE' });
      router.replace('/login');
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <>
      <aside className="sidebar">
        <Brand />
        <nav className="nav">
          {items.map(([href, label, Icon]) => (
            <Link key={href} href={href} className={pathname === href ? 'active' : ''}>
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <footer>
          <Link
            href="/app/settings"
            className={
              pathname === '/app/settings' ? 'nav-footer-link active' : 'nav-footer-link'
            }
          >
            <Settings size={19} />
            Settings
          </Link>
          <button
            className="button danger-ghost"
            disabled={signingOut}
            aria-busy={signingOut}
            onClick={() => void logout()}
          >
            {signingOut && <LoaderCircle className="button-spinner" size={18} aria-hidden="true" />}
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </footer>
      </aside>

      <nav className="mobile-nav" aria-label="Main navigation">
        {items.slice(0, 6).map(([href, label, Icon]) => (
          <Link key={href} href={href} className={pathname === href ? 'active' : ''}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
