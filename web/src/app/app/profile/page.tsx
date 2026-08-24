'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Sparkles } from 'lucide-react';
import { Failure, Loading } from '@/components/remote';
import { FormField, FormSelect } from '@/components/ui/form-controls';
import { CountryCityFields } from '@/components/ui/country-city';
import { PageHeader } from '@/components/ui/page-header';
import { profileService } from '@/services/profile';
import {
  DATING_GENDER_OPTIONS,
  PROFILE_GENDER_OPTIONS,
} from '@/lib/constants';
import type { Profile } from '@/types';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['profile'], queryFn: profileService.get });
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    meta: { successMessage: 'Profile updated.', errorMessage: true },
    mutationFn: (form: FormData) =>
      profileService.update({
        firstName: String(form.get('firstName')),
        birthDate: String(form.get('birthDate')),
        gender: String(form.get('gender')) as Profile['gender'],
        sexualOrientation: profile.data?.sexualOrientation ?? 'PREFER_NOT_TO_SAY',
        country: String(form.get('country')),
        city: String(form.get('city')),
        occupation: String(form.get('occupation') || ''),
        interestedInGender: String(form.get('interestedInGender')) as Profile['interestedInGender'],
      }),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
  if (profile.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (profile.isError || !profile.data)
    return (
      <div className="page">
        <Failure retry={() => void profile.refetch()} />
      </div>
    );
  const data = profile.data;
  const actions = (
    <div className="action-row profile-header-actions">
      <Link className="button secondary" href="/app/profile/coach">
        <Sparkles size={17} aria-hidden="true" /> Customize Coach
      </Link>
      <Link className="button secondary" href="/app/settings">
        <Settings size={17} aria-hidden="true" /> Settings
      </Link>
    </div>
  );
  return (
    <div className="page profile-settings-page">
      <PageHeader
        eyebrow="Profile"
        title="Your space"
        description="Keep the details that shape your Soulmeet experience up to date."
        actions={actions}
      />
      <form
        className="panel card form-wide profile-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          save.mutate(new FormData(event.currentTarget));
        }}
      >
        <div className="grid">
          <FormField
            id="firstName"
            name="firstName"
            label="First name"
            defaultValue={data.firstName}
            required
            maxLength={80}
          />
          <FormField
            id="birthDate"
            name="birthDate"
            label="Birth date"
            type="date"
            defaultValue={data.birthDate.slice(0, 10)}
            required
          />
          <FormSelect
            id="gender"
            name="gender"
            label="Gender"
            defaultValue={data.gender}
            options={PROFILE_GENDER_OPTIONS}
          />
          <CountryCityFields
            defaultCountry={data.country}
            defaultCity={data.city}
            required
          />
          <FormField
            id="occupation"
            name="occupation"
            label="Occupation"
            defaultValue={data.occupation ?? ''}
            maxLength={100}
          />
          <FormSelect
            id="interestedInGender"
            name="interestedInGender"
            label="Dating preference"
            defaultValue={data.interestedInGender ?? 'NON_GENDERED'}
            options={DATING_GENDER_OPTIONS}
          />
        </div>
        {save.isError && (
          <p className="error" role="alert">
            {save.error.message}
          </p>
        )}
        <div className="profile-form-footer">
          {saved && <p role="status">Changes saved.</p>}
          <button className="button profile-save-button" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
