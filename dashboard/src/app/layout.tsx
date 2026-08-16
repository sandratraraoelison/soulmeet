import type { Metadata } from 'next'; import './globals.css'; import { Providers } from './providers';
export const metadata: Metadata = { title: 'Soulmeet Admin', description: 'Community operations dashboard' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>; }
