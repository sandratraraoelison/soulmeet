"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorState, Loading } from "@/components/page-state";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
type Analytics = { rangeDays: number; metrics: { totalUsers: number; activeUsers: number; newUsers: number; previousNewUsers: number; completedProfiles: number; profileActivation: number; soulprints: number; conversations: number; coachConversations: number; reports: number; pendingReports: number; suspendedUsers: number; aiRequests: number; matches: number | null }; series: { date: string; users: number; reports: number; soulprints: number; conversations: number; guidance: number; aiRequests: number }[] };
type SeriesKey = 'users' | 'reports' | 'soulprints' | 'conversations' | 'guidance' | 'aiRequests';
const seriesOptions: { key: SeriesKey; label: string; color: string }[] = [
  { key: 'users', label: 'New users', color: '#8d70e5' },
  { key: 'reports', label: 'Reports', color: '#e26698' },
  { key: 'soulprints', label: 'Soulprints', color: '#3aa6a0' },
  { key: 'conversations', label: 'Member conversations', color: '#e0a53b' },
  { key: 'guidance', label: 'AI conversations', color: '#5b8dee' },
  { key: 'aiRequests', label: 'AI requests', color: '#8a6cd8' },
];
export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [leftSeries, setLeftSeries] = useState<SeriesKey>('users');
  const [rightSeries, setRightSeries] = useState<SeriesKey>('reports');
  const analytics = useQuery({ queryKey: ["analytics", days], queryFn: ({ signal }) => api<Analytics>(`admin/analytics?days=${days}`, { signal }) });
  if (analytics.isLoading) return <Loading />; if (analytics.error) return <ErrorState message={analytics.error.message} />;
  const data = analytics.data!; const growth = data.metrics.previousNewUsers ? Math.round((data.metrics.newUsers - data.metrics.previousNewUsers) / data.metrics.previousNewUsers * 100) : data.metrics.newUsers ? 100 : 0;
  const left = seriesOptions.find((option) => option.key === leftSeries)!;
  const right = seriesOptions.find((option) => option.key === rightSeries)!;
  const cards = [
    { label: "Total users", value: data.metrics.totalUsers, hint: "Current total" },
    { label: "Active users", value: data.metrics.activeUsers, hint: `${Math.round(data.metrics.activeUsers / Math.max(data.metrics.totalUsers, 1) * 100)}% of all users` },
    { label: days === 1 ? "New today" : `New in ${days} days`, value: data.metrics.newUsers, hint: `${growth >= 0 ? "+" : ""}${growth}% vs previous period`, trend: growth },
    { label: "Completed profiles", value: data.metrics.completedProfiles, hint: `${data.metrics.profileActivation}% activation` },
    { label: "Soulprints", value: data.metrics.soulprints, hint: "Current total" },
    { label: "AI conversations", value: data.metrics.coachConversations, hint: "Current total" },
    { label: "Persisted matches", value: data.metrics.matches ?? "Unavailable", hint: data.metrics.matches == null ? "Not persisted yet" : "Current total" },
    { label: "User conversations", value: data.metrics.conversations, hint: "Current total" },
    { label: "Reports in period", value: data.metrics.reports, hint: `${data.metrics.pendingReports} currently pending` },
    { label: "Suspended users", value: data.metrics.suspendedUsers, hint: "Current total" },
    { label: "AI requests", value: data.metrics.aiRequests, hint: "Current total" },
  ];
  return <><PageHeader title="Analytics" description="A complete view of community growth, activation, engagement and moderation." actions={<select className="select" value={days} onChange={(event) => setDays(Number(event.target.value))}>{[1, 7, 30, 90].map((value) => <option value={value} key={value}>{value === 1 ? "Today" : `${value} days`}</option>)}</select>} />
    <div className="analytics-grid">{cards.map((card) => <div className="card metric analytics-metric" key={card.label}><span className="muted">{card.label}</span><strong>{card.value}</strong><small className={card.trend == null ? "muted" : card.trend >= 0 ? "trend positive" : "trend negative"}>{card.hint}</small></div>)}</div>
    <div className="card chart-card"><div className="chart-heading"><div><h2>Community trends</h2><p className="muted">Daily activity over the selected period. Choose two series to compare.</p></div><div className="chart-legend"><select className="select" aria-label="Left series" value={leftSeries} onChange={(event) => setLeftSeries(event.target.value as SeriesKey)}>{seriesOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><select className="select" aria-label="Right series" value={rightSeries} onChange={(event) => setRightSeries(event.target.value as SeriesKey)}>{seriesOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></div></div><ResponsiveContainer width="100%" height={340}><AreaChart data={data.series} margin={{ left: -15, right: 8 }}><defs><linearGradient id="left" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={left.color} stopOpacity={.4}/><stop offset="95%" stopColor={left.color} stopOpacity={0}/></linearGradient><linearGradient id="right" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={right.color} stopOpacity={.25}/><stop offset="95%" stopColor={right.color} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" opacity={.18}/><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} minTickGap={24}/><YAxis allowDecimals={false}/><Tooltip labelFormatter={(value) => new Date(String(value)).toLocaleDateString()}/><Area type="monotone" dataKey={leftSeries} stroke={left.color} strokeWidth={2} fill="url(#left)" name={left.label}/><Area type="monotone" dataKey={rightSeries} stroke={right.color} strokeWidth={2} fill="url(#right)" name={right.label}/></AreaChart></ResponsiveContainer></div>
  </>;
}
