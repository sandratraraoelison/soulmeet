import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // React's dev mode relies on eval() for stack reconstruction; production
      // builds never use it, so keep the directive tight there.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://accounts.google.com`,
      "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com/gsi/",
      "frame-src https://accounts.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next.js 16.3's React debug channel can race while closing its browser
    // WritableStream during development navigation. The channel is only a
    // debugging aid; disabling it does not affect React Server Components.
    reactDebugChannel: false,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default config;
