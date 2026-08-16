export function Loading() {
  return <div className="grid" aria-label="Loading">{Array.from({ length: 8 }, (_, i) => <div className="skeleton" key={i} />)}</div>;
}
export function ErrorState({ message }: { message: string }) {
  return <div className="card state" role="alert"><h3>We couldn’t load this view</h3><p>{message}</p></div>;
}
export function Empty({ label = 'No data yet' }: { label?: string }) {
  return <div className="card state"><h3>{label}</h3><p>Items will appear here when the backend has data to show.</p></div>;
}
