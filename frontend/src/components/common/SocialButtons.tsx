import { useEffect, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Text, View } from 'react-native';
import { getErrorMessage } from '@/api/client';
import { useSocialAuth } from '@/hooks/use-auth';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';

WebBrowser.maybeCompleteAuthSession();

export function SocialButtons() {
  const apple = useSocialAuth('apple');
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const googleConfigured = Boolean(
    Platform.select({
      android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      default: undefined,
    }),
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const signInWithApple = async () => {
    try {
      setProviderError(null);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken)
        throw new Error('Apple did not return an identity token.');
      apple.mutate(credential.identityToken);
    } catch (error) {
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setProviderError(
          error instanceof Error ? error.message : 'Apple sign-in failed.',
        );
      }
    }
  };

  return (
    <View className="gap-3">
      <View className="my-2 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs font-semibold text-muted">OR</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      {googleConfigured ? (
        <GoogleButton />
      ) : (
        <Button label="Continue with Google" variant="secondary" disabled />
      )}
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={14}
          style={{ width: '100%', height: 56 }}
          onPress={() => void signInWithApple()}
        />
      ) : null}
      <ErrorMessage
        message={apple.error ? getErrorMessage(apple.error) : providerError}
      />
    </View>
  );
}

function GoogleButton() {
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
        label="Continue with Google"
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
