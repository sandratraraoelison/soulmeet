import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, View } from 'react-native';
import { getErrorMessage } from '@/api/client';
import { useSocialAuth } from '@/hooks/use-auth';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';

export function GoogleButton({ compact = false }: { compact?: boolean }) {
  const google = useSocialAuth('google');
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
        throw new Error(
          'Google sign-in requires an installed Soulmeet build. It is not available in Expo Go.',
        );
      }
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
      if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) {
        throw new Error('Google sign-in is not configured in this app build.');
      }
      // Load only after the Expo Go check: the native module is absent there.
      const { GoogleSignin, isSuccessResponse } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId, iosClientId });
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) return;
      if (!result.data.idToken) {
        throw new Error('Google did not return an identity token.');
      }
      await google.mutateAsync(result.data.idToken);
    } catch (cause) {
      const code = (cause as { code?: string } | null)?.code;
      if (code !== 'SIGN_IN_CANCELLED' && code !== 'IN_PROGRESS') {
        setError(
          isAxiosError(cause)
            ? getErrorMessage(cause)
            : cause instanceof Error
              ? cause.message
              : 'Google sign-in failed. Please try again.',
        );
      }
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <View className="gap-2">
      <Button
        label={compact ? 'Google' : 'Continue with Google'}
        variant="secondary"
        loading={loading}
        disabled={loading}
        onPress={() => void signIn()}
      />
      <ErrorMessage message={error} />
    </View>
  );
}
