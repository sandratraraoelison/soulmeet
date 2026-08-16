"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState, Loading } from "@/components/page-state";
import { StatusBadge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

type UserDetail = {
  id: string;
  email: string;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  suspendedUntil?: string | null;
  moderationReason?: string | null;
  profile?: {
    firstName: string;
    birthDate: string;
    gender: string;
    city: string;
    country: string;
    onboardingCompleted: boolean;
  } | null;
  coach?: {
    name: string;
    personality?: string | null;
    traits: string[];
  } | null;
  soulprint?: {
    completenessScore: number;
    promptVersion?: string | null;
    entries: {
      id: string;
      category: string;
      key?: string | null;
      value: string;
      confidence: number;
    }[];
    versions: { id: string; version: number; createdAt: string }[];
  } | null;
  reportsReceived: {
    id: string;
    reason: string;
    priority: string;
    status: string;
    createdAt: string;
  }[];
  adminNotesReceived: {
    id: string;
    content: string;
    createdAt: string;
    author: { email: string };
  }[];
  _count: {
    guidanceConversations: number;
    conversations: number;
    messages: number;
  };
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState("Profile");
  const [pendingStatus, setPendingStatus] = useState<{ next: "SUSPENDED" | "BANNED" | "ACTIVE"; reason: string; suspendedUntil: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["user", id],
    queryFn: () => api<UserDetail>(`admin/users/${id}`),
  });
  const changeStatus = useMutation({
    mutationFn: ({ next, reason, suspendedUntil }: { next: "SUSPENDED" | "BANNED" | "ACTIVE"; reason: string; suspendedUntil?: string }) =>
      api(`admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: next,
          reason,
          ...(next === "SUSPENDED" && suspendedUntil ? { suspendedUntil: new Date(suspendedUntil).toISOString() } : {}),
        }),
      }),
    onSuccess: async () => { notify("success", "The account status was updated."); setPendingStatus(null); await queryClient.invalidateQueries({ queryKey: ["user", id] }); },
    onError: (error) => notify("error", error.message),
  });
  const deleteUser = useMutation({
    mutationFn: () => api<{ deleted: boolean }>(`admin/users/${id}`, { method: "DELETE" }),
    onSuccess: async () => { notify("success", "The account and its associated data were permanently deleted."); await queryClient.invalidateQueries({ queryKey: ["users"] }); router.replace("/users"); },
    onError: (error) => notify("error", error.message),
  });
  const session = useQuery({ queryKey: ["session"], queryFn: () => api<SessionUser>("auth/me") });
  const sessions = useQuery({ queryKey: ["user-sessions", id], queryFn: () => api<{ id: string; deviceInfo?: string; createdAt: string; expiresAt: string }[]>(`admin/users/${id}/sessions`), enabled: session.data?.role === "SUPER_ADMIN" && session.data.id !== id });
  const changeRole = useMutation({ mutationFn: (role: string) => api(`admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }), onSuccess: async () => { notify("success", "User role updated successfully."); await queryClient.invalidateQueries({ queryKey: ["user", id] }); }, onError: (error) => notify("error", error.message) });
  const revokeSessions = useMutation({ mutationFn: () => api<{ revoked: number }>(`admin/users/${id}/sessions`, { method: "DELETE" }), onSuccess: async (result) => { notify("success", `${result.revoked} session(s) revoked.`); await queryClient.invalidateQueries({ queryKey: ["user-sessions", id] }); }, onError: (error) => notify("error", error.message) });
  const history = useQuery({
    queryKey: ["user-history", id],
    queryFn: () => api<{ items: { id: string; action: string; newValue?: Record<string, unknown>; createdAt: string; actor?: { email: string } }[] }>(`admin/audit-logs?resource=User&resourceId=${id}&limit=50`),
  });
  const addNote = useMutation({
    mutationFn: (content: string) =>
      api(`admin/users/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      notify("success", "Administrative note added successfully.");
      return queryClient.invalidateQueries({ queryKey: ["user", id] });
    },
    onError: (error) => notify("error", error.message),
  });
  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const content = String(new FormData(form).get("content"));
    addNote.mutate(content, { onSuccess: () => form.reset() });
  }
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState message={query.error.message} />;
  const user = query.data!;
  const tabs = [
    "Profile",
    "Soulprint",
    "AI Coach",
    "Conversations",
    "Reports",
    "Admin Notes",
    "Activity",
  ];
  return (
    <>
      <div className="heading">
        <div>
          <Link className="text-link" href="/users">
            ← Users
          </Link>
          <h1>{user.profile?.firstName ?? "Incomplete profile"}</h1>
          <p>
            {user.email} · <span className="badge">{user.accountStatus}</span>
          </p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map((name) => (
          <button
            key={name}
            className={tab === name ? "tab active" : "tab"}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "Profile" && (
        <div className="detail-grid">
          <section className="card">
            <h2>Account</h2>
            <dl>
              <dt>Role</dt>
              <dd>{session.data?.role === "SUPER_ADMIN" && session.data.id !== user.id ? <select className="select" aria-label="User role" value={user.role} disabled={changeRole.isPending} onChange={(event) => changeRole.mutate(event.target.value)}>{["USER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"].map((role) => <option key={role}>{role}</option>)}</select> : user.role}</dd>
              <dt>Email verified</dt>
              <dd>{user.emailVerified ? "Yes" : "No"}</dd>
              <dt>Created</dt>
              <dd>{new Date(user.createdAt).toLocaleString()}</dd>
              <dt>Last sign-in</dt>
              <dd>
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString()
                  : "Never"}
              </dd>
              {user.suspendedUntil && <><dt>Suspended until</dt><dd>{new Date(user.suspendedUntil).toLocaleString()}</dd></>}
              {user.moderationReason && <><dt>Moderation reason</dt><dd>{user.moderationReason}</dd></>}
            </dl>
          </section>
          <section className="card">
            <h2>Moderation</h2>
            <p className="muted">Current status: <StatusBadge value={user.accountStatus} /></p>
            {session.data?.role === "SUPER_ADMIN" || session.data?.role === "ADMIN" || session.data?.role === "MODERATOR" ? (
              session.data.id === user.id ? (
                <p className="muted">You cannot moderate your own account.</p>
              ) : (
                <div className="row-actions">
                  {user.accountStatus === "ACTIVE" && <><button className="button danger" onClick={() => setPendingStatus({ next: "SUSPENDED", reason: "", suspendedUntil: "" })}>Suspend</button><button className="button danger" onClick={() => setPendingDelete(true)}>Delete</button></>}
                  {user.accountStatus === "SUSPENDED" && <><button className="button success" onClick={() => setPendingStatus({ next: "ACTIVE", reason: "", suspendedUntil: "" })}>Reactivate</button><button className="button danger" onClick={() => setPendingDelete(true)}>Delete</button></>}
                  {user.accountStatus === "BANNED" && <><button className="button success" onClick={() => setPendingStatus({ next: "ACTIVE", reason: "", suspendedUntil: "" })}>Reactivate</button><button className="button danger" onClick={() => setPendingDelete(true)}>Delete permanently</button></>}
                </div>
              )
            ) : null}
          </section>
          <section className="card">
            <h2>Profile</h2>
            {user.profile ? (
              <dl>
                <dt>Gender</dt>
                <dd>{user.profile.gender}</dd>
                <dt>Location</dt>
                <dd>
                  {user.profile.city}, {user.profile.country}
                </dd>
                <dt>Onboarding</dt>
                <dd>
                  {user.profile.onboardingCompleted ? "Complete" : "Incomplete"}
                </dd>
              </dl>
            ) : (
              <p className="muted">No profile has been created.</p>
            )}
          </section>
        </div>
      )}
      {tab === "Soulprint" && (
        <section className="card">
          <h2>Shareable Soulprint data</h2>
          <p className="muted">
            Private, guidance-only and highly sensitive entries are excluded by
            the API.
          </p>
          <p>
            <strong>{user.soulprint?.completenessScore ?? 0}%</strong> complete
            · {user.soulprint?.entries.length ?? 0} visible entries ·{" "}
            {user.soulprint?.versions.length ?? 0} recent versions
          </p>
          {user.soulprint?.entries.map((entry) => (
            <div className="list-row" key={entry.id}>
              <span>
                <strong>{entry.category}</strong>
                {entry.key ? ` · ${entry.key}` : ""}
                <br />
                <small className="muted">
                  Confidence {Math.round(entry.confidence * 100)}%
                </small>
              </span>
              <span>{entry.value}</span>
            </div>
          ))}
        </section>
      )}
      {tab === "AI Coach" && (
        <section className="card">
          <h2>AI Coach</h2>
          {user.coach ? (
            <div>
              <p><strong>{user.coach.name}</strong></p>
              <div className="trait-list">
                {(user.coach.traits.length
                  ? user.coach.traits
                  : user.coach.personality
                    ? [user.coach.personality]
                    : []
                ).map((trait) => (
                  <span className="badge" key={trait}>
                    {trait.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
              {!user.coach.traits.length && !user.coach.personality && (
                <p className="muted">No personality traits selected.</p>
              )}
            </div>
          ) : (
            <p className="muted">No coach configured.</p>
          )}
        </section>
      )}
      {tab === "Conversations" && (
        <div className="grid">
          <div className="card metric">
            <span className="muted">AI coach conversations</span>
            <strong>{user._count.guidanceConversations}</strong>
          </div>
          <div className="card metric">
            <span className="muted">Member conversations</span>
            <strong>{user._count.conversations}</strong>
          </div>
          <div className="card metric">
            <span className="muted">Messages sent</span>
            <strong>{user._count.messages}</strong>
          </div>
        </div>
      )}
      {tab === "Reports" && (
        <section className="card">
          <h2>Reports received</h2>
          {user.reportsReceived.length ? (
            user.reportsReceived.map((report) => (
              <div className="list-row" key={report.id}>
                <span>
                  <strong>{report.reason}</strong>
                  <br />
                  <small className="muted">
                    {new Date(report.createdAt).toLocaleString()}
                  </small>
                </span>
                <span className="badge">
                  {report.priority} · {report.status}
                </span>
              </div>
            ))
          ) : (
            <p className="muted">No reports received.</p>
          )}
        </section>
      )}
      {tab === "Admin Notes" && (
        <section className="card">
          <h2>Administrative notes</h2>
          <form className="toolbar" onSubmit={submitNote}>
            <textarea
              className="input grow"
              name="content"
              minLength={2}
              maxLength={2000}
              placeholder="Add an internal note"
              required
            />
            <button className="button primary" disabled={addNote.isPending}>
              Add note
            </button>
          </form>
          {user.adminNotesReceived.map((note) => (
            <div className="list-row" key={note.id}>
              <span>{note.content}</span>
              <small className="muted">
                {note.author.email} ·{" "}
                {new Date(note.createdAt).toLocaleString()}
              </small>
            </div>
          ))}
        </section>
      )}
      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus?.next === "BANNED" ? "Delete account?" : pendingStatus?.next === "ACTIVE" ? "Restore account?" : "Suspend account?"}
        description={pendingStatus?.next === "BANNED" ? "This permanently removes the account from Soulmeet." : pendingStatus?.next === "ACTIVE" ? "This user will regain access to Soulmeet." : "This user will immediately lose access to Soulmeet."}
        confirmLabel={pendingStatus?.next === "BANNED" ? "Delete account" : pendingStatus?.next === "ACTIVE" ? "Restore account" : "Suspend account"}
        pending={changeStatus.isPending}
        tone={pendingStatus?.next === "ACTIVE" ? "success" : "danger"}
        error={changeStatus.error?.message}
        onCancel={() => setPendingStatus(null)}
        onConfirm={() => {
          if (!pendingStatus) return;
          if (!pendingStatus.reason.trim()) return notify("error", "A moderation reason is required.");
          changeStatus.mutate({ next: pendingStatus.next, reason: pendingStatus.reason.trim(), suspendedUntil: pendingStatus.suspendedUntil });
        }}
      >
        {pendingStatus && <div className="modal-form">
          <label className="field"><span>Moderation reason</span><textarea className="input" minLength={3} maxLength={500} required value={pendingStatus.reason} onChange={(event) => setPendingStatus((current) => current ? { ...current, reason: event.target.value } : current)} placeholder="Explain why this action is required" /></label>
          {pendingStatus.next === "SUSPENDED" && <label className="field"><span>Suspended until (optional)</span><input className="input" type="datetime-local" value={pendingStatus.suspendedUntil} onChange={(event) => setPendingStatus((current) => current ? { ...current, suspendedUntil: event.target.value } : current)} /></label>}
        </div>}
      </ConfirmDialog>
      <ConfirmDialog
        open={pendingDelete}
        title="Permanently delete account?"
        description="This permanently deletes the account and its associated data. This action cannot be undone."
        confirmLabel="Delete account"
        pendingLabel="Deleting…"
        pending={deleteUser.isPending}
        tone="danger"
        error={deleteUser.error?.message}
        onCancel={() => setPendingDelete(false)}
        onConfirm={() => deleteUser.mutate()}
      />
      {tab === "Activity" && (
        <section className="card">
          <h2>Administrative activity</h2>
          {session.data?.role === "SUPER_ADMIN" && session.data.id !== user.id && <div className="session-management"><div><strong>Active sessions</strong><p className="muted">{sessions.data?.length ?? 0} active session(s) for this account.</p></div><button className="button danger" disabled={!sessions.data?.length || revokeSessions.isPending} onClick={() => revokeSessions.mutate()}>Revoke all sessions</button></div>}
          {history.isLoading ? <Loading /> : history.error ? <ErrorState message={history.error.message} /> : !history.data?.items.length ? <p className="muted">No administrative changes recorded.</p> : history.data.items.map((event) => <div className="list-row" key={event.id}><span><strong>{event.action.replaceAll("_", " ")}</strong><br /><small className="muted">{event.actor?.email ?? "System"}</small></span><span><small className="muted">{new Date(event.createdAt).toLocaleString()}</small>{event.newValue && <><br /><code>{JSON.stringify(event.newValue)}</code></>}</span></div>)}
        </section>
      )}
    </>
  );
}
