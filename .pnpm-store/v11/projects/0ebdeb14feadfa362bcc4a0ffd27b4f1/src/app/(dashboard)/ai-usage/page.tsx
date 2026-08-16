'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorState, Loading } from '@/components/page-state';

type Usage = {
  _count: number;
  _sum: { inputTokens: number | null; outputTokens: number | null; cachedTokens: number | null; estimatedCost: string | null };
  _avg: { latencyMs: number | null };
  byFeature: { feature: string; _count: number; _sum: { inputTokens: number | null; outputTokens: number | null; estimatedCost: string | null }; _avg: { latencyMs: number | null } }[];
  byModel: { provider: string; model: string; _count: number; _sum: { inputTokens: number | null; outputTokens: number | null; estimatedCost: string | null }; _avg: { latencyMs: number | null } }[];
};

export default function Page() {
  const q = useQuery({ queryKey: ['ai-usage'], queryFn: () => api<Usage>('admin/ai-usage') });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} />;
  const d = q.data!;
  const metrics: [string, string][] = [
    ['Requests', String(d._count)],
    ['Input tokens', (d._sum.inputTokens ?? 0).toLocaleString()],
    ['Output tokens', (d._sum.outputTokens ?? 0).toLocaleString()],
    ['Cached tokens', (d._sum.cachedTokens ?? 0).toLocaleString()],
    ['Average latency', d._avg.latencyMs ? `${Math.round(d._avg.latencyMs)} ms` : '—'],
    ['Estimated cost', d._sum.estimatedCost ? `$${d._sum.estimatedCost}` : '—'],
  ];
  const cost = (value: string | null) => (value ? `$${value}` : '—');
  return <>
    <div className="heading"><div><h1>AI Usage</h1><p>Provider-neutral request, token and cost telemetry.</p></div></div>
    <div className="grid">{metrics.map(([label, value]) => <div className="card metric" key={label}><span className="muted">{label}</span><strong>{value}</strong></div>)}</div>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>By feature</h2>
      {d.byFeature.length ? <div className="tablewrap"><table><thead><tr><th>Feature</th><th>Requests</th><th>Input tokens</th><th>Output tokens</th><th>Estimated cost</th><th>Avg latency</th></tr></thead><tbody>{d.byFeature.map((row) => <tr key={row.feature}><td>{row.feature}</td><td>{row._count}</td><td>{(row._sum.inputTokens ?? 0).toLocaleString()}</td><td>{(row._sum.outputTokens ?? 0).toLocaleString()}</td><td>{cost(row._sum.estimatedCost)}</td><td>{row._avg.latencyMs ? `${Math.round(row._avg.latencyMs)} ms` : '—'}</td></tr>)}</tbody></table></div> : <p className="muted">No calls recorded yet. Every completed LLM call is written to LlmUsage.</p>}
    </section>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>By provider and model</h2>
      {d.byModel.length ? <div className="tablewrap"><table><thead><tr><th>Provider</th><th>Model</th><th>Requests</th><th>Input tokens</th><th>Output tokens</th><th>Estimated cost</th><th>Avg latency</th></tr></thead><tbody>{d.byModel.map((row) => <tr key={`${row.provider}-${row.model}`}><td>{row.provider}</td><td>{row.model}</td><td>{row._count}</td><td>{(row._sum.inputTokens ?? 0).toLocaleString()}</td><td>{(row._sum.outputTokens ?? 0).toLocaleString()}</td><td>{cost(row._sum.estimatedCost)}</td><td>{row._avg.latencyMs ? `${Math.round(row._avg.latencyMs)} ms` : '—'}</td></tr>)}</tbody></table></div> : <p className="muted">No calls recorded yet.</p>}
    </section>
  </>;
}
