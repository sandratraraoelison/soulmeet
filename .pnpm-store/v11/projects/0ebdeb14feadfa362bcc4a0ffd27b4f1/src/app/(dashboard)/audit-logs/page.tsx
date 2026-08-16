"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, PageHeader, Pagination, StatusBadge } from "@/components/ui";
import { Empty, ErrorState, Loading } from "@/components/page-state";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks";
import type { Page, SessionUser } from "@/lib/types";
import { AuditChangeDialog } from "@/components/audit-change-dialog";
import Link from "next/link";
import { useToast } from "@/components/toast";
type AuditLog = { id: string; action: string; resource: string; resourceId?: string; oldValue?: unknown; newValue?: unknown; ipAddress?: string; success: boolean; createdAt: string; actor?: { email: string; role: string } };
export default function AuditLogsPage() {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(""); const [resource, setResource] = useState(""); const [action, setAction] = useState(""); const debounced = useDebouncedValue(search);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const { notify } = useToast();
  const session = useQuery({ queryKey: ["session"], queryFn: () => api<SessionUser>("auth/me") });
  const params = new URLSearchParams({ page: String(page), limit: "20", ...(debounced && { search: debounced }), ...(resource && { resource }), ...(action && { action }), ...(from && { from: new Date(from).toISOString() }), ...(to && { to: new Date(`${to}T23:59:59`).toISOString() }) });
  const logs = useQuery({ queryKey: ["audit-logs", page, debounced, resource, action, from, to], queryFn: ({ signal }) => api<Page<AuditLog>>(`admin/audit-logs?${params}`, { signal }) });
  const change = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setter(event.target.value); setPage(1); };
  const downloadCsv = (items: AuditLog[], name: string) => { const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`; const csv = [["Administrator", "Action", "Resource", "Resource ID", "Success", "IP", "Date"], ...items.map((row) => [row.actor?.email, row.action, row.resource, row.resourceId, row.success, row.ipAddress, row.createdAt])].map((row) => row.map(quote).join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = name; link.click(); URL.revokeObjectURL(link.href); notify("success", "Audit log export downloaded."); };
  const exportAll = async () => { try { const exportParams = new URLSearchParams(params); exportParams.delete("page"); exportParams.delete("limit"); const data = await api<{ items: AuditLog[]; truncated: boolean }>(`admin/audit-logs/export?${exportParams}`); downloadCsv(data.items, `complete-audit-${new Date().toISOString().slice(0, 10)}.csv`); if (data.truncated) notify("error", "The export was limited to the 5,000 most recent events."); } catch (error) { notify("error", error instanceof Error ? error.message : "Export failed."); } };
  return <><PageHeader title="Audit Logs" description="Trace every sensitive administrative change with before and after values." actions={<div className="row-actions"><button className="button" disabled={!logs.data?.items.length} onClick={() => logs.data && downloadCsv(logs.data.items, `audit-page-${logs.data.page}.csv`)}>Export current page</button>{session.data?.role === "SUPER_ADMIN" && <button className="button primary" onClick={() => void exportAll()}>Export complete audit</button>}</div>} />
    <div className="toolbar filters"><input className="input grow" placeholder="Search actor, action or resource ID" value={search} onChange={change(setSearch)} /><select className="select" value={resource} onChange={change(setResource)} aria-label="Resource"><option value="">All resources</option>{["User", "Report", "AppSetting"].map((value) => <option key={value}>{value}</option>)}</select><input className="input" placeholder="Exact action" value={action} onChange={change(setAction)} /><input className="input" type="date" aria-label="From date" value={from} onChange={change(setFrom)} /><input className="input" type="date" aria-label="To date" value={to} onChange={change(setTo)} /></div>
    {logs.isLoading ? <Loading /> : logs.error ? <ErrorState message={logs.error.message} /> : !logs.data?.items.length ? <Empty label="No audit events match these filters" /> : <><DataTable rows={logs.data.items} rowKey={(row) => row.id} columns={[
      { key: "actor", label: "Administrator", render: (row) => <>{row.actor?.email ?? "System"}<br /><small className="muted">{row.actor?.role}</small></> },
      { key: "action", label: "Action", render: (row) => row.action.replaceAll("_", " "), sortValue: (row) => row.action },
      { key: "resource", label: "Resource", render: (row) => <>{row.resource === "User" && row.resourceId ? <Link className="text-link" href={`/users/${row.resourceId}`}>User</Link> : row.resource}<br />{row.resourceId ? <button className="copy-id" title="Copy resource ID" onClick={() => void navigator.clipboard.writeText(row.resourceId!).then(() => notify("success", "Resource ID copied."))}>{row.resourceId}</button> : <small className="muted">—</small>}</> },
      { key: "change", label: "Change", render: (row) => <button className="button" onClick={() => setSelectedLog(row)}>View details</button> },
      { key: "result", label: "Result", render: (row) => <StatusBadge value={row.success ? "SUCCEEDED" : "FAILED"} /> },
      { key: "ip", label: "IP address", render: (row) => row.ipAddress ?? "—" },
      { key: "date", label: "Date", render: (row) => new Date(row.createdAt).toLocaleString(), sortValue: (row) => row.createdAt },
    ]} /><Pagination data={logs.data} onPageChange={setPage} /></>}
    <AuditChangeDialog open={Boolean(selectedLog)} action={selectedLog?.action ?? "Change details"} before={selectedLog?.oldValue} after={selectedLog?.newValue} onClose={() => setSelectedLog(null)} />
  </>;
}
