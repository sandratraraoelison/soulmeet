import type { Metadata } from 'next';
import { AppNav } from '@/components/app-nav';
import { MeProvider } from '@/providers/me';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <div className="app-shell">
        <AppNav />
        <main className="main">{children}</main>
      </div>
    </MeProvider>
  );
}
