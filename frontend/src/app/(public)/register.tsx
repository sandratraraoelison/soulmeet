import { Link } from 'expo-router';
import { AuthForm } from '@/components/forms/AuthForm';
import { AuthScreen } from '@/components/layout/AuthScreen';
export default function RegisterScreen() {
  return (
    <AuthScreen
      eyebrow="YOUR JOURNEY STARTS HERE"
      title={'Create your\nprivate space'}
      subtitle="A thoughtful companion begins with a secure account made just for you."
    >
      <AuthForm mode="register" dark />
      <Link
        href="/(public)/login"
        className="mt-8 text-center font-semibold text-secondary"
      >
        Already have an account? Sign in
      </Link>
    </AuthScreen>
  );
}
