"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { Pagination, PermissionGate, StatusBadge } from "@/components/ui";
import { Empty, ErrorState, Loading } from "@/components/page-state";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks";
import type { Page, SessionUser, User } from "@/lib/types";

type PendingStatusChange = { user: User; next: User["accountStatus"]; reason: string; suspendedUntil: string };
const transition: Record<User["accountStatus"], { label: string; tone: "primary" | "success" | "danger"; confirm: string; description: string }> = {
  ACTIVE: { label: "Suspend", tone: "danger", confirm: "Suspend account", description: "This user will immediately lose access to Soulmeet." },
  SUSPENDED: { label: "Reactivate", tone: "success", confirm: "Reactivate account", description: "This user will regain access to Soulmeet." },
  BANNED: { label: "Reactivate", tone: "success", confirm: "Reactivate account", description: "This user will regain access to Soulmeet." },
};
const deleteTransition = { label: "Delete", tone: "danger" as const, confirm: "Delete account", description: "This permanently deletes the account from Soulmeet." };

export default function UsersPage() {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    role: "",
    completed: "",
  });
  const debouncedSearch = useDebouncedValue(filters.search);
  const [page, setPage] = useState(1);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<SessionUser>("auth/me"),
  });
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(filters.status && { status: filters.status }),
    ...(filters.role && { role: filters.role }),
    ...(filters.completed && { completed: filters.completed }),
  });
  const users = useQuery({
    queryKey: ["users", filters, page, debouncedSearch],
    queryFn: () => api<Page<User>>(`admin/users?${params}`),
  });
  const status = useMutation({
    mutationFn: ({ id, next, reason, suspendedUntil }: { id: string; next: User["accountStatus"]; reason: string; suspendedUntil?: string }) =>
      api(`admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: next,
          reason,
          ...(next === "SUSPENDED" && suspendedUntil ? { suspendedUntil: new Date(suspendedUntil).toISOString() } : {}),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("success", "The account status was updated successfully.");
      setPendingStatusChange(null);
    },
    onError: (error) => notify("error", error.message),
  });
  const deleteUser = useMutation({
    mutationFn: (id: string) => api<{ deleted: boolean }>(`admin/users/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("success", "The account and its associated data were permanently deleted.");
    },
    onError: (error) => notify("error", error.message),
  });
  const change = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const requestStatus = (user: User, next: User["accountStatus"]) => {
    status.reset();
    setPendingStatusChange({ user, next, reason: "", suspendedUntil: "" });
  };

  return (
    <>
      <div className="heading">
        <div>
          <h1>Users</h1>
          <p>Search, filter and moderate community accounts.</p>
        </div>
      </div>
      <div className="toolbar filters">
        <input
          className="input"
          placeholder="Search name or email"
          value={filters.search}
          onChange={(event) => change("search", event.target.value)}
        />
        <select
          className="select"
          aria-label="Account status"
          value={filters.status}
          onChange={(event) => change("status", event.target.value)}
        >
          <option value="">All statuses</option>
          {["ACTIVE", "SUSPENDED", "BANNED"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className="select"
          aria-label="Role"
          value={filters.role}
          onChange={(event) => change("role", event.target.value)}
        >
          <option value="">All roles</option>
          {["USER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <select
          className="select"
          aria-label="Profile completion"
          value={filters.completed}
          onChange={(event) => change("completed", event.target.value)}
        >
          <option value="">Any profile</option>
          <option value="true">Complete</option>
          <option value="false">Incomplete</option>
        </select>
      </div>
      {users.isLoading ? (
        <Loading />
      ) : users.error ? (
        <ErrorState message={users.error.message} />
      ) : !users.data?.items.length ? (
        <Empty label="No users match these filters" />
      ) : (
        <>
          <div className="tablewrap">
            <table>
              <caption className="sr-only">Community accounts</caption>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Location</th>
                  <th>Profile</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((user) => {
                  const t = transition[user.accountStatus];
                  const canDelete = user.accountStatus !== "BANNED";
                  return (
                  <tr key={user.id}>
                    <td>
                      <Link className="text-link" href={`/users/${user.id}`}>
                        {user.profile?.firstName ?? "Incomplete"}
                      </Link>
                      <br />
                      <small className="muted">{user.email}</small>
                    </td>
                    <td>
                      {user.profile
                        ? `${user.profile.city}, ${user.profile.country}`
                        : "—"}
                    </td>
                    <td>
                      {user.profile?.onboardingCompleted
                        ? "Complete"
                        : "Incomplete"}
                    </td>
                    <td>{user.role}</td>
                    <td>
                      <StatusBadge value={user.accountStatus} />
                    </td>
                    <td>{user.emailVerified ? "Yes" : "No"}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <Link className="button" href={`/users/${user.id}`}>
                          View
                        </Link>
                        <PermissionGate role={session.data?.role} permission="moderate">
                          <button
                            className={t.tone === "success" ? "button success" : "button danger"}
                            disabled={(status.isPending && status.variables?.id === user.id) || session.data?.id === user.id}
                            title={session.data?.id === user.id ? "You cannot moderate your own account" : undefined}
                            onClick={() => requestStatus(user, user.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                          >
                            {t.label}
                          </button>
                          {canDelete && (
                            <button
                              className="button danger"
                              disabled={(status.isPending && status.variables?.id === user.id) || session.data?.id === user.id}
                              title={session.data?.id === user.id ? "You cannot moderate your own account" : undefined}
                              onClick={() => { deleteUser.reset(); setPendingDelete(user); }}
                            >
                              {deleteTransition.label}
                            </button>
                          )}
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination data={users.data} onPageChange={setPage} />
        </>
      )}
      <ConfirmDialog
        open={Boolean(pendingStatusChange)}
        title={pendingStatusChange ? (pendingStatusChange.next === "BANNED" ? deleteTransition.confirm : transition[pendingStatusChange.next].confirm) : ""}
        description={pendingStatusChange ? (pendingStatusChange.next === "BANNED" ? deleteTransition.description : transition[pendingStatusChange.next].description) : ""}
        confirmLabel={pendingStatusChange ? (pendingStatusChange.next === "BANNED" ? deleteTransition.confirm : transition[pendingStatusChange.next].confirm) : ""}
        pending={status.isPending}
        tone={pendingStatusChange?.next === "ACTIVE" ? "success" : "danger"}
        error={status.error?.message}
        onCancel={() => setPendingStatusChange(null)}
        onConfirm={() => {
          if (pendingStatusChange?.reason.trim()) status.mutate({ id: pendingStatusChange.user.id, next: pendingStatusChange.next, reason: pendingStatusChange.reason.trim(), suspendedUntil: pendingStatusChange.suspendedUntil });
          else notify("error", "A moderation reason is required.");
        }}
      >
        {pendingStatusChange && (
          <div className="modal-form">
            <div className="modal-user">
              <strong>{pendingStatusChange.user.profile?.firstName ?? "Incomplete profile"}</strong>
              <span className="muted">{pendingStatusChange.user.email}</span>
            </div>
            <label className="field"><span>Moderation reason</span><textarea className="input" minLength={3} maxLength={500} required value={pendingStatusChange.reason} onChange={(event) => setPendingStatusChange((current) => current ? { ...current, reason: event.target.value } : current)} placeholder="Explain why this action is required" /></label>
            {pendingStatusChange.next === "SUSPENDED" && <label className="field"><span>Suspended until (optional)</span><input className="input" type="datetime-local" value={pendingStatusChange.suspendedUntil} onChange={(event) => setPendingStatusChange((current) => current ? { ...current, suspendedUntil: event.target.value } : current)} /></label>}
          </div>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Permanently delete account?"
        description="This permanently deletes the account and its associated data. This action cannot be undone."
        confirmLabel="Delete account"
        pendingLabel="Deleting…"
        pending={deleteUser.isPending}
        tone="danger"
        error={deleteUser.error?.message}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteUser.mutate(pendingDelete.id)}
      >
        {pendingDelete && <div className="modal-user"><strong>{pendingDelete.profile?.firstName ?? "Incomplete profile"}</strong><span className="muted">{pendingDelete.email}</span></div>}
      </ConfirmDialog>
    </>
  );
}
