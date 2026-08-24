'use client';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, json } from '@/services/api';
import type { Coach, CoachGender, CoachPersonality } from '@/types';
import { Failure, Loading } from '@/components/remote';
import { CoachFacePicker } from '@/components/ui/coach-face-picker';
import { coachFace } from '@/features/coach/coach-faces';
import { COACH_TRAIT_OPTIONS } from '@/lib/constants';
const traits = COACH_TRAIT_OPTIONS;
export default function CoachSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['coach'], queryFn: () => api<Coach>('/coach') });
  const [saved, setSaved] = useState(false);
  const [selectedTraits, setSelectedTraits] = useState<CoachPersonality[] | null>(null);
  const genderRef = useRef<HTMLInputElement>(null);
  const appearanceRef = useRef<HTMLInputElement>(null);
  const save = useMutation({
    meta: { successMessage: 'Coach updated.', errorMessage: true },
    mutationFn: (form: FormData) =>
      api(
        '/coach',
        json('PUT', {
          name: form.get('name'),
          gender: form.get('gender') as CoachGender,
          appearance: form.get('appearance'),
          customInstructions: form.get('customInstructions'),
          traits: form.getAll('traits'),
          humorLevel: Number(form.get('humorLevel')),
          empathyLevel: Number(form.get('empathyLevel')),
          directnessLevel: Number(form.get('directnessLevel')),
          energyLevel: Number(form.get('energyLevel')),
        }),
      ),
    onSuccess: () => {
      setSaved(true);
      void qc.invalidateQueries({ queryKey: ['coach'] });
    },
  });
  if (q.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (q.isError || !q.data)
    return (
      <div className="page">
        <Failure retry={() => void q.refetch()} />
      </div>
    );
  const coach = q.data;
  const activeTraits = selectedTraits ?? coach.traits;
  return (
    <div className="page">
      <div className="eyebrow">Coach information</div>
      <h1>Shape your Coach</h1>
      <p className="muted">Adjust the presence and communication style that supports you.</p>
      <form
        className="panel card form-wide"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          save.mutate(new FormData(e.currentTarget));
        }}
      >
        <div className="field">
          <label htmlFor="name">Coach name</label>
          <input id="name" name="name" required maxLength={80} defaultValue={coach.name} />
        </div>
        <CoachFacePicker
          value={coach.appearance ?? 'neutral-ai'}
          onChange={(appearance, gender) => {
            const option = coachFace(appearance);
            if (appearanceRef.current) appearanceRef.current.value = appearance;
            if (genderRef.current) genderRef.current.value = gender;
            setSelectedTraits([...option.defaultTraits]);
          }}
        />
        <input type="hidden" name="gender" ref={genderRef} defaultValue={coach.gender} />
        <input
          type="hidden"
          name="appearance"
          ref={appearanceRef}
          defaultValue={coach.appearance ?? 'neutral-ai'}
        />
        <div className="field">
          <label htmlFor="customInstructions">Anything else your Coach should know?</label>
          <textarea
            id="customInstructions"
            name="customInstructions"
            maxLength={1000}
            defaultValue={coach.customInstructions ?? ''}
          />
        </div>
        <fieldset>
          <legend>Personality traits</legend>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: 10,
            }}
          >
            {traits.map((trait) => (
              <label className="trait-card" key={trait.value}>
                <span>
                  <strong>{trait.label}</strong>
                  <small>{trait.description}</small>
                </span>
                <input
                  type="checkbox"
                  name="traits"
                  value={trait.value}
                  checked={activeTraits.includes(trait.value)}
                  onChange={() => setSelectedTraits((current) => { const values = current ?? coach.traits; return values.includes(trait.value) ? values.filter((value) => value !== trait.value) : [...values, trait.value]; })}
                  className="trait-check"
                  style={{ width: 22, height: 22, minHeight: 22 }}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid">
          {(
            [
              ['humorLevel', 'Humor'],
              ['empathyLevel', 'Empathy'],
              ['directnessLevel', 'Directness'],
              ['energyLevel', 'Energy'],
            ] as const
          ).map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={key}>{label}</label>
              <input id={key} name={key} type="range" min="0" max="100" defaultValue={coach[key]} />
            </div>
          ))}
        </div>
        {save.isError && (
          <p className="error" role="alert">
            {save.error.message}
          </p>
        )}
        {saved && <p role="status">Coach updated.</p>}
        <button className="button" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save Coach'}
        </button>
      </form>
    </div>
  );
}
