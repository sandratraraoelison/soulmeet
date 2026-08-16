import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getErrorMessage } from '@/api/client';
import { profileApi } from '@/api/profile.api';
import { BackButton } from '@/components/navigation/BackButton';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Input } from '@/components/common/Input';
import { useLogout } from '@/hooks/use-auth';
import { profileSchema, type ProfileForm } from '@/schemas/onboarding.schemas';
import type { Gender } from '@/types/models';

const genders: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_GENDERED', label: 'Non-gendered' },
];

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const adultCutoff = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

export default function ProfileOnboardingScreen() {
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const existing = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    retry: false,
  });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: existing.data
      ? {
          firstName: existing.data.firstName,
          birthDate: existing.data.birthDate.slice(0, 10),
          gender: existing.data.gender,
          sexualOrientation: existing.data.sexualOrientation,
          country: existing.data.country,
          city: existing.data.city,
        }
      : {
          firstName: '',
          birthDate: '',
          gender: 'NON_GENDERED',
          sexualOrientation: 'PREFER_NOT_TO_SAY',
          country: '',
          city: '',
        },
  });
  const save = useMutation({
    mutationFn: profileApi.save,
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
      router.replace('/(onboarding)/companion');
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ThemedStatusBar />
      <KeyboardAwareScrollView
        bottomOffset={32}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingBottom: 128,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center border-b border-white/5 py-3">
          <BackButton accessibilityLabel="Back to sign in" onPress={() => logout.mutate()} />
          <Text className="text-sm text-muted">Soulmeet</Text>
        </View>
        <Text className="mt-7 text-xs font-bold tracking-wider text-[#AFA9E8]">
          YOUR PROFILE
        </Text>
        <View className="mt-4 h-[3px] rounded-full bg-surface-raised">
          <View className="h-[3px] w-full rounded-full bg-[#F7C94B]" />
        </View>
        <Text className="mt-8 text-center text-[30px] font-bold text-ink">
          Tell us about <Text className="text-[#F7C94B]">you</Text>
        </Text>
        <Text className="mx-3 mb-8 mt-3 text-center text-base leading-6 text-muted">
          Complete your profile before choosing who you are interested in.
        </Text>
        <View className="gap-5">
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input
                dark
                label="First name"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.firstName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => {
              const selected = field.value
                ? new Date(`${field.value}T12:00:00`)
                : adultCutoff();
              return (
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-[#D9D5E3]">
                    Date of birth
                  </Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className={`min-h-14 justify-center rounded-2xl border border-border bg-surface-raised px-4 ${errors.birthDate ? 'border-danger' : ''}`}
                  >
                    <Text
                      className={
                        field.value
                          ? 'text-base text-ink'
                          : 'text-base text-[#9B94A5]'
                      }
                    >
                      {field.value || 'Select your date of birth'}
                    </Text>
                  </Pressable>
                  {showDatePicker ? (
                    <View className="rounded-2xl bg-surface-raised p-2">
                      <DateTimePicker
                        value={selected}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={adultCutoff()}
                        minimumDate={new Date(1900, 0, 1)}
                        themeVariant="dark"
                        onChange={(event, date) => {
                          if (Platform.OS === 'android')
                            setShowDatePicker(false);
                          if (event.type === 'set' && date)
                            field.onChange(formatDate(date));
                        }}
                      />
                      {Platform.OS === 'ios' ? (
                        <Pressable
                          onPress={() => setShowDatePicker(false)}
                          className="items-center rounded-xl bg-[#F7C94B] py-3"
                        >
                          <Text className="font-semibold text-[#111016]">
                            Done
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {errors.birthDate ? (
                    <Text className="text-sm text-danger">
                      {errors.birthDate.message}
                    </Text>
                  ) : null}
                </View>
              );
            }}
          />
          <Text className="text-sm font-semibold text-[#D9D5E3]">Gender</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <View className="flex-row gap-2">
                {genders.map((item) => (
                  <Pressable
                    key={item.value}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: field.value === item.value,
                    }}
                    onPress={() => field.onChange(item.value)}
                    className={`min-h-14 flex-1 items-center justify-center rounded-xl border px-2 ${field.value === item.value ? 'border-[#F7C94B] bg-[#252117]' : 'border-white/10 bg-[#171620]'}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${field.value === item.value ? 'text-[#F7C94B]' : 'text-[#A6A0B2]'}`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Input
                dark
                label="Country"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.country?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <Input
                dark
                label="City / location"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.city?.message}
              />
            )}
          />
          <ErrorMessage
            message={save.error ? getErrorMessage(save.error) : null}
          />
          <Button
            label="Continue"
            variant="light"
            loading={save.isPending}
            onPress={handleSubmit((values) => save.mutate(values))}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
