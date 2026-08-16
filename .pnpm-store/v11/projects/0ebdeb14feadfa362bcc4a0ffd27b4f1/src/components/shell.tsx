"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Bot, Brain, FileWarning, Gauge, HeartHandshake, LayoutDashboard, LogOut, MessageCircle, Moon, Settings, ShieldCheck, Sun, Users } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { GlobalSearch } from "@/components/global-search";
import { useToast } from "@/components/toast";
import { api, ApiError } from "@/lib/api";
import { can } from "@/lib/permissions";
import type { SessionUser } from "@/lib/types";
const links = [["Overview", "/", LayoutDashboard], ["Users", "/users", Users], ["AI Coaches", "/coaches", Bot], ["Soulprints", "/soulprints", Brain], ["Matches", "/matches", HeartHandshake], ["Conversations", "/conversations", MessageCircle], ["Reports", "/reports", FileWarning], ["AI Usage", "/ai-usage", Gauge], ["Analytics", "/analytics", BarChart3], ["Settings", "/settings", Settings], ["Audit Logs", "/audit-logs", ShieldCheck]] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme(); const router = useRouter(); const pathname = usePathname(); const { notify } = useToast();
  const session = useQuery({ queryKey: ["session"], queryFn: () => api<SessionUser>("auth/me"), retry: false });
  async function logout() { try { const response = await fetch("/api/auth/logout", { method: "POST" }); if (!response.ok) throw new Error("Sign-out failed."); notify("success", "Signed out successfully."); router.replace("/login"); } catch (error) { notify("error", error instanceof Error ? error.message : "Sign-out failed."); } }
  useEffect(() => { if (session.error instanceof ApiError && [401, 403].includes(session.error.status)) void fetch("/api/auth/logout", { method: "POST" }).finally(() => router.replace("/login")); }, [router, session.error]);
  if (session.isLoading) {
    return <div className="shell"><aside className="sidebar"><div className="brand">Soul<span>meet</span></div><nav className="nav" aria-label="Main navigation">{links.map(([label, href, Icon]) => <span className="nav-skeleton" key={href}><Icon size={18} /><span>{label}</span></span>)}</nav></aside><div className="main"><header className="topbar"><div className="search-skeleton" /><div className="actions"><span className="identity-skeleton" /></div></header><main className="content"><Loading /></main></div></div>;
  }
  if (session.error) {
    return <main className="login"><div className="card state" role="alert"><h3>Could not load your session</h3><p>{session.error instanceof ApiError ? session.error.message : "Please sign in again."}</p><button className="button primary" onClick={() => void fetch("/api/auth/logout", { method: "POST" }).finally(() => router.replace("/login"))}>Back to sign-in</button></div></main>;
  }
  return <div className="shell"><aside className="sidebar"><div className="brand">Soul<span>meet</span></div><nav className="nav" aria-label="Main navigation">{links.filter(([, href]) => href !== "/settings" || can(session.data?.role, "settings")).map(([label, href, Icon]) => { const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`); return <Link className={active ? "active" : undefined} aria-current={active ? "page" : undefined} key={href} href={href}><Icon size={18} /><span>{label}</span></Link>; })}</nav></aside><div className="main"><header className="topbar"><GlobalSearch /><div className="actions"><span className="admin-identity">{session.data?.email}</span><button className="iconbtn" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><button className="iconbtn" aria-label="Sign out" onClick={logout}><LogOut size={18} /></button></div></header><main className="content">{children}</main></div></div>;
}

function Loading() {
  return <div className="grid" aria-label="Loading">{Array.from({ length: 8 }, (_, i) => <div className="skeleton" key={i} />)}</div>;
}
