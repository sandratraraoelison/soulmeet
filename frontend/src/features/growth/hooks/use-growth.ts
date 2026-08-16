import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { growthApi } from '../api/growth.api';

export const growthKeys = { all: ['growth'] as const, overview: () => [...growthKeys.all, 'overview'] as const };
export const useGrowth = () => useQuery({ queryKey: growthKeys.overview(), queryFn: growthApi.overview });
function useGrowthMutation<T>(mutationFn: (value: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: growthKeys.all }) });
}
export const useCreateGrowthGoal = () => useGrowthMutation(growthApi.createGoal);
export const useUpdateGrowthProgress = () => useGrowthMutation(({ id, completedSteps, version }: { id: string; completedSteps: number; version: number }) => growthApi.updateProgress(id, completedSteps, version));
export const useArchiveGrowthGoal = () => useGrowthMutation(growthApi.archiveGoal);
export const useAcceptGrowthGoal = () => useGrowthMutation(growthApi.acceptGoal);
export const useCompleteGrowthExercise = () => useGrowthMutation(growthApi.completeExercise);
export const useGrowthCheckIn = () => useGrowthMutation(growthApi.checkIn);
export const useEnrollGrowthPath = () => useGrowthMutation(growthApi.enrollPath);
export const useUpdateGrowthPreferences = () => useGrowthMutation(growthApi.updatePreferences);
