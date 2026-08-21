import { NextResponse } from 'next/server';
import { backendUrl } from '@/lib/session';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await context.params;
  if (!UUID.test(mediaId)) {
    return NextResponse.json({ message: 'Invalid attachment id' }, { status: 400 });
  }

  const backendOrigin = new URL(backendUrl()).origin;
  const upstream = await fetch(`${backendOrigin}/api/v1/media/${mediaId}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ message: 'Attachment not found' }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Length': upstream.headers.get('content-length') ?? '',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
