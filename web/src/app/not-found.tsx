import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="container" style={{ padding: '20vh 0', textAlign: 'center' }}>
      <div className="eyebrow">404</div>
      <h1>That page is not here.</h1>
      <Link className="button" href="/">
        Return home
      </Link>
    </main>
  );
}
