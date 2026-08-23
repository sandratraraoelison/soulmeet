import { Link, router } from 'expo-router';
import { Text, View } from 'react-native';
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
      <View className="mt-8 items-center border-t border-border pt-6 pb-4">
        <Text className="text-sm text-muted">New to Soulmeet?</Text>
        <Link
          href="/(public)/register"
          className="mt-1 min-h-11 px-5 py-3 text-center font-label text-base font-bold text-primary"
        >
          Create an account
        </Link>
      </View>
    </AuthScreen>
  );
}
