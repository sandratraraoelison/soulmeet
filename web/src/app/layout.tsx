import type { Metadata } from 'next';
import { Geist, Inter, Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers/providers';
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-label',
  display: 'swap',
});
export const metadata: Metadata = {
  title: { default: 'Soulmeet', template: '%s | Soulmeet' },
  description: 'Dating clarity, meaningful connection, and a personal AI relationship coach.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${geist.variable}`}
    >
      <body>
        <noscript>
          <style>{'.reveal{opacity:1!important;transform:none!important;}'}</style>
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
