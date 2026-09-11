"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { can } from "@/lib/permissions";
import { invalidateAdmin } from "@/lib/invalidate";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { Pagination, StatusBadge } from "@/components/ui";
import { Empty, ErrorState, Loading } from "@/components/page-state";
import { api } from "@/lib/api";
import type { Moderator, Page, SessionUser } from "@/lib/types";

type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
type Report = { id: string; reason: string; description?: string; resolution?: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; status: ReportStatus; createdAt: string; reporter: { email: string }; reportedUser: { email: string }; assignedModerator?: { id: string; email: string } | null };
type PendingUpdate = { report: Report; next: ReportStatus; resolution: string };
const actionCopy: Record<ReportStatus, { title: string; label: string; description: string }> = {
  OPEN: { title: "Reopen report?", label: "Reopen", description: "This report will return to the moderation queue." },
  IN_REVIEW: { title: "Review report?", label: "Start review", description: "This report will be marked as under review." },
  RESOLVED: { title: "Resolve report?", label: "Resolve report", description: "This moderation case will be marked as resolved." },
  DISMISSED: { title: "Dismiss report?", label: "Dismiss report", description: "This report will be closed without further action." },
};

export default function ReportsPage() { return <Suspense fallback={<Loading />}><ReportsFromUrl /></Suspense>; }
function ReportsFromUrl() { const params = useSearchParams(); const queue = params.get("queue") ?? ""; const report = params.get("report"); return <>{report && <div className="toolbar"><Link className="button" href={`/reports/${encodeURIComponent(report)}`}>Open selected report</Link><Link className="button" href="/reports">All cases</Link></div>}<ReportsPageContent key={`${queue}:${report}`} initialQueue={queue} reportId={report ?? undefined} /></>; }
function ReportsPageContent({ initialQueue, reportId }: { initialQueue: string; reportId?: string }) {
  const [queue, setQueue] = useState(['pending', 'urgent', 'unassigned', 'old'].includes(initialQueue) ? initialQueue : '');
  const [sort, setSort] = useState('priority');
  const [statusFilter, setStatusFilter] = useState("");
  const [priority, setPriority] = useState("");
  const [mine, setMine] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
  const [page, setPage] = useState(1);
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ["session"], queryFn: () => api<SessionUser>("auth/me") });
  const moderators = useQuery({ queryKey: ["moderators"], queryFn: () => api<Moderator[]>("admin/moderators"), staleTime: 60_000 });
  const query = new URLSearchParams({ page: String(page), limit: "20", sort, ...(reportId && { reportId }), ...(queue && { queue }), ...(statusFilter && { status: statusFilter }), ...(priority && { priority }), ...(mine && session.data?.id ? { assignedModeratorId: session.data.id } : {}) });
  const reports = useQuery({ queryKey: ["reports", reportId, statusFilter, priority, mine, session.data?.id, page, queue, sort], queryFn: ({ signal }) => api<Page<Report>>(`admin/reports?${query}`, { signal }) });
  const update = useMutation({
    mutationFn: ({ id, next, resolution }: { id: string; next: ReportStatus; resolution?: string }) => api(`admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status: next, ...(resolution ? { resolution } : {}) }) }),
    onSuccess: async () => { await invalidateAdmin(queryClient); notify("success", "The report was updated successfully."); setPendingUpdate(null); },
    onError: (error) => notify("error", error.message),
  });
  const assign = useMutation({
    mutationFn: ({ id, moderatorId }: { id: string; moderatorId: string | null }) => api(`admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ assignedModeratorId: moderatorId }) }),
    onSuccess: async () => { await invalidateAdmin(queryClient); notify("success", "The report was assigned."); },
    onError: (error) => notify("error", error.message),
  });
  const requestUpdate = (report: Report, next: ReportStatus) => { update.reset(); setPendingUpdate({ report, next, resolution: "" }); };
  const copy = pendingUpdate ? actionCopy[pendingUpdate.next] : actionCopy.IN_REVIEW;

  return <>
    <div className="heading"><div><h1>Reports</h1><p>Prioritized moderation cases and assignments.</p></div></div>
    <div className="toolbar filters">
      <select className="select" aria-label="Queue" value={queue} onChange={e => { setQueue(e.target.value); setStatusFilter(''); setPriority(''); setMine(false); setPage(1); }}><option value="">All cases</option><option value="pending">Pending</option><option value="urgent">Urgent pending</option><option value="unassigned">Unassigned pending</option><option value="old">Pending over 48 hours</option></select>
      <select className="select" aria-label="Sort cases" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="priority">Priority, then oldest</option><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select>
      <select className="select" aria-label="Status" value={statusFilter} onChange={(event) => { setQueue(''); setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option>{Object.keys(actionCopy).map((value) => <option key={value}>{value}</option>)}</select>
      <select className="select" aria-label="Priority" value={priority} onChange={(event) => { setQueue(''); setPriority(event.target.value); setPage(1); }}><option value="">All priorities</option>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</select>
      <label className="checkbox-field"><input type="checkbox" checked={mine} onChange={(event) => { setQueue(''); setMine(event.target.checked); setPage(1); }} /> Assigned to me</label>
    </div>
    {reports.isLoading ? <Loading /> : reports.error ? <ErrorState message={reports.error.message} /> : !reports.data?.items.length ? <Empty label="No reports match these filters" /> : <><div className="tablewrap"><table><thead><tr><th>Reporter</th><th>Reported user</th><th>Reason</th><th>Priority</th><th>Status</th><th>Moderator</th><th>Created</th><th>Actions</th></tr></thead><tbody>
      {reports.data.items.map((report) => <tr key={report.id}><td>{report.reporter.email}</td><td>{report.reportedUser.email}</td><td><Link className="text-link" href={`/reports/${report.id}`}>{report.reason}</Link></td><td><StatusBadge value={report.priority} /></td><td><StatusBadge value={report.status} /></td><td>
        <select className="select" aria-label="Assign moderator" value={report.assignedModerator?.id ?? ""} disabled={assign.isPending || !can(session.data?.role, "moderate")} onChange={(event) => assign.mutate({ id: report.id, moderatorId: event.target.value || null })}>
          <option value="">Unassigned</option>
          {moderators.data?.map((moderator) => <option key={moderator.id} value={moderator.id}>{moderator.email}</option>)}
        </select>
      </td><td>{new Date(report.createdAt).toLocaleString()}<br /><small className="muted">{Math.max(0, Math.floor((reports.dataUpdatedAt - new Date(report.createdAt).getTime()) / 3600000))} hours old</small></td><td><div className="row-actions">
        {(["RESOLVED", "DISMISSED"] as ReportStatus[]).includes(report.status) && <button className="button" disabled={update.isPending || !can(session.data?.role, "moderate")} onClick={() => requestUpdate(report, "OPEN")}>Reopen</button>}
        {report.status === "OPEN" && <button className="button" disabled={update.isPending || !can(session.data?.role, "moderate")} onClick={() => requestUpdate(report, "IN_REVIEW")}>Review</button>}
        {!(["RESOLVED", "DISMISSED"] as ReportStatus[]).includes(report.status) && <><button className="button primary" disabled={update.isPending || !can(session.data?.role, "moderate")} onClick={() => requestUpdate(report, "RESOLVED")}>Resolve</button><button className="button" disabled={update.isPending || !can(session.data?.role, "moderate")} onClick={() => requestUpdate(report, "DISMISSED")}>Dismiss</button></>}
      </div></td></tr>)}
    </tbody></table></div><Pagination data={reports.data} onPageChange={setPage} /></>}
    <ConfirmDialog open={Boolean(pendingUpdate)} title={copy.title} description={copy.description} confirmLabel={copy.label} pending={update.isPending} tone={pendingUpdate?.next === "DISMISSED" ? "danger" : "primary"} error={update.error?.message} onCancel={() => setPendingUpdate(null)} onConfirm={() => { if (!pendingUpdate) return; if (["RESOLVED", "DISMISSED"].includes(pendingUpdate.next) && pendingUpdate.resolution.trim().length < 3) return notify("error", "A resolution note is required."); update.mutate({ id: pendingUpdate.report.id, next: pendingUpdate.next, resolution: pendingUpdate.resolution.trim() }); }}>
      {pendingUpdate && <div className="modal-form"><div className="modal-user"><strong>{pendingUpdate.report.reason}</strong><span className="muted">Reported user: {pendingUpdate.report.reportedUser.email}</span>{pendingUpdate.report.description && <span>{pendingUpdate.report.description}</span>}</div>{["RESOLVED", "DISMISSED"].includes(pendingUpdate.next) && <label className="field"><span>Resolution note</span><textarea className="input" minLength={3} maxLength={2000} value={pendingUpdate.resolution} onChange={(event) => setPendingUpdate((current) => current ? { ...current, resolution: event.target.value } : current)} placeholder="Document the moderation decision" required /></label>}</div>}
    </ConfirmDialog>
  </>;
}
