import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Brand } from '@/components/brand';
export default function Register() {
  return (
    <main className="auth-page">
      <section className="auth-art">
        <div>
          <Brand />
          <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '3rem', maxWidth: 500 }}>
            A space to understand yourself and connect better.
          </h2>
        </div>
      </section>
      <section className="auth-card">
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </section>
    </main>
  );
}
