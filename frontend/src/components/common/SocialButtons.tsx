import { useEffect, useRef, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { getErrorMessage } from '@/api/client';
import { useSocialAuth } from '@/hooks/use-auth';
import { diag } from '@/lib/diag';
import { GoogleButton } from './GoogleButton';
import { ErrorMessage } from './ErrorMessage';

export function SocialButtons() {
  const apple = useSocialAuth('apple');
  const appleBusy = useRef(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const signInWithApple = async () => {
    if (appleBusy.current) return;
    appleBusy.current = true;
    setAppleLoading(true);
    try {
      apple.reset();
      setProviderError(null);
      diag.log('STEP1 Apple signInAsync() start');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      diag.log('STEP2 Apple signInAsync() resolved');
      diag.log(
        `STEP3 credential.user present=${Boolean(credential.user)} ${credential.user ?? '(none)'}`,
      );
      diag.log(
        `STEP4 credential.email present=${Boolean(credential.email)} ${credential.email ?? '(none)'}`,
      );
      diag.log(
        `STEP4b identityToken present=${Boolean(credential.identityToken)} len=${credential.identityToken?.length ?? 0}`,
      );
      if (!credential.identityToken)
        throw new Error('Apple did not return an identity token.');
      diag.log('STEP4c identityToken OK, calling apple.mutate()');
      await apple.mutateAsync(credential.identityToken);
    } catch (error) {
      diag.error('APPLE signInAsync error', error);
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setProviderError(
          error instanceof Error ? error.message : 'Apple sign-in failed.',
        );
      }
    } finally {
      appleBusy.current = false;
      setAppleLoading(false);
    }
  };

  return (
    <View className="gap-3">
      <View className="my-2 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-xs font-semibold text-muted">OR</Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      <View className={appleAvailable ? 'flex-row gap-3' : 'w-full'}>
        <View
          className={appleAvailable ? 'min-h-14 flex-1' : 'min-h-14 w-full'}
        >
          <GoogleButton compact={appleAvailable} />
        </View>
        {appleAvailable ? (
          <View
            className="flex-1"
            pointerEvents={appleLoading ? 'none' : 'auto'}
            accessibilityState={{ busy: appleLoading, disabled: appleLoading }}
          >
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              }
              cornerRadius={14}
              style={{ width: '100%', height: 56 }}
              onPress={() => void signInWithApple()}
            />
            {appleLoading ? (
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel="Signing in with Apple"
                accessibilityRole="progressbar"
              >
                <ActivityIndicator color="#000000" />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <ErrorMessage
        message={apple.error ? getErrorMessage(apple.error) : providerError}
      />
    </View>
  );
}
