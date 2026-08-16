"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Empty, ErrorState, Loading } from "@/components/page-state";
import { useToast } from "@/components/toast";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
type Setting = { key: string; value: Record<string, unknown>; description?: string; updatedAt: string };
type PendingSetting = { key: string; value: Record<string, unknown>; description?: string };
type SettingHistory = { items: { id: string; oldValue?: Record<string, unknown>; newValue?: Record<string, unknown>; createdAt: string; actor?: { email: string } }[] };
type AdminSession = { id: string; deviceInfo?: string; createdAt: string; expiresAt: string };
export default function SettingsPage() {
  const [key, setKey] = useState(""); const [rawValue, setRawValue] = useState("{\n  \"enabled\": true\n}"); const [description, setDescription] = useState(""); const [pendingSetting, setPendingSetting] = useState<PendingSetting | null>(null); const [validationError, setValidationError] = useState(""); const [revokeOpen, setRevokeOpen] = useState(false); const { notify } = useToast(); const queryClient = useQueryClient(); const router = useRouter();
  const session = useQuery({ queryKey: ["session"], queryFn: () => api<SessionUser>("auth/me") });
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => api<Setting[]>("admin/settings") });
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauthUrl: string; issuer: string } | null>(null);
  const [twoFactorRecovery, setTwoFactorRecovery] = useState<string[] | null>(null);
  type TwoFactorResult =
    | { action: "setup"; secret: string; otpauthUrl: string; issuer: string }
    | { action: "enable"; recoveryCodes: string[] }
    | { action: "disable"; message: string };
  const twoFactor = useMutation({
    mutationFn: async ({ action }: { action: "setup" | "enable" | "disable" }): Promise<TwoFactorResult> => {
      if (action === "setup") {
        const result = await api<{ secret: string; otpauthUrl: string; issuer: string }>("auth/2fa/setup", { method: "POST" });
        return { action, ...result };
      }
      if (action === "enable") {
        const result = await api<{ recoveryCodes: string[] }>("auth/2fa/enable", { method: "POST", body: JSON.stringify({ code: twoFactorCode }) });
        return { action, ...result };
      }
      const result = await api<{ message: string }>("auth/2fa/disable", { method: "POST", body: JSON.stringify({ code: twoFactorCode }) });
      return { action, ...result };
    },
    onSuccess: (data) => {
      if (data.action === "setup") { setTwoFactorSetup({ secret: data.secret, otpauthUrl: data.otpauthUrl, issuer: data.issuer }); setTwoFactorCode(""); }
      if (data.action === "enable") { setTwoFactorSetup(null); setTwoFactorRecovery(data.recoveryCodes); notify("success", "Two-factor authentication enabled. Save your recovery codes."); }
      if (data.action === "disable") { notify("success", "Two-factor authentication disabled."); }
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (error) => notify("error", error.message),
  });
  const history = useQuery({ queryKey: ["setting-history", key], queryFn: () => api<SettingHistory>(`admin/audit-logs?resource=AppSetting&resourceId=${encodeURIComponent(key)}&limit=10`), enabled: Boolean(key) });
  const sessions = useQuery({ queryKey: ["admin-sessions"], queryFn: () => api<AdminSession[]>("admin/sessions") });
  const revokeSessions = useMutation({ mutationFn: () => api<{ revoked: number }>("admin/sessions", { method: "DELETE" }), onSuccess: async (result) => { notify("success", `${result.revoked} session(s) revoked.`); setRevokeOpen(false); await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }, onError: (error) => notify("error", error.message) });
  const save = useMutation({ mutationFn: ({ key: settingKey, value, description: settingDescription }: PendingSetting) => api(`admin/settings/${settingKey}`, { method: "PATCH", body: JSON.stringify({ value, description: settingDescription }) }), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["settings"] }), queryClient.invalidateQueries({ queryKey: ["setting-history"] })]); notify("success", "The setting was published successfully."); setPendingSetting(null); }, onError: (error) => notify("error", error.message) });
  const parse = () => { try { const value = JSON.parse(rawValue) as unknown; if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); setValidationError(""); return value as Record<string, unknown>; } catch { const message = "Value must be a valid JSON object."; setValidationError(message); notify("error", message); return null; } };
  const submit = (event: FormEvent) => { event.preventDefault(); const value = parse(); if (value) { save.reset(); setPendingSetting({ key, value, description }); } };
  const edit = (setting: Setting) => { setKey(setting.key); setRawValue(JSON.stringify(setting.value, null, 2)); setDescription(setting.description ?? ""); setValidationError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <><PageHeader title="Settings" description="Validate, preview and restore audited runtime configuration." />
    <section className="card security-card"><div><h2>Two-factor authentication</h2><p className="muted">{session.data?.twoFactorEnabled ? "This account requires a one-time code at sign-in." : "Add a one-time code at sign-in for this administrator account."}</p></div>
      {twoFactorSetup ? (
        <div className="modal-form">
          <p className="muted">Add this account to your authenticator app using the setup URL or the secret, then confirm with a generated code:</p>
          <label className="field"><span>Setup URL (otpauth://)</span><div className="row-actions"><input className="input grow" readOnly value={twoFactorSetup.otpauthUrl} onFocus={(event) => event.currentTarget.select()} /><button className="button" onClick={() => void navigator.clipboard.writeText(twoFactorSetup.otpauthUrl).then(() => notify("success", "Setup URL copied."))}>Copy</button></div></label>
          <label className="field"><span>Secret</span><div className="row-actions"><input className="input grow" readOnly value={twoFactorSetup.secret} onFocus={(event) => event.currentTarget.select()} /><button className="button" onClick={() => void navigator.clipboard.writeText(twoFactorSetup.secret).then(() => notify("success", "Secret copied."))}>Copy</button></div></label>
          <label className="field"><span>Verify with a code from your app</span><input className="input" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} placeholder="6-digit code" inputMode="numeric" /></label>
          <div className="row-actions"><button className="button" disabled={twoFactor.isPending} onClick={() => { setTwoFactorSetup(null); setTwoFactorCode(""); }}>Cancel</button><button className="button primary" disabled={twoFactor.isPending || twoFactorCode.length !== 6} onClick={() => twoFactor.mutate({ action: "enable" })}>Enable two-factor</button></div>
        </div>
      ) : twoFactorRecovery ? (
        <div className="modal-form">
          <p className="muted">Store these recovery codes somewhere safe. Each code can be used once.</p>
          <ul className="recovery-list">{twoFactorRecovery.map((code) => <li key={code}><code>{code}</code></li>)}</ul>
          <div className="row-actions"><button className="button primary" onClick={() => setTwoFactorRecovery(null)}>I saved my recovery codes</button></div>
        </div>
      ) : session.data?.twoFactorEnabled ? (
        <div className="modal-form"><label className="field"><span>Current code to disable</span><input className="input" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} placeholder="6-digit code" inputMode="numeric" /></label><div className="row-actions"><button className="button danger" disabled={twoFactor.isPending || twoFactorCode.length !== 6} onClick={() => twoFactor.mutate({ action: "disable" })}>Disable two-factor</button></div></div>
      ) : (
        <div className="row-actions"><button className="button primary" disabled={twoFactor.isPending} onClick={() => twoFactor.mutate({ action: "setup" })}>Set up two-factor</button></div>
      )}
    </section>
    <section className="card security-card"><div><h2>Administrator sessions</h2><p className="muted">{sessions.data?.length ?? 0} active session(s). Revoke all sessions if you suspect unauthorized access.</p></div><button className="button danger" disabled={!sessions.data?.length} onClick={() => setRevokeOpen(true)}>Sign out everywhere</button>{sessions.data?.slice(0, 3).map((session) => <div className="session-row" key={session.id}><span>{session.deviceInfo || "Unknown device"}</span><small className="muted">Created {new Date(session.createdAt).toLocaleString()} · expires {new Date(session.expiresAt).toLocaleString()}</small></div>)}</section>
    <form className="card settings-editor" onSubmit={submit}><label className="field"><span>Setting key</span><input className="input" value={key} onChange={(event) => setKey(event.target.value)} placeholder="setting.key" required /></label><label className="field"><span>Description</span><input className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this setting control?" /></label><label className="field settings-value"><span>JSON value</span><textarea className="input code-editor" value={rawValue} onChange={(event) => setRawValue(event.target.value)} spellCheck={false} required /></label>{validationError && <p className="error" role="alert">{validationError}</p>}<div className="row-actions"><button type="button" className="button" onClick={() => { const value = parse(); if (value) notify("success", "JSON is valid."); }}>Validate JSON</button><button className="button primary" disabled={save.isPending}>Preview and publish</button></div></form>
    {key && history.data?.items.length ? <section className="card setting-history"><h2>Recent versions of {key}</h2>{history.data.items.map((version) => <div className="list-row" key={version.id}><span>{new Date(version.createdAt).toLocaleString()}<br/><small className="muted">{version.actor?.email ?? "System"}</small></span><button className="button" disabled={!version.oldValue} onClick={() => { if (version.oldValue) setRawValue(JSON.stringify(version.oldValue, null, 2)); }}>Restore previous value</button></div>)}</section> : null}
    {settings.isLoading ? <Loading /> : settings.error ? <ErrorState message={settings.error.message} /> : !settings.data?.length ? <Empty label="No runtime settings configured" /> : <div className="tablewrap"><table><thead><tr><th>Key</th><th>Value</th><th>Description</th><th>Updated</th><th>Action</th></tr></thead><tbody>{settings.data.map((setting) => <tr key={setting.key}><td>{setting.key}</td><td><code>{JSON.stringify(setting.value)}</code></td><td>{setting.description ?? "—"}</td><td>{new Date(setting.updatedAt).toLocaleString()}</td><td><button className="button" onClick={() => edit(setting)}>Edit</button></td></tr>)}</tbody></table></div>}
    <ConfirmDialog open={Boolean(pendingSetting)} title="Publish setting?" description="This change becomes active immediately and will be recorded in the audit log." confirmLabel="Publish setting" pendingLabel="Publishing…" pending={save.isPending} error={save.error?.message} onCancel={() => setPendingSetting(null)} onConfirm={() => { if (pendingSetting) save.mutate(pendingSetting); }}>{pendingSetting && <div className="modal-user"><strong>{pendingSetting.key}</strong><code>{JSON.stringify(pendingSetting.value, null, 2)}</code></div>}</ConfirmDialog>
    <ConfirmDialog open={revokeOpen} title="Sign out everywhere?" description="All administrator sessions, including this one, will be revoked immediately." confirmLabel="Revoke all sessions" pendingLabel="Revoking…" pending={revokeSessions.isPending} tone="danger" error={revokeSessions.error?.message} onCancel={() => setRevokeOpen(false)} onConfirm={() => revokeSessions.mutate()} />
  </>;
}
