import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import { getErrorMessage } from '@/api/client';
import { useThemePalette } from '@/store/theme.store';
import { Button } from '@/components/common/Button';
import { AccountButton } from '@/components/navigation/AccountButton';
import { motionPanelEntering } from '@/lib/motion';
import {
  ActivityList,
  GrowthGoalCard,
  TodayExerciseCard,
} from '@/features/growth/components/GrowthUI';
import {
  useArchiveGrowthGoal,
  useAcceptGrowthGoal,
  useCompleteGrowthExercise,
  useCreateGrowthGoal,
  useEnrollGrowthPath,
  useGrowth,
  useGrowthCheckIn,
  useUpdateGrowthProgress,
} from '@/features/growth/hooks/use-growth';

export default function GrowthScreen() {
  const { colors } = useThemePalette();
  const query = useGrowth();
  const createGoal = useCreateGrowthGoal();
  const progress = useUpdateGrowthProgress();
  const archive = useArchiveGrowthGoal();
  const acceptGoal = useAcceptGrowthGoal();
  const enrollPath = useEnrollGrowthPath();
  const completeExercise = useCompleteGrowthExercise();
  const checkIn = useGrowthCheckIn();
  const [goalOpen, setGoalOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState(3);
  const [reflection, setReflection] = useState('');
  const fail = (error: unknown) =>
    Alert.alert('Unable to update Growth', getErrorMessage(error));
  const data = query.data;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor="#6366F1"
          />
        }
      >
        <View className="mt-3 flex-row items-center justify-between"><Text className="font-display text-4xl font-bold text-ink">Growth</Text><AccountButton /></View>
        <Text className="mt-2 text-base text-muted">
          Small steps, meaningful change.
        </Text>
        {query.isLoading ? (
          <ActivityIndicator className="mt-16" color="#6366F1" />
        ) : query.isError ? (
          <View className="mt-8">
            <Text className="mb-4 text-center text-danger">
              {getErrorMessage(query.error)}
            </Text>
            <Button label="Try again" onPress={() => query.refetch()} />
          </View>
        ) : data ? (
          <>
            <View className="mb-3 mt-8 flex-row items-center justify-between">
              <Text className="font-label text-xl font-bold text-ink">
                Current focus
              </Text>
              <Pressable disabled={data.activeGoals.length >= 3} onPress={() => setGoalOpen(true)}>
                <Text className="font-label text-sm font-bold text-primary">
                  {data.activeGoals.length >= 3 ? '3 active maximum' : '+ Add goal'}
                </Text>
              </Pressable>
            </View>
            {data.activeGoals.length ? (
              data.activeGoals.map((goal) => (
                <GrowthGoalCard
                  key={goal.id}
                  goal={goal}
                  loading={progress.isPending}
                  onStep={() =>
                    progress.mutate(
                      { id: goal.id, completedSteps: goal.completedSteps + 1, version: goal.version },
                      { onError: fail },
                    )
                  }
                  onArchive={() => Alert.alert('Archive this goal?', 'You can keep its progress in your history.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Archive', style: 'destructive', onPress: () => archive.mutate(goal.id, { onError: fail }) },
                  ])}
                />
              ))
            ) : (
              <View className="mb-4 rounded-3xl border border-dashed border-border p-6">
                <Text className="text-center text-sm leading-6 text-muted">
                  Choose one gentle goal to turn insight into action.
                </Text>
              </View>
            )}
            {data.suggestedGoals.length ? (
              <View className="mt-4">
                <Text className="mb-3 font-label text-xl font-bold text-ink">Suggested for you</Text>
                {data.suggestedGoals.map((goal) => (
                  <View key={goal.id} className="mb-3 rounded-3xl border border-secondary/30 bg-surface p-5">
                    <Text className="font-label text-lg font-bold text-ink">{goal.title}</Text>
                    <Text className="mt-2 text-sm leading-5 text-muted">{goal.description}</Text>
                    <Text className="mt-3 text-xs text-muted">Based on a confirmed Soulprint insight. You stay in control.</Text>
                    <View className="mt-4 flex-row gap-3">
                      <Pressable className="flex-1 items-center rounded-xl border border-border py-3" onPress={() => archive.mutate(goal.id, { onError: fail })}><Text className="font-bold text-muted">Not now</Text></Pressable>
                      <Pressable className="flex-1 items-center rounded-xl bg-secondary py-3" onPress={() => acceptGoal.mutate(goal.id, { onError: fail })}><Text className="font-bold text-canvas">Accept</Text></Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            <View className="mt-4">
              <TodayExerciseCard
                exercise={data.todayExercise}
                loading={completeExercise.isPending}
                onComplete={() =>
                  completeExercise.mutate(data.todayExercise.id, {
                    onError: fail,
                  })
                }
              />
            </View>
            <View className="mb-3 mt-8 flex-row items-center justify-between">
              <Text className="font-label text-xl font-bold text-ink">
                Weekly check-in
              </Text>
              <Pressable onPress={() => setCheckInOpen(true)}>
                <Text className="font-label text-sm font-bold text-primary">
                  {data.weeklyCheckIn ? 'Update' : 'Check in'}
                </Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => setCheckInOpen(true)}
              className="rounded-3xl border border-border bg-surface p-5"
            >
              <Text className="text-base font-bold text-ink">
                {data.weeklyCheckIn
                  ? `This week feels like ${data.weeklyCheckIn.mood}/5`
                  : 'How did you feel this week?'}
              </Text>
              <Text className="mt-2 text-sm text-muted">
                {data.weeklyCheckIn?.reflection ||
                  'Take a quiet moment to notice your progress and challenges.'}
              </Text>
            </Pressable>
            <Text className="mb-3 mt-8 font-label text-xl font-bold text-ink">
              Recent progress
            </Text>
            <ActivityList activity={data.recentActivity} />
            {data.streak ? <Text className="mt-5 text-center text-sm text-muted">Gentle streak: {data.streak} day{data.streak > 1 ? 's' : ''}. Missing a day is okay.</Text> : null}
            <Text className="mb-3 mt-8 font-label text-xl font-bold text-ink">Guided paths</Text>
            {data.paths.map((path) => (
              <View key={path.key} className="mb-3 rounded-3xl border border-border bg-surface p-5">
                <Text className="font-label text-lg font-bold text-ink">{path.title}</Text>
                <Text className="mt-2 text-sm leading-5 text-muted">{path.description}</Text>
                <Pressable disabled={Boolean(path.enrollment)} onPress={() => enrollPath.mutate(path.key, { onError: fail })} className="mt-4 self-start rounded-xl bg-primary px-4 py-2">
                  <Text className="font-bold text-white">{path.enrollment ? `${path.enrollment.completedUnits}/${path.enrollment.totalUnits} completed` : 'Start path'}</Text>
                </Pressable>
              </View>
            ))}
            {data.moodTrend.length ? (
              <View className="mt-5 rounded-3xl border border-border bg-surface p-5">
                <Text className="font-label text-lg font-bold text-ink">Mood trend</Text>
                <View className="mt-5 h-28 flex-row items-end gap-2">
                  {data.moodTrend.map((item) => <View key={item.id} className="flex-1 rounded-t-md bg-primary" style={{ height: `${item.mood * 20}%` }} />)}
                </View>
                <Text className="mt-3 text-xs text-muted">A private view of your recent weekly check-ins.</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <Modal
        visible={goalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalOpen(false)}
      >
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <View className="flex-1 justify-end bg-black/60">
          <Animated.View entering={motionPanelEntering} className="rounded-t-3xl bg-surface p-5">
            <Text className="font-display text-2xl font-bold text-ink">
              Add a growth goal
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="For example: Feel calmer before dates"
              placeholderTextColor="#9494A3"
              style={{ color: colors.ink }}
              className="mt-5 min-h-14 rounded-2xl border border-border bg-surface-raised px-4 text-base"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Why does this matter to you? (optional)"
              placeholderTextColor="#9494A3"
              style={{ color: colors.ink }}
              textAlignVertical="top"
              className="mt-3 min-h-24 rounded-2xl border border-border bg-surface-raised p-4 text-base"
            />
            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <Button
                  variant="secondary"
                  label="Cancel"
                  onPress={() => setGoalOpen(false)}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Create goal"
                  disabled={title.trim().length < 2}
                  loading={createGoal.isPending}
                  onPress={() =>
                    createGoal.mutate(
                      {
                        title: title.trim(),
                        description: description.trim() || undefined,
                      },
                      {
                        onSuccess: () => {
                          setGoalOpen(false);
                          setTitle('');
                          setDescription('');
                        },
                        onError: fail,
                      },
                    )
                  }
                />
              </View>
            </View>
          </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={checkInOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCheckInOpen(false)}
      >
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <View className="flex-1 justify-end bg-black/60">
          <Animated.View entering={motionPanelEntering} className="rounded-t-3xl bg-surface p-5">
            <Text className="font-display text-2xl font-bold text-ink">
              Weekly check-in
            </Text>
            <Text className="mt-2 text-sm text-muted">
              How did you feel socially this week?
            </Text>
            <View className="my-5 flex-row justify-between">
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMood(value)}
                  className={`h-12 w-12 items-center justify-center rounded-full border ${mood === value ? 'border-primary bg-primary' : 'border-border bg-surface-raised'}`}
                >
                  <Text
                    className={`font-bold ${mood === value ? 'text-white' : 'text-muted'}`}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={reflection}
              onChangeText={setReflection}
              multiline
              placeholder="What helped or felt difficult?"
              placeholderTextColor="#9494A3"
              style={{ color: colors.ink }}
              textAlignVertical="top"
              className="min-h-24 rounded-2xl border border-border bg-surface-raised p-4 text-base"
            />
            <View className="mt-5">
              <Button
                label="Save check-in"
                loading={checkIn.isPending}
                onPress={() =>
                  checkIn.mutate(
                    { mood, reflection: reflection.trim() || undefined },
                    { onSuccess: () => setCheckInOpen(false), onError: fail },
                  )
                }
              />
            </View>
          </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
