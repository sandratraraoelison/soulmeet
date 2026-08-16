"use client";

import { ArrowRight, X } from "lucide-react";
import { StatusBadge } from "@/components/ui";

type JsonRecord = Record<string, unknown>;
type AuditChangeDialogProps = {
  open: boolean;
  action: string;
  before?: unknown;
  after?: unknown;
  onClose: () => void;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function label(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function DisplayValue({ value }: { value: unknown }) {
  if (value == null || value === "") return <span className="audit-empty">Not set</span>;
  if (typeof value === "boolean") return <StatusBadge value={value ? "YES" : "NO"} />;
  if (typeof value === "string" && /^[A-Z][A-Z_]+$/.test(value)) return <StatusBadge value={value} />;
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value)) return <>{new Date(value).toLocaleString()}</>;
  if (typeof value === "object") return <code>{JSON.stringify(value)}</code>;
  return <>{String(value)}</>;
}

export function AuditChangeDialog({ open, action, before, after, onClose }: AuditChangeDialogProps) {
  if (!open) return null;
  const previous = asRecord(before);
  const next = asRecord(after);
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])];

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="audit-dialog" role="dialog" aria-modal="true" aria-labelledby="audit-change-title">
      <header className="audit-dialog-header"><div><small className="muted">Audit change</small><h2 id="audit-change-title">{label(action)}</h2></div><button className="iconbtn" aria-label="Close details" onClick={onClose}><X size={18} /></button></header>
      {!keys.length ? <p className="state">No change details were recorded.</p> : <div className="audit-comparison">
        <div className="audit-comparison-heading"><span>Field</span><span>Before</span><span aria-hidden="true" /><span>After</span></div>
        {keys.map((key) => {
          const changed = JSON.stringify(previous[key]) !== JSON.stringify(next[key]);
          return <div className={`audit-change-row ${changed ? "changed" : ""}`} key={key}><strong>{label(key)}</strong><div><DisplayValue value={previous[key]} /></div><ArrowRight size={16} aria-hidden="true" /><div><DisplayValue value={next[key]} /></div></div>;
        })}
      </div>}
      <footer className="modal-actions"><button className="button primary" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}
