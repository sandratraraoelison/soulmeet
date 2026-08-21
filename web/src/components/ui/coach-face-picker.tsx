'use client';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { COACH_FACES, coachFace } from '@/features/coach/coach-faces';
import type { CoachGender } from '@/types';

const genderLabel: Record<CoachGender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  NON_GENDERED: 'Non-gendered',
};

export function CoachFacePicker({
  value = 'neutral-ai',
  onChange,
}: {
  value?: string | null;
  onChange: (appearance: string, gender: CoachGender) => void;
}) {
  const [selectedId, setSelectedId] = useState(() => coachFace(value).id);

  useEffect(() => {
    setSelectedId(coachFace(value).id);
  }, [value]);

  const selected = coachFace(selectedId);
  return (
    <div className="coach-picker">
      <div className="coach-picker-strip" role="radiogroup" aria-label="Coach appearance">
        {COACH_FACES.map((face) => {
          const active = face.id === selected.id;
          return (
            <button
              key={face.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${face.title}, ${genderLabel[face.gender]}`}
              className={`coach-face ${active ? 'selected' : ''}`}
              onClick={() => {
                setSelectedId(face.id);
                onChange(face.id, face.gender);
              }}
            >
              {active && (
                <span className="coach-face-check" aria-hidden="true">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="coach-picker-labels">
        {COACH_FACES.map((face) => (
          <span key={face.id} className={face.id === selected.id ? 'active' : ''}>
            <strong>{face.title}</strong>
            <small>{genderLabel[face.gender]}</small>
          </span>
        ))}
      </div>
      <div className="coach-picker-info">
        <strong>{selected.title}</strong>
        <span>{selected.description}</span>
        <small>Gender · {genderLabel[selected.gender]}</small>
      </div>
    </div>
  );
}
