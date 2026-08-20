import { NextResponse } from 'next/server';

function errorName(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'name' in error
    ? String(error.name)
    : undefined;
}

export function upstreamErrorResponse(error: unknown): NextResponse {
  const name = errorName(error);
  const timedOut = name === 'TimeoutError' || name === 'AbortError';
  return NextResponse.json(
    {
      message: timedOut
        ? 'Soulmeet is taking longer than expected to respond. Please try again.'
        : 'Soulmeet is temporarily unable to reach the server. Please try again.',
    },
    { status: timedOut ? 504 : 502 },
  );
}
