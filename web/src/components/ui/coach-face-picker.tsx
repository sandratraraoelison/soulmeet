'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { COACH_FACES, coachFace, coachFaceImage } from '@/features/coach/coach-faces';
import type { CoachGender } from '@/types';

const genderLabel: Record<CoachGender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  NON_GENDERED: 'Any',
};

export function CoachFacePicker({
  value = 'lumen',
  onChange,
}: {
  value?: string | null;
  onChange: (appearance: string, gender: CoachGender) => void;
}) {
  const [selectedId, setSelectedId] = useState(() => coachFace(value).id);
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
              aria-label={`${face.title}, ${face.description}`}
              title={face.title}
              className={`coach-face ${active ? 'selected' : ''}`}
              style={{ backgroundImage: `url('${coachFaceImage(face)}')` }}
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
      <div className="coach-picker-info" aria-live="polite">
        <strong>{selected.name} · {selected.title}</strong>
        <span>{selected.description}</span>
        <small>{selected.category} · Gender: {genderLabel[selected.gender]}</small>
      </div>
    </div>
  );
}
