import { NextRequest, NextResponse } from "next/server";
import {
  clearLoginFailures,
  isLoginBlocked,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

const base = process.env.API_URL ?? "http://localhost:3000/api/v1";
const adminRoles = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT"];

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function sessionFrom(
  data: { accessToken: string; refreshToken: string },
  ip: string,
  emailHint?: string,
): Promise<NextResponse> {
  const meResponse = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${data.accessToken}` },
    cache: "no-store",
  });
  const me = (await meResponse.json().catch(() => null)) as {
    role?: string;
    email?: string;
  } | null;
  if (!me?.role || !adminRoles.includes(me.role)) {
    await fetch(`${base}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: data.refreshToken }),
    }).catch(() => undefined);
    return NextResponse.json(
      { message: "Administrator access required" },
      { status: 403 },
    );
  }
  const email = me.email ?? emailHint;
  if (email) clearLoginFailures(`${ip}|${email.toLowerCase()}`);
  const result = NextResponse.json({ ok: true, role: me.role, email });
  result.cookies.set("sm_access", data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
  result.cookies.set("sm_refresh", data.refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    maxAge: 30 * 86400,
  });
  return result;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    twoFactorToken?: string;
    code?: string;
  } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  const key = `${ip}|${email}`;
  if (email && isLoginBlocked(key)) {
    return NextResponse.json(
      { message: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  // Second step: complete the two-factor verification with the short-lived
  // token obtained from the first call.
  if (body?.twoFactorToken) {
    const second = await fetch(`${base}/auth/login/2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body: JSON.stringify({
        twoFactorToken: body.twoFactorToken,
        code: body.code ?? "",
      }),
      cache: "no-store",
    });
    const secondData = await second.json().catch(() => null);
    if (!second.ok) {
      if (email) recordLoginFailure(key);
      return NextResponse.json(
        secondData ?? { message: "The verification code was rejected." },
        { status: second.status },
      );
    }
    return sessionFrom(
      secondData as { accessToken: string; refreshToken: string },
      ip,
      email,
    );
  }

  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify({ email, password: body?.password ?? "" }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (email) recordLoginFailure(key);
    if (response.status === 429)
      return NextResponse.json(
        { message: "Too many attempts. Try again later." },
        { status: 429 },
      );
    return NextResponse.json(
      data ?? {
        message:
          "Sign-in failed. Check your credentials and administrator access.",
      },
      { status: response.status },
    );
  }

  const tokens = data as {
    requiresTwoFactor?: boolean;
    twoFactorToken?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  if (tokens.requiresTwoFactor) {
    // The short-lived token (5 min) is handed to the frontend, which must pair
    // it with a valid TOTP/recovery code before any session is issued.
    return NextResponse.json(
      { requiresTwoFactor: true, twoFactorToken: tokens.twoFactorToken },
      { status: 200 },
    );
  }
  if (!tokens.accessToken || !tokens.refreshToken) {
    return NextResponse.json(
      {
        message:
          "Sign-in failed. Check your credentials and administrator access.",
      },
      { status: 401 },
    );
  }
  return sessionFrom(
    tokens as { accessToken: string; refreshToken: string },
    ip,
    email,
  );
}
