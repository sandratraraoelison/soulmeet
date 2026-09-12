import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { getErrorMessage } from '@/api/client';
import { useSocialAuth } from '@/hooks/use-auth';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';

WebBrowser.maybeCompleteAuthSession();

export function GoogleButton({ compact = false }: { compact?: boolean }) {
  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    return (
      <Button
        label={compact ? 'Google' : 'Continue with Google'}
        variant="secondary"
        disabled
      />
    );
  }
  return <ConfiguredGoogleButton compact={compact} />;
}

function ConfiguredGoogleButton({ compact = false }: { compact?: boolean }) {
  const google = useSocialAuth('google');
  const [request, response, promptGoogle] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) {
      google.mutate(response.params.id_token);
    }
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View className="gap-2">
      <Button
        label={compact ? 'Google' : 'Continue with Google'}
        variant="secondary"
        loading={google.isPending}
        disabled={!request}
        onPress={() => void promptGoogle()}
      />
      <ErrorMessage
        message={google.error ? getErrorMessage(google.error) : null}
      />
    </View>
  );
}
