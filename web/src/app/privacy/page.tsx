import { Brand } from '@/components/brand';
export default function Privacy() {
  return (
    <main className="container" style={{ maxWidth: 760, padding: '40px 0' }}>
      <Brand />
      <h1>Privacy policy</h1>
      <p className="muted">
        Soulmeet keeps coaching conversations and SoulPrint data private. This deployment must
        publish the final legal policy before production launch.
      </p>
    </main>
  );
}
