import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { coachApi } from '@/api/coach.api';
import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Input } from '@/components/common/Input';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Screen } from '@/components/common/Screen';
import { CoachFacePicker } from '@/features/coach/components/CoachFacePicker';
import { CoachFaceAvatar } from '@/features/coach/components/CoachFaceAvatar';
import { coachFace } from '@/features/coach/coach-faces';
import type { CoachGender, CoachPersonality } from '@/types/models';

const traits: { value: CoachPersonality; label: string }[] = [
  { value: 'FRIENDLY', label: 'Friendly' },
  { value: 'EMPATHETIC', label: 'Empathetic' },
  { value: 'DIRECT', label: 'Direct' },
  { value: 'SOFT', label: 'Soft' },
  { value: 'FUNNY', label: 'Funny' },
  { value: 'SERIOUS', label: 'Serious' },
  { value: 'THERAPIST', label: 'Therapist-like' },
  { value: 'DATING_EXPERT', label: 'Dating expert' },
  { value: 'CARING', label: 'Caring' },
  { value: 'BRO_VIBE', label: 'Bro vibe' },
  { value: 'SISTER_VIBE', label: 'Sister vibe' },
  { value: 'PROTECTIVE', label: 'Protective' },
  { value: 'SARCASTIC', label: 'Sarcastic' },
  { value: 'MORE_DIRECTIVE', label: 'More directive' },
  { value: 'LESS_DIRECTIVE', label: 'Less directive' },
];

export default function CoachProfileScreen() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['coach'], queryFn: coachApi.get });
  const [name, setName] = useState('');
  const [gender, setGender] = useState<CoachGender>('NON_GENDERED');
  const [selected, setSelected] = useState<CoachPersonality[]>([]);
  const [instructions, setInstructions] = useState('');
  const [appearance, setAppearance] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setGender(data.gender);
    setSelected(data.traits);
    setInstructions(data.customInstructions ?? '');
    setAppearance(data.appearance ?? 'neutral-ai');
  }, [data]);

  const save = useMutation({
    mutationFn: () => coachApi.update({ name: name.trim(), gender, traits: selected, customInstructions: instructions.trim(), appearance: appearance ?? undefined }),
    onSuccess: (coach) => {
      queryClient.setQueryData(['coach'], coach);
      router.back();
    },
  });
  const toggle = (trait: CoachPersonality) =>
    setSelected((current) => current.includes(trait) ? current.filter((item) => item !== trait) : [...current, trait]);

  if (!data) return <LoadingScreen />;

  return (
    <Screen>
      <Text className="font-label text-xs font-bold tracking-[3px] text-secondary">COACH INFORMATION</Text>
      <View className="mt-5 flex-row items-center">
        <CoachFaceAvatar appearance={appearance} name={name || data.name} size={58} />
        <View className="ml-4 flex-1"><Text className="font-headline text-3xl font-bold text-ink">Edit your coach</Text><Text className="mt-1 font-body text-muted">Shape the presence that supports you.</Text></View>
      </View>
      <View className="my-7 gap-5 rounded-[22px] border border-border bg-surface p-5">
        <Input label="Coach name" value={name} onChangeText={setName} maxLength={80} />
        <CoachFacePicker compact value={appearance} onChange={(face, faceGender) => { const option = coachFace(face); setAppearance(face); setGender(faceGender); setSelected([...option.defaultTraits]); }} />
        <View className="gap-2">
          <Text className="font-label text-sm font-semibold text-ink">Personality traits</Text>
          <View className="flex-row flex-wrap gap-2">
            {traits.map((item) => {
              const active = selected.includes(item.value);
              return <Pressable key={item.value} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggle(item.value)} className={`rounded-full border px-4 py-3 ${active ? 'border-primary bg-primary/10' : 'border-border bg-surface-raised'}`}><Text className={`font-label text-sm font-semibold ${active ? 'text-primary' : 'text-muted'}`}>{item.label}</Text></Pressable>;
            })}
          </View>
        </View>
        <Input label="Anything else your coach should know?" value={instructions} onChangeText={setInstructions} multiline maxLength={1000} />
        <ErrorMessage message={save.error ? getErrorMessage(save.error) : null} />
        <Button label="Save changes" disabled={!name.trim() || !selected.length} loading={save.isPending} onPress={() => save.mutate()} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
