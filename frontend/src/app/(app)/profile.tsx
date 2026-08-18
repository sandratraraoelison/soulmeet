import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { getErrorMessage } from '@/api/client';
import { profileApi } from '@/api/profile.api';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Input } from '@/components/common/Input';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Screen } from '@/components/common/Screen';
import { BackButton } from '@/components/navigation/BackButton';
import { MotionPressable } from '@/components/motion/MotionPressable';
import type { Gender } from '@/types/models';
import { useLogout } from '@/hooks/use-auth';

const genders: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_GENDERED', label: 'Non-gendered' },
];

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const logout = useLogout();
  const { data } = useQuery({ queryKey: ['profile'], queryFn: profileApi.get });
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('NON_GENDERED');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [occupation, setOccupation] = useState('');

  useEffect(() => {
    if (!data) return;
    setFirstName(data.firstName);
    setBirthDate(data.birthDate.slice(0, 10));
    setGender(data.gender);
    setCountry(data.country);
    setCity(data.city);
    setOccupation(data.occupation ?? '');
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      profileApi.save({ firstName, birthDate, gender, country, city, occupation }),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
      router.back();
    },
  });

  if (!data) return <LoadingScreen />;
  const valid = firstName.trim() && birthDate.trim() && country.trim() && city.trim();

  return (
    <Screen>
      <View className="flex-row items-center justify-between"><BackButton fallbackHref="/(app)/home" /><MotionPressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/(app)/settings')} className="min-h-11 flex-row items-center rounded-full border border-border bg-surface px-4"><Text className="mr-2 text-base text-muted">⚙</Text><Text className="text-sm font-bold text-ink">Settings</Text></MotionPressable></View>
      <Text className="mt-6 font-label text-xs font-bold tracking-[3px] text-secondary">PERSONAL INFORMATION</Text>
      <Text className="mt-5 font-headline text-3xl font-bold text-ink">
        Edit your profile
      </Text>
      <Text className="mt-2 font-body text-muted">
        Keep the information your coach uses up to date.
      </Text>
      <View className="my-7 gap-5 rounded-[22px] border border-border bg-surface p-5">
        <Input label="First name" value={firstName} onChangeText={setFirstName} />
        <Input
          label="Date of birth"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="YYYY-MM-DD"
          maxLength={10}
        />
        <View className="gap-2">
          <Text className="font-label text-sm font-semibold text-ink">Gender</Text>
          <View className="flex-row gap-2">
            {genders.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: gender === item.value }}
                onPress={() => setGender(item.value)}
                className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-2 ${gender === item.value ? 'border-primary bg-primary/10' : 'border-border bg-surface-raised'}`}
              >
                <Text className={`text-xs font-semibold ${gender === item.value ? 'text-primary' : 'text-muted'}`}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Input label="Country" value={country} onChangeText={setCountry} />
        <Input label="City" value={city} onChangeText={setCity} />
        <Input label="Occupation (optional)" value={occupation} onChangeText={setOccupation} maxLength={100} />
        <ErrorMessage message={save.error ? getErrorMessage(save.error) : null} />
        <Button label="Save changes" disabled={!valid} loading={save.isPending} onPress={() => save.mutate()} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
      <View className="mb-7 rounded-[22px] border border-danger/20 bg-surface p-5">
        <Text className="font-label font-bold text-ink">Account session</Text>
        <Text className="mb-4 mt-1 text-sm leading-5 text-muted">Sign out from Soulmeet on this device.</Text>
        <ErrorMessage message={logout.error ? 'Unable to sign out right now. Please try again.' : null} />
        <View className="mt-3"><Button label="Sign out" variant="secondary" loading={logout.isPending} onPress={() => Alert.alert('Sign out?', 'You will need to sign in again to access your account.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => logout.mutate() }])} /></View>
      </View>
    </Screen>
  );
}
