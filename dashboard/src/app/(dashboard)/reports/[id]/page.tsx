"use client";
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorState, Loading } from "@/components/page-state";
import { StatusBadge } from "@/components/ui";

type ReportDetail = {
  id: string;
  reason: string;
  description: string | null;
  resolution: string | null;
  priority: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; email: string };
  reportedUser: { id: string; email: string };
  assignedModerator: { email: string } | null;
  history: {
    id: string;
    createdAt: string;
    actor: { email: string } | null;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
  }[];
};
const labels: Record<string, string> = {
  status: "Status",
  priority: "Priority",
  assignedModeratorId: "Moderator ID",
  resolution: "Resolution note",
};
export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const q = useQuery({
    queryKey: ["report", id],
    queryFn: ({ signal }) =>
      api<ReportDetail>(`admin/reports/${id}`, { signal }),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} />;
  const r = q.data!;
  return (
    <>
      <div className="heading">
        <div>
          <h1>Report details</h1>
          <p>{r.reason}</p>
        </div>
        <Link className="button" href={`/reports?report=${id}`}>
          Manage this case
        </Link>
      </div>
      <section className="card">
        <div className="toolbar">
          <StatusBadge value={r.status} />
          <StatusBadge value={r.priority} />
        </div>
        <dl>
          <dt>Reporter</dt>
          <dd>
            <Link className="text-link" href={`/users/${r.reporter.id}`}>
              {r.reporter.email}
            </Link>
          </dd>
          <dt>Reported member</dt>
          <dd>
            <Link className="text-link" href={`/users/${r.reportedUser.id}`}>
              {r.reportedUser.email}
            </Link>
          </dd>
          <dt>Moderator</dt>
          <dd>{r.assignedModerator?.email ?? "Unassigned"}</dd>
          <dt>Created</dt>
          <dd>{new Date(r.createdAt).toLocaleString()}</dd>
          <dt>Resolved</dt>
          <dd>
            {r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : "Pending"}
          </dd>
        </dl>
        <h2>Description</h2>
        <p className="detail-copy">
          {r.description || "No additional description."}
        </p>
        <h2>Resolution</h2>
        <p className="detail-copy">
          {r.resolution || "No resolution recorded."}
        </p>
      </section>
      <section className="card section-gap">
        <h2>Decision history</h2>
        <p className="muted">
          Most recent 100 changes. Older records may contain only status and
          priority.
        </p>
        {r.history.length ? (
          r.history.map((event) => (
            <article className="section-gap" key={event.id}>
              <strong>{event.actor?.email ?? "Former administrator"}</strong>
              <p className="muted">
                {new Date(event.createdAt).toLocaleString()}
              </p>
              {Object.entries(event.newValue ?? {})
                .filter(
                  ([key, value]) =>
                    JSON.stringify(value) !==
                    JSON.stringify(event.oldValue?.[key]),
                )
                .map(([key, value]) => (
                  <div className="list-row detail-copy" key={key}>
                    <span>{labels[key] ?? key}</span>
                    <span>
                      {String(event.oldValue?.[key] ?? "—")} →{" "}
                      {String(value ?? "—")}
                    </span>
                  </div>
                ))}
            </article>
          ))
        ) : (
          <p className="muted">No decisions recorded yet.</p>
        )}
      </section>
    </>
  );
}
