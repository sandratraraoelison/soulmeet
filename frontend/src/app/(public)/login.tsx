import { Link, router } from 'expo-router';
import { AuthForm } from '@/components/forms/AuthForm';
import { AuthScreen } from '@/components/layout/AuthScreen';
export default function LoginScreen() {
  return (
    <AuthScreen
      eyebrow="WELCOME BACK"
      title={'Continue your\njourney'}
      subtitle="Your companion and your private space are waiting for you."
      onBackPress={() => router.replace('/(public)/welcome')}
    >
      <AuthForm mode="login" dark />
      <Link
        href="/(public)/register"
        className="mt-8 text-center font-semibold text-secondary"
      >
        New here? Create an account
      </Link>
    </AuthScreen>
  );
}
