import { NextResponse } from 'next/server';
import { backendUrl } from '@/lib/session';

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (!path.length || path.some((segment) => segment === '.' || segment === '..')) {
    return NextResponse.json({ message: 'Invalid attachment path' }, { status: 400 });
  }
  const safePath = path.map(encodeURIComponent).join('/');
  const backendOrigin = new URL(backendUrl()).origin;
  const upstream = await fetch(`${backendOrigin}/uploads/${safePath}`, { cache: 'no-store' });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ message: 'Attachment not found' }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
