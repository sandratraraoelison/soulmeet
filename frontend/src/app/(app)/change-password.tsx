import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Screen } from '@/components/common/Screen';
import { BackButton } from '@/components/navigation/BackButton';
import { useLogout } from '@/hooks/use-auth';

export default function ChangePasswordScreen() {
  const user = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const logout = useLogout();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const changePassword = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => Alert.alert('Password changed', 'All active sessions have been signed out. Sign in again with your new password.', [{ text: 'Sign in again', onPress: () => logout.mutate() }], { cancelable: false }),
  });
  const submit = () => {
    setValidationError(null);
    if (newPassword.length < 8) return setValidationError('Your new password must contain at least 8 characters.');
    if (newPassword !== confirmation) return setValidationError('The new passwords do not match.');
    if (newPassword === currentPassword) return setValidationError('Choose a password different from your current password.');
    changePassword.mutate({ currentPassword, newPassword });
  };
  return (
    <Screen>
      <View className="flex-row items-center"><BackButton fallbackHref="/(app)/settings" /><Text className="ml-3 font-label text-xs font-bold tracking-[3px] text-secondary">SECURITY</Text></View>
      <Text className="mt-5 font-headline text-3xl font-bold text-ink">Change password</Text>
      <Text className="mt-2 text-sm leading-6 text-muted">Use at least 8 characters. You will be signed out on every device after the change.</Text>
      {user.data?.authProvider && user.data.authProvider !== 'EMAIL' ? (
        <View className="mt-8 rounded-[22px] border border-border bg-surface p-5">
          <Text className="font-headline text-lg font-bold text-ink">Managed by {user.data.authProvider === 'GOOGLE' ? 'Google' : 'Apple'}</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">This account does not use a Soulmeet password. Change it through your sign-in provider.</Text>
          <View className="mt-5"><Button label="Back to settings" variant="secondary" onPress={() => router.back()} /></View>
        </View>
      ) : (
        <View className="mt-8 gap-5 rounded-[22px] border border-border bg-surface p-5">
          <PasswordInput label="Current password" value={currentPassword} onChangeText={setCurrentPassword} autoCapitalize="none" autoComplete="current-password" />
          <PasswordInput label="New password" value={newPassword} onChangeText={setNewPassword} autoCapitalize="none" autoComplete="new-password" />
          <PasswordInput label="Confirm new password" value={confirmation} onChangeText={setConfirmation} autoCapitalize="none" autoComplete="new-password" />
          <ErrorMessage message={validationError ?? (changePassword.error ? getErrorMessage(changePassword.error) : null)} />
          <Button label="Update password" loading={changePassword.isPending} disabled={!currentPassword || !newPassword || !confirmation} onPress={submit} />
        </View>
      )}
    </Screen>
  );
}
