import { create } from 'zustand';
import type { CoachGender, CoachPersonality, InterestGender } from '@/types/models';

interface OnboardingState {
  interestedInGender: InterestGender | null;
  coachGender: CoachGender | null;
  coachAppearance: string | null;
  coachName: string;
  coachTraits: CoachPersonality[];
  setInterestedInGender: (gender: InterestGender) => void;
  setCoachGender: (gender: CoachGender) => void;
  setCoachAppearance: (appearance: string) => void;
  setCoachName: (name: string) => void;
  toggleCoachTrait: (trait: CoachPersonality) => void;
  reset: () => void;
}

const initialState = {
  interestedInGender: null,
  coachGender: null,
  coachAppearance: 'neutral-ai',
  coachName: '',
  coachTraits: [] as CoachPersonality[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setInterestedInGender: (interestedInGender) => set({ interestedInGender }),
  setCoachGender: (coachGender) => set({ coachGender }),
  setCoachAppearance: (coachAppearance) => set({ coachAppearance }),
  setCoachName: (coachName) => set({ coachName }),
  toggleCoachTrait: (trait) =>
    set((state) => ({
      coachTraits: state.coachTraits.includes(trait)
        ? state.coachTraits.filter((item) => item !== trait)
        : [...state.coachTraits, trait],
    })),
  reset: () => set(initialState),
}));
