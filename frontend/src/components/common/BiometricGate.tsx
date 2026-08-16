import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { biometricService } from '@/services/biometric.service';

export function BiometricGate({ enabled, children }: PropsWithChildren<{ enabled: boolean }>) {
  const [locked, setLocked] = useState(false);
  const authenticating = useRef(false);
  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    const active = enabled && await biometricService.enabled();
    if (!active) setLocked(false);
    else setLocked(!(await biometricService.authenticate()).success);
    authenticating.current = false;
  }, [enabled]);
  useEffect(() => { void unlock(); }, [unlock]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!enabled) return;
      if (state === 'background') void biometricService.enabled().then(setLocked);
      if (state === 'active') void unlock();
    });
    return () => subscription.remove();
  }, [enabled, unlock]);
  if (!locked) return <>{children}</>;
  return (
    <View className="flex-1 items-center justify-center bg-canvas px-8">
      <View className="w-full max-w-sm items-center rounded-3xl border border-border bg-surface p-7">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Text className="text-3xl text-primary">&#9673;</Text>
        </View>
        <Text className="mt-5 font-headline text-2xl font-bold text-ink">Soulmeet is locked</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-muted">Authenticate to protect your conversations and personal insights.</Text>
        <View className="mt-6 w-full"><Button label="Unlock" onPress={() => void unlock()} /></View>
      </View>
    </View>
  );
}
