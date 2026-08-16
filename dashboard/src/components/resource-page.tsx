'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { Page } from '@/lib/types';
import { Empty, ErrorState, Loading } from './page-state';

type Row = Record<string, unknown>;

function value(row: Row, key: string) {
  const raw = key.split('.').reduce<unknown>((current, part) =>
    typeof current === 'object' && current !== null ? (current as Row)[part] : undefined, row);
  if (raw == null) return '—';
  if (Array.isArray(raw)) return raw.length ? raw.map(item => String(item).replaceAll('_', ' ')).join(', ') : '—';
  if (typeof raw === 'object') return JSON.stringify(raw);
  if (typeof raw === 'string' && /^\d{4}-\d\d-\d\dT/.test(raw)) return new Date(raw).toLocaleString();
  return String(raw);
}

export function ResourcePage({ title, description, endpoint, columns }: {
  title: string; description: string; endpoint: string; columns: [string, string][];
}) {
  const [page, setPage] = useState(1);
  const limit = 20;
  const separator = endpoint.includes('?') ? '&' : '?';
  const query = useQuery({ queryKey: [endpoint, page], queryFn: () => api<Page<Row>>(`${endpoint}${separator}page=${page}&limit=${limit}`) });
  const heading = <div className="heading"><div><h1>{title}</h1><p>{description}</p></div></div>;
  if (query.isLoading) return <>{heading}<Loading /></>;
  if (query.error) return <>{heading}<ErrorState message={query.error.message} /></>;
  const data = query.data;
  if (!data?.items.length) return <>{heading}<Empty /></>;
  return <>{heading}<div className="tablewrap"><table><thead><tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map(([label, key]) => <td key={label}>{value(row, key)}</td>)}</tr>)}</tbody></table></div><div className="pagination"><span className="muted">{data.total} items · Page {data.page}</span><div className="row-actions"><button className="button" disabled={page === 1} onClick={() => setPage(current => current - 1)}>Previous</button><button className="button" disabled={page * limit >= data.total} onClick={() => setPage(current => current + 1)}>Next</button></div></div></>;
}
