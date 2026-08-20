import { Brand } from '@/components/brand';
export default function Terms() {
  return (
    <main className="container" style={{ maxWidth: 760, padding: '40px 0' }}>
      <Brand />
      <h1>Terms of use</h1>
      <p className="muted">
        Soulmeet offers dating guidance, not medical, legal, or emergency services. This deployment
        must publish the final terms before production launch.
      </p>
    </main>
  );
}
