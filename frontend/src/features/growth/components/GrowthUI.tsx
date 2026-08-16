import { Text, View } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
import type {
  GrowthActivity,
  GrowthExercise,
  GrowthGoal,
} from '../types/growth.types';

export function GrowthGoalCard({
  goal,
  onStep,
  onArchive,
  loading,
}: {
  goal: GrowthGoal;
  onStep: () => void;
  onArchive: () => void;
  loading: boolean;
}) {
  const progress = Math.round((goal.completedSteps / goal.targetSteps) * 100);
  return (
    <View className="mb-3 rounded-3xl border border-border bg-surface p-5">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-label text-lg font-bold text-ink">
            {goal.title}
          </Text>
          {goal.description ? (
            <Text className="mt-2 text-sm leading-5 text-muted">
              {goal.description}
            </Text>
          ) : null}
        </View>
        <Text className="font-label text-sm font-bold text-primary">
          {progress}%
        </Text>
      </View>
      <View className="mt-4 h-2 overflow-hidden rounded-full bg-surface-raised">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress}%` }}
        />
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-xs text-muted">
          {goal.completedSteps} of {goal.targetSteps} steps
        </Text>
        <View className="flex-row gap-2">
          <MotionPressable onPress={onArchive} className="rounded-xl px-3 py-2">
            <Text className="text-xs font-bold text-muted">Archive</Text>
          </MotionPressable>
          <MotionPressable
            disabled={loading}
            onPress={onStep}
            className="rounded-xl bg-primary px-4 py-2 active:opacity-80"
          >
            <Text className="text-xs font-bold text-white">
              Complete a step
            </Text>
          </MotionPressable>
        </View>
      </View>
    </View>
  );
}

export function TodayExerciseCard({
  exercise,
  onComplete,
  loading,
}: {
  exercise: GrowthExercise;
  onComplete: () => void;
  loading: boolean;
}) {
  const done = Boolean(exercise.completedAt);
  return (
    <View className="overflow-hidden rounded-3xl border border-secondary/30 bg-surface">
      <View className="h-1 bg-secondary" />
      <View className="p-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-label text-xs font-bold uppercase tracking-widest text-secondary">
            Today’s exercise
          </Text>
          <Text className="text-xs text-muted">{exercise.durationMin} min</Text>
        </View>
        <Text className="mt-4 font-display text-2xl font-bold text-ink">
          {exercise.title}
        </Text>
        <Text className="mt-3 text-sm leading-6 text-muted">
          {exercise.description}
        </Text>
        <MotionPressable
          disabled={done || loading}
          onPress={onComplete}
          className={`mt-5 min-h-12 items-center justify-center rounded-2xl ${done ? 'bg-surface-raised' : 'bg-secondary active:opacity-80'}`}
        >
          <Text
            className={`font-label font-bold ${done ? 'text-secondary' : 'text-canvas'}`}
          >
            {done
              ? 'Completed today'
              : loading
                ? 'Saving…'
                : 'Mark as complete'}
          </Text>
        </MotionPressable>
      </View>
    </View>
  );
}

export function ActivityList({ activity }: { activity: GrowthActivity[] }) {
  return (
    <View className="rounded-3xl border border-border bg-surface px-5 py-2">
      {activity.length ? (
        activity.map((item, index) => (
          <View
            key={item.id}
            className={`flex-row items-center py-4 ${index ? 'border-t border-border' : ''}`}
          >
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Text className="text-primary">✓</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-ink">{item.title}</Text>
              <Text className="mt-1 text-xs text-muted">
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text className="py-6 text-center text-sm text-muted">
          Your completed steps will appear here.
        </Text>
      )}
    </View>
  );
}
