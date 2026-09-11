"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Overview } from "@/lib/types";
import { Insights, changeLabel, rate } from "@/lib/insights";
import { ErrorState, Loading } from "@/components/page-state";
import { StatusBadge } from "@/components/ui";

export default function OverviewPage() {
  const [days, setDays] = useState(7);
  const q = useQuery({
    queryKey: ["overview"],
    queryFn: ({ signal }) => api<Overview>("admin/overview", { signal }),
    refetchInterval: 60_000,
  });
  const insights = useQuery({
    queryKey: ["insights", days, ""],
    queryFn: ({ signal }) =>
      api<Insights>(`admin/insights?days=${days}`, { signal }),
    refetchInterval: 60_000,
  });
  if (q.isLoading || insights.isLoading) return <Loading />;
  if (q.error || insights.error)
    return <ErrorState message={(q.error || insights.error)!.message} />;
  const data = q.data!;
  const d = insights.data!;
  const cards = [
    {
      label: "New members",
      value: d.current.registered,
      hint: changeLabel(d.current.registered, d.previous.registered),
      href: "/users",
    },
    {
      label: "Profile activation",
      value: rate(d.current.completed, d.current.registered),
      hint: `${d.current.completed} of ${d.current.registered} new members`,
      href: "/analytics",
    },
    {
      label: "Members reaching first conversation",
      value: d.current.conversations,
      hint: changeLabel(d.current.conversations, d.previous.conversations),
      href: "/conversations",
    },
    {
      label: "Pending reports",
      value: data.metrics.pendingReports ?? 0,
      hint: "Current moderation backlog",
      href: "/reports?queue=pending",
    },
  ];
  return (
    <>
      <div className="heading">
        <div>
          <h1>Overview</h1>
          <p>Community activity and cases that need attention.</p>
          <small className="muted">
            Updated {new Date(d.generatedAt).toLocaleString()} · refreshes every
            minute
          </small>
        </div>
        <label className="field">
          <span>Registration cohort (UTC)</span>
          <select
            className="select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[1, 7, 30, 90].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "Today" : `${n} days`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="grid">
        {cards.map((c) => (
          <Link className="card metric" key={c.label} href={c.href}>
            <span className="muted">{c.label}</span>
            <strong>{c.value}</strong>
            <small className="muted">{c.hint}</small>
          </Link>
        ))}
      </section>
      <p className="muted">
        Activation uses current profile milestones. First conversation includes
        completed profiles with a Soulprint and a member message; messages are
        observed up to the end of each comparison period.
      </p>
      <section className="card section-gap">
        <div className="heading">
          <div>
            <h2>Needs attention</h2>
            <p>Open and in-review cases across the community.</p>
          </div>
          <Link className="button" href="/reports?queue=pending">
            Moderation queue
          </Link>
        </div>
        <div className="attention-grid">
          {(
            [
              ["Urgent", d.moderation.urgent, "urgent"],
              ["Unassigned", d.moderation.unassigned, "unassigned"],
              ["Older than 48 hours", d.moderation.old, "old"],
            ] as const
          ).map(([label, count, queue]) => (
            <Link
              className="card metric"
              href={`/reports?queue=${queue}`}
              key={queue}
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </Link>
          ))}
        </div>
        {d.moderation.queue.length ? (
          d.moderation.queue.map((r) => (
            <Link className="list-row" href={`/reports/${r.id}`} key={r.id}>
              <span>{r.reason}</span>
              <span>
                <StatusBadge value={r.priority} /> ·{" "}
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))
        ) : (
          <p className="muted">No pending cases.</p>
        )}
      </section>
      <section className="section-gap">
        <h2>Explore</h2>
        <div className="toolbar filters">
          {[
            ["Users", "/users"],
            ["Soulprints", "/soulprints"],
            ["Matches", "/matches"],
            ["Conversations", "/conversations"],
            ["AI usage", "/ai-usage"],
          ].map(([label, href]) => (
            <Link className="button" href={href} key={href}>
              {label}
            </Link>
          ))}
        </div>
      </section>
      <h2>Recent members</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Location</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.recentUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <Link className="text-link" href={`/users/${user.id}`}>
                    {user.profile?.firstName ?? "Profile pending"}
                  </Link>
                  <br />
                  <small className="muted">{user.email}</small>
                </td>
                <td>
                  {[user.profile?.city, user.profile?.country]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td>
                  <StatusBadge value={user.accountStatus} />
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.recentUsers.length && <p className="state">No members yet.</p>}
      </div>
    </>
  );
}
