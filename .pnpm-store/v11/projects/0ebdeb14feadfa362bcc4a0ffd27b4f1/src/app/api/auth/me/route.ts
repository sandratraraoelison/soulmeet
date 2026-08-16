import { NextRequest, NextResponse } from 'next/server';

const base = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('sm_access')?.value;
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  return new NextResponse(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
