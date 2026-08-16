import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { SocialButtons } from '@/components/common/SocialButtons';
import { useEmailAuth } from '@/hooks/use-auth';
import {
  loginSchema,
  registerSchema,
  type LoginForm,
  type RegisterForm,
} from '@/schemas/auth.schemas';

const formatDate = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

const getAdultCutoff = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

export function AuthForm({
  mode,
  dark = false,
}: {
  mode: 'login' | 'register';
  dark?: boolean;
}) {
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const mutation = useEmailAuth(mode);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm | RegisterForm>({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(mode === 'register' ? { confirmPassword: '' } : {}),
      ...(mode === 'register'
        ? {
            firstName: '',
            birthDate: '',
            gender: 'NON_GENDERED',
            country: '',
            location: '',
          }
        : {}),
    },
  });
  const submit = (values: LoginForm | RegisterForm) => {
    if (mode === 'register' && 'firstName' in values) {
      mutation.mutate({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        birthDate: values.birthDate,
        gender: values.gender,
        country: values.country,
        location: values.location,
      });
      return;
    }
    mutation.mutate({ email: values.email, password: values.password });
  };
  return (
    <View className="gap-5">
      {mode === 'register' ? (
        <>
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <Input
                dark={dark}
                label="First name"
                value={field.value as string}
                onChangeText={field.onChange}
                error={
                  'firstName' in errors ? errors.firstName?.message : undefined
                }
              />
            )}
          />
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => {
              const value = field.value as string;
              const selectedDate = value
                ? new Date(`${value}T12:00:00`)
                : getAdultCutoff();
              const onDateChange = (
                event: DateTimePickerEvent,
                date?: Date,
              ) => {
                if (Platform.OS === 'android') setShowBirthDatePicker(false);
                if (event.type === 'set' && date)
                  field.onChange(formatDate(date));
              };

              return (
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-[#D9D5E3]">
                    Date of birth
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose date of birth"
                    onPress={() => setShowBirthDatePicker(true)}
                    className={`min-h-14 justify-center rounded-2xl border border-border bg-surface-raised px-4 ${'birthDate' in errors && errors.birthDate ? 'border-danger' : ''}`}
                  >
                    <Text
                      className={`text-base ${value ? 'text-ink' : 'text-[#9B94A5]'}`}
                    >
                      {value || 'Select your date of birth'}
                    </Text>
                  </Pressable>
                  {'birthDate' in errors && errors.birthDate ? (
                    <Text className="text-sm text-danger">
                      {errors.birthDate.message}
                    </Text>
                  ) : null}
                  {showBirthDatePicker ? (
                    <View className="overflow-hidden rounded-2xl bg-surface-raised p-2">
                      <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={getAdultCutoff()}
                        minimumDate={new Date(1900, 0, 1)}
                        onChange={onDateChange}
                        themeVariant="dark"
                      />
                      {Platform.OS === 'ios' ? (
                        <Pressable
                          onPress={() => setShowBirthDatePicker(false)}
                          className="items-center rounded-xl bg-primary py-3"
                        >
                          <Text className="font-semibold text-white">
                            Done
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
          <View className="gap-2">
            <Text className="text-sm font-semibold text-[#D9D5E3]">Gender</Text>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <View className="flex-row gap-2">
                  {(
                    [
                      { value: 'MALE', label: 'Male' },
                      { value: 'FEMALE', label: 'Female' },
                      { value: 'NON_GENDERED', label: 'Non-gendered' },
                    ] as const
                  ).map((option) => (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: field.value === option.value,
                      }}
                      onPress={() => field.onChange(option.value)}
                      className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-2 ${field.value === option.value ? 'border-[#F7C94B] bg-[#252117]' : 'border-white/10 bg-[#171620]'}`}
                    >
                      <Text
                        className={`text-xs font-semibold ${field.value === option.value ? 'text-[#F7C94B]' : 'text-[#A6A0B2]'}`}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </View>
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Input
                dark={dark}
                label="Country"
                value={field.value as string}
                onChangeText={field.onChange}
                error={
                  'country' in errors ? errors.country?.message : undefined
                }
              />
            )}
          />
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <Input
                dark={dark}
                label="City / location"
                value={field.value as string}
                onChangeText={field.onChange}
                error={
                  'location' in errors ? errors.location?.message : undefined
                }
              />
            )}
          />
        </>
      ) : null}
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input
            label="Email"
            dark={dark}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <PasswordInput
            label="Password"
            dark={dark}
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />
      {mode === 'login' ? (
        <Link href="/(public)/forgot-password" className="-mt-2 text-right font-label text-sm font-semibold text-secondary">
          Forgot password?
        </Link>
      ) : null}
      {mode === 'register' ? (
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <PasswordInput
              label="Confirm password"
              dark={dark}
              value={field.value as string}
              onChangeText={field.onChange}
              error={
                'confirmPassword' in errors
                  ? errors.confirmPassword?.message
                  : undefined
              }
            />
          )}
        />
      ) : null}
      <ErrorMessage
        message={mutation.error ? getErrorMessage(mutation.error) : null}
      />
      <Button
        label={mode === 'login' ? 'Sign in' : 'Create account'}
        variant={dark ? 'light' : 'primary'}
        loading={mutation.isPending}
        onPress={handleSubmit(submit)}
      />
      <Text
        className={`text-center text-xs leading-5 ${dark ? 'text-[#6F6A7E]' : 'text-muted'}`}
      >
        By continuing, you agree to use Soulmeet respectfully and honestly.
      </Text>
      <SocialButtons />
    </View>
  );
}
