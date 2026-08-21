'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
import { useChatSocketLifecycle, useConversations } from '@/features/chat/use-chat';
import { useMeQuery } from '@/providers/me';

const items = [
  ['/app', 'Discover', MessageCircleHeart],
  ['/app/insights', 'Soulprint', Sparkles],
  ['/app/growth', 'Growth', TrendingUp],
  ['/app/soul', 'Your matche', Heart],
  ['/app/messages', 'Messages', MessageCircle],
  ['/app/profile', 'Profile', UserRound],
  ['/app/profile/coach', 'My Coach', Sparkles],
] as const;

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [messageNotice, setMessageNotice] = useState<{
    conversationId: string;
    sender: string;
  } | null>(null);
  const previousUnread = useRef<Map<string, number> | null>(null);
  const me = useMeQuery();
  const conversations = useConversations();
  useChatSocketLifecycle(Boolean(me.data?.id));
  const unreadCount = (conversations.data ?? []).reduce(
    (total, conversation) => total + (conversation.unreadCount ?? 0),
    0,
  );

  useEffect(() => {
    if (!conversations.data) return;
    const next = new Map(
      conversations.data.map((conversation) => [conversation.id, conversation.unreadCount ?? 0]),
    );
    if (previousUnread.current && !pathname.startsWith('/app/messages')) {
      const changed = conversations.data.find(
        (conversation) =>
          (conversation.unreadCount ?? 0) > (previousUnread.current?.get(conversation.id) ?? 0),
      );
      if (changed) {
        const sender =
          changed.participants.find((participant) => participant.userId !== me.data?.id)?.user
            ?.profile?.firstName ?? 'Someone';
        setMessageNotice({ conversationId: changed.id, sender });
      }
    }
    previousUnread.current = next;
  }, [conversations.data, me.data?.id, pathname]);

  useEffect(() => {
    if (!messageNotice) return;
    const timer = window.setTimeout(() => setMessageNotice(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [messageNotice]);

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
              <span>{label}</span>
              {href === '/app/messages' && unreadCount > 0 && (
                <span className="nav-unread-badge" aria-label={`${unreadCount} unread messages`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
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
            <span className="mobile-nav-icon">
              <Icon size={20} />
              {href === '/app/messages' && unreadCount > 0 && (
                <span className="mobile-unread-badge" aria-label={`${unreadCount} unread messages`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      {messageNotice && (
        <Link
          href={`/app/messages/${messageNotice.conversationId}`}
          className="message-notice"
          onClick={() => setMessageNotice(null)}
          role="status"
        >
          <span className="message-notice-icon"><MessageCircle size={19} /></span>
          <span><strong>{messageNotice.sender}</strong><small>Sent you a new message</small></span>
          <span className="message-notice-dot" aria-hidden="true" />
        </Link>
      )}
    </>
  );
}
