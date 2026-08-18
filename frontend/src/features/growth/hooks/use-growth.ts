import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { growthApi } from '../api/growth.api';
import type { GrowthGoal, GrowthOverview } from '../types/growth.types';

export const growthKeys = { all: ['growth'] as const, overview: () => [...growthKeys.all, 'overview'] as const };
export const useGrowth = () => useQuery({ queryKey: growthKeys.overview(), queryFn: growthApi.overview });
function useGrowthMutation<T>(mutationFn: (value: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: growthKeys.all }) });
}
export const useCreateGrowthGoal = () => useGrowthMutation(growthApi.createGoal);
export const useUpdateGrowthProgress = () => useGrowthMutation(({ id, completedSteps, version }: { id: string; completedSteps: number; version: number }) => growthApi.updateProgress(id, completedSteps, version));
export function useArchiveGrowthGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: growthApi.archiveGoal,
    onSuccess: (_result, id) => {
      client.setQueryData<GrowthOverview>(growthKeys.overview(), (data) => data ? {
        ...data,
        activeGoals: data.activeGoals.filter((goal) => goal.id !== id),
        suggestedGoals: data.suggestedGoals.filter((goal) => goal.id !== id),
      } : data);
      void client.invalidateQueries({ queryKey: growthKeys.all });
    },
  });
}
export function useAcceptGrowthGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: growthApi.acceptGoal,
    onSuccess: (accepted: GrowthGoal) => {
      client.setQueryData<GrowthOverview>(growthKeys.overview(), (data) => data ? {
        ...data,
        activeGoals: [accepted, ...data.activeGoals.filter((goal) => goal.id !== accepted.id)],
        suggestedGoals: data.suggestedGoals.filter((goal) => goal.id !== accepted.id),
      } : data);
      void client.invalidateQueries({ queryKey: growthKeys.all });
    },
  });
}
export const useCompleteGrowthExercise = () => useGrowthMutation(growthApi.completeExercise);
export const useGrowthCheckIn = () => useGrowthMutation(growthApi.checkIn);
export const useEnrollGrowthPath = () => useGrowthMutation(growthApi.enrollPath);
export const useUpdateGrowthPreferences = () => useGrowthMutation(growthApi.updatePreferences);
