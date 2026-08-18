import type { NextRequest, NextResponse } from "next/server";

const DEVICE_COOKIE = "sm_device";

export function adminDevice(request: NextRequest) {
  const id = request.cookies.get(DEVICE_COOKIE)?.value ?? crypto.randomUUID();
  const userAgent = (request.headers.get("user-agent") ?? "Unknown browser")
    .replace(/[\r\n|]/g, " ")
    .slice(0, 180);
  return { id, info: `Dashboard | ${id} | ${userAgent}` };
}

export function persistAdminDevice(response: NextResponse, id: string) {
  response.cookies.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    maxAge: 365 * 86400,
  });
}

export function displayAdminDevice(value?: string) {
  if (!value?.startsWith("Dashboard | ")) return value || "Unknown device";
  return value.split(" | ").slice(2).join(" | ") || "Dashboard browser";
}
