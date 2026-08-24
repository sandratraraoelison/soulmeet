import { create } from 'zustand';
import type { CoachGender, CoachPersonality, InterestGender } from '@/types/models';

interface OnboardingState {
  interestedInGender: InterestGender | null;
  coachGender: CoachGender | null;
  coachAppearance: string | null;
  coachName: string;
  coachTraits: CoachPersonality[];
  matchingConsent: boolean;
  setInterestedInGender: (gender: InterestGender) => void;
  setCoachGender: (gender: CoachGender) => void;
  setCoachAppearance: (appearance: string) => void;
  setCoachName: (name: string) => void;
  setCoachDefaults: (name: string, traits: CoachPersonality[]) => void;
  toggleCoachTrait: (trait: CoachPersonality) => void;
  setMatchingConsent: (consent: boolean) => void;
  reset: () => void;
}

const initialState = {
  interestedInGender: null,
  coachGender: null,
  coachAppearance: 'lumen',
  coachName: 'Lumen',
  coachTraits: ['EMPATHETIC', 'SOFT', 'THERAPIST'] as CoachPersonality[],
  matchingConsent: false,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setInterestedInGender: (interestedInGender) => set({ interestedInGender }),
  setCoachGender: (coachGender) => set({ coachGender }),
  setCoachAppearance: (coachAppearance) => set({ coachAppearance }),
  setCoachName: (coachName) => set({ coachName }),
  setCoachDefaults: (coachName, coachTraits) => set({ coachName, coachTraits }),
  toggleCoachTrait: (trait) =>
    set((state) => ({
      coachTraits: state.coachTraits.includes(trait)
        ? state.coachTraits.filter((item) => item !== trait)
        : [...state.coachTraits, trait],
    })),
  setMatchingConsent: (matchingConsent) => set({ matchingConsent }),
  reset: () => set(initialState),
}));
