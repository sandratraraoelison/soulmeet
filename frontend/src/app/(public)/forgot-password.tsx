import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { authApi } from '@/api/auth.api';
import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { AuthScreen } from '@/components/layout/AuthScreen';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const request = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim().toLowerCase()),
    onSuccess: () => setCodeSent(true),
  });
  const reset = useMutation({
    mutationFn: () => authApi.resetPassword({ email: email.trim().toLowerCase(), code, newPassword: password }),
    onSuccess: () => Alert.alert('Password reset', 'You can now sign in with your new password.', [{ text: 'Sign in', onPress: () => router.replace('/(public)/login') }], { cancelable: false }),
  });
  const submitReset = () => {
    setValidationError(null);
    if (!/^\d{6}$/.test(code)) return setValidationError('Enter the 6-digit code from your email.');
    if (password.length < 8) return setValidationError('Your password must contain at least 8 characters.');
    if (password !== confirmation) return setValidationError('The passwords do not match.');
    reset.mutate();
  };
  return (
    <AuthScreen eyebrow="ACCOUNT RECOVERY" title={codeSent ? 'Check your email' : 'Reset your password'} subtitle={codeSent ? `Enter the 6-digit code sent to ${email}. It expires in 15 minutes.` : 'Enter your email and we will send you a secure recovery code.'}>
      <View className="gap-5">
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!codeSent} />
        {codeSent ? (
          <>
            <Input label="Recovery code" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} />
            <PasswordInput label="New password" value={password} onChangeText={setPassword} autoComplete="new-password" />
            <PasswordInput label="Confirm new password" value={confirmation} onChangeText={setConfirmation} autoComplete="new-password" />
            <ErrorMessage message={validationError ?? (reset.error ? getErrorMessage(reset.error) : null)} />
            <Button label="Reset password" loading={reset.isPending} disabled={!code || !password || !confirmation} onPress={submitReset} />
            <Button label="Send a new code" variant="ghost" loading={request.isPending} onPress={() => request.mutate()} />
          </>
        ) : (
          <>
            <ErrorMessage message={request.error ? getErrorMessage(request.error) : null} />
            <Button label="Send recovery code" loading={request.isPending} disabled={!email.includes('@')} onPress={() => request.mutate()} />
          </>
        )}
        <Button label="Back to sign in" variant="ghost" onPress={() => router.back()} />
        <Text className="text-center text-xs leading-5 text-muted">For security, we show the same confirmation whether or not an account exists.</Text>
      </View>
    </AuthScreen>
  );
}
