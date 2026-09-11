'use client';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AiBudget } from '@/components/ai-budget';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ErrorState, Loading } from '@/components/page-state';

type UsageRow = {
  _count: number;
  _sum: { inputTokens: number | null; outputTokens: number | null; estimatedCost: string | null };
  _avg: { latencyMs: number | null };
};

type Usage = {
  daily: { date: string; cost: number; requests: number; errors: number }[];
  errors: { errorCode: string | null; _count: number }[];
  unpriced: number; monthCost: string | null; monthlyBudget: number | null;
  _count: number;
  _sum: { inputTokens: number | null; outputTokens: number | null; cachedTokens: number | null; estimatedCost: string | null };
  _avg: { latencyMs: number | null };
  byFeature: (UsageRow & { feature: string })[];
  byModel: (UsageRow & { provider: string; model: string })[];
};

const formatCost = (value: string | null) => value === null
  ? '—'
  : new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6,
    }).format(Number(value));

export default function Page() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ['ai-usage', days], queryFn: ({ signal }) => api<Usage>(`admin/ai-usage?days=${days}`, { signal }) });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState message={q.error.message} />;
  const d = q.data!;
  const metrics: [string, string][] = [
    ['Requests', String(d._count)],
    ['Failed requests', String(d.errors.reduce((sum, row) => sum + row._count, 0))],
    ['Input tokens', (d._sum.inputTokens ?? 0).toLocaleString()],
    ['Output tokens', (d._sum.outputTokens ?? 0).toLocaleString()],
    ['Cached tokens', (d._sum.cachedTokens ?? 0).toLocaleString()],
    ['Average latency', d._avg.latencyMs ? `${Math.round(d._avg.latencyMs)} ms` : '—'],
    ['Estimated cost', formatCost(d._sum.estimatedCost)],
  ];
  return <>
    <div className="heading"><div><h1>AI Usage</h1><p>Requests, tokens and estimated costs for the selected UTC period.</p></div><select className="select" aria-label="Usage period" value={days} onChange={e => setDays(Number(e.target.value))}>{[1,7,30,90].map(n => <option key={n} value={n}>{n === 1 ? "Today" : `${n} days`}</option>)}</select></div>
    <div className="grid">{metrics.map(([label, value]) => <div className="card metric" key={label}><span className="muted">{label}</span><strong>{value}</strong></div>)}</div>
    <AiBudget key={d.monthlyBudget ?? 'unset'} budget={d.monthlyBudget} spent={Number(d.monthCost ?? 0)} />
    <section className="card section-gap"><h2>Daily estimated cost (USD)</h2><p className="muted">{d.unpriced} requests have no price estimate. Costs may use estimated token counts.</p><ResponsiveContainer width="100%" height={280}><AreaChart data={d.daily}><CartesianGrid strokeDasharray="3 3" opacity={.2}/><XAxis dataKey="date" tickFormatter={v => v.slice(5)} /><YAxis /><Tooltip /><Area dataKey="cost" name="USD" stroke="#8d70e5" fill="#8d70e5" fillOpacity={.2} /></AreaChart></ResponsiveContainer></section>
    <section className="card section-gap"><h2>Daily requests and failures</h2><ResponsiveContainer width="100%" height={240}><AreaChart data={d.daily}><CartesianGrid strokeDasharray="3 3" opacity={.2}/><XAxis dataKey="date" tickFormatter={v => v.slice(5)} /><YAxis allowDecimals={false}/><Tooltip /><Area dataKey="requests" stroke="#8d70e5" fill="#8d70e5" fillOpacity={.15}/><Area dataKey="errors" stroke="#e26698" fill="#e26698" fillOpacity={.2}/></AreaChart></ResponsiveContainer>{d.errors.length ? d.errors.map(row => <div className="list-row" key={row.errorCode ?? 'unknown'}><span>{row.errorCode ?? 'Unknown error'}</span><strong>{row._count}</strong></div>) : <p className="muted">No failures recorded in this period.</p>}</section>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>By feature</h2>
      {d.byFeature.length ? <div className="tablewrap"><table><thead><tr><th>Feature</th><th>Requests</th><th>Input tokens</th><th>Output tokens</th><th>Estimated cost</th><th>Avg latency</th></tr></thead><tbody>{d.byFeature.map((row) => <tr key={row.feature}><td>{row.feature}</td><td>{row._count}</td><td>{(row._sum.inputTokens ?? 0).toLocaleString()}</td><td>{(row._sum.outputTokens ?? 0).toLocaleString()}</td><td>{formatCost(row._sum.estimatedCost)}</td><td>{row._avg.latencyMs ? `${Math.round(row._avg.latencyMs)} ms` : '—'}</td></tr>)}</tbody></table></div> : <p className="muted">No calls recorded yet. Every completed LLM call is written to LlmUsage.</p>}
    </section>
    <section className="card" style={{ marginTop: 18 }}>
      <h2>By provider and model</h2>
      {d.byModel.length ? <div className="tablewrap"><table><thead><tr><th>Provider</th><th>Model</th><th>Requests</th><th>Input tokens</th><th>Output tokens</th><th>Estimated cost</th><th>Avg latency</th></tr></thead><tbody>{d.byModel.map((row) => <tr key={`${row.provider}-${row.model}`}><td>{row.provider}</td><td>{row.model}</td><td>{row._count}</td><td>{(row._sum.inputTokens ?? 0).toLocaleString()}</td><td>{(row._sum.outputTokens ?? 0).toLocaleString()}</td><td>{formatCost(row._sum.estimatedCost)}</td><td>{row._avg.latencyMs ? `${Math.round(row._avg.latencyMs)} ms` : '—'}</td></tr>)}</tbody></table></div> : <p className="muted">No calls recorded yet.</p>}
    </section>
  </>;
}
