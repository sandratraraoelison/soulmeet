"use client";

import { ReactNode, useMemo, useState } from "react";
import type { AdminRole, Page } from "@/lib/types";
import { can, type Permission } from "@/lib/permissions";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="heading"><div><h1>{title}</h1><p>{description}</p></div>{actions}</div>;
}

export function StatusBadge({ value }: { value: string }) {
  const tone = /ACTIVE|RESOLVED|SUCCEEDED|COMPLETE/i.test(value) ? "positive" : /SUSPENDED|IN_REVIEW|PENDING|MEDIUM/i.test(value) ? "warning" : /BANNED|DISMISSED|FAILED|URGENT/i.test(value) ? "negative" : "neutral";
  return <span className={`badge ${tone}`}>{value.replaceAll("_", " ")}</span>;
}

export function Pagination({ data, onPageChange }: { data: Pick<Page<unknown>, "page" | "limit" | "total">; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  return <div className="pagination"><span className="muted">{data.total} items · Page {data.page} of {totalPages}</span><div className="row-actions"><button className="button" disabled={data.page <= 1} onClick={() => onPageChange(data.page - 1)}>Previous</button><button className="button" disabled={data.page >= totalPages} onClick={() => onPageChange(data.page + 1)}>Next</button></div></div>;
}

export function PermissionGate({ role, permission, children, fallback = null }: { role?: AdminRole; permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  return can(role, permission) ? children : fallback;
}

export function DataTable<T>({ rows, columns, rowKey }: { rows: T[]; columns: { key: string; label: string; render: (row: T) => ReactNode; sortValue?: (row: T) => string | number }[]; rowKey: (row: T, index: number) => string }) {
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sort?.key);
    if (!sort || !column?.sortValue) return rows;
    return [...rows].sort((left, right) => String(column.sortValue?.(left) ?? "").localeCompare(String(column.sortValue?.(right) ?? ""), undefined, { numeric: true }) * (sort.direction === "asc" ? 1 : -1));
  }, [rows, columns, sort]);
  return <div className="tablewrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.sortValue ? <button className="sort-button" onClick={() => setSort((current) => ({ key: column.key, direction: current?.key === column.key && current.direction === "asc" ? "desc" : "asc" }))}>{column.label}{sort?.key === column.key ? sort.direction === "asc" ? " ↑" : " ↓" : ""}</button> : column.label}</th>)}</tr></thead><tbody>{sortedRows.map((row, index) => <tr key={rowKey(row, index)}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}
