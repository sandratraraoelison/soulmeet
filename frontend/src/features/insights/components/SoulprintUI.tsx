import { Pressable, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { BackButton } from '@/components/navigation/BackButton';
import { displayValue } from '../api/soulprint.api';
import {
  INSIGHTS_COPY,
  SOULPRINT_CATEGORY_META,
  SOURCE_LABELS,
  VISIBILITY_META,
} from '../constants/soulprint.constants';
import type {
  SoulprintCategory,
  SoulprintEntry,
} from '../types/soulprint.types';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  back = true,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  rightAction?: ReactNode;
}) {
  return (
    <View className="mb-5 flex-row items-center">
      {back ? (
        <View className="mr-3"><BackButton fallbackHref="/(app)/insights" /></View>
      ) : null}
      <View className="flex-1">
        <Text
          accessibilityRole="header"
          className="font-display text-3xl font-bold text-ink"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-muted">{subtitle}</Text>
        ) : null}
      </View>
      {rightAction}
    </View>
  );
}

export function ProgressCard({ value }: { value: number }) {
  const progress = Math.max(0, Math.min(100, value || 0));
  return (
    <View className="rounded-3xl border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Text className="font-label text-base font-bold text-ink">
          {INSIGHTS_COPY.completeness}
        </Text>
        <Text className="font-label text-lg font-bold text-secondary">
          {Math.round(progress)}%
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-raised"
      >
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress}%` }}
        />
      </View>
      <Text className="mt-3 text-sm leading-5 text-muted">
        {INSIGHTS_COPY.completenessHint}
      </Text>
    </View>
  );
}

export function ExtractionStatusCard({ status, attempts }: { status: 'PENDING' | 'RUNNING' | 'FAILED'; attempts: number }) {
  const failed = status === 'FAILED';
  const title = failed ? 'Soulprint update paused' : status === 'RUNNING' ? 'Reflecting on your conversation' : 'Soulprint update queued';
  const detail = failed
    ? 'We could not analyze the latest message. It will be retried when you continue the conversation.'
    : attempts > 1
      ? `Trying again safely · attempt ${attempts}`
      : 'New insights will appear here automatically.';
  return (
    <View className={`mb-4 rounded-2xl border p-4 ${failed ? 'border-danger/30 bg-danger/10' : 'border-primary/30 bg-primary/10'}`}>
      <View className="flex-row items-center">
        <View className={`mr-3 h-2.5 w-2.5 rounded-full ${failed ? 'bg-danger' : 'bg-primary'}`} />
        <View className="flex-1">
          <Text className={`font-label text-sm font-bold ${failed ? 'text-danger' : 'text-primary'}`}>{title}</Text>
          <Text className="mt-1 text-xs leading-5 text-muted">{detail}</Text>
        </View>
      </View>
    </View>
  );
}

const SUMMARY_SECTION_LABELS: Record<string, string> = {
  personality: 'Personality',
  coreValues: 'Core values',
  interests: 'Interests',
  relationshipGoals: 'Relationship goals',
  communicationStyle: 'Communication',
  emotionalNeeds: 'Emotional needs',
  boundaries: 'Boundaries',
  strengths: 'Strengths',
  challenges: 'Challenges',
  partnerPreferences: 'Partner preferences',
};

function summaryRecord(summary: unknown) {
  // API data is deliberately typed as unknown because legacy Soulprints may
  // still contain a plain string instead of the current structured object.
  return summary && typeof summary === 'object' && !Array.isArray(summary)
    ? summary as Record<string, unknown>
    : undefined;
}

function conciseValue(value: unknown) {
  // Keep stored values intact while making third-person extraction language
  // feel natural in a first-person user interface.
  return displayValue(value)
    .replace(/^the user likes /i, 'Enjoys ')
    .replace(/^the user values /i, 'Values ')
    .replace(/^the user /i, '')
    .replace(/\.$/, '');
}

export function SummaryCard({ summary }: { summary: unknown }) {
  const record = summaryRecord(summary);
  const overview = typeof record?.overview === 'string'
    ? record.overview
    : typeof summary === 'string'
      ? summary
      : '';
  const sections = record
    ? Object.entries(SUMMARY_SECTION_LABELS)
        .map(([key, label]) => ({
          key,
          label,
          values: Array.isArray(record[key]) ? record[key].filter(Boolean).slice(0, 2) : [],
        }))
        .filter((section) => section.values.length)
        .slice(0, 3)
    : [];

  return (
    <View className="mt-4 overflow-hidden rounded-3xl border border-primary/25 bg-surface">
      <View className="h-1 bg-primary" />
      <View className="p-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Text className="text-lg text-primary">✦</Text>
            </View>
            <View>
              <Text className="font-label text-lg font-bold text-ink">{INSIGHTS_COPY.summary}</Text>
              <Text className="mt-0.5 text-xs text-muted">A portrait that grows with you</Text>
            </View>
          </View>
          <View className="rounded-full bg-secondary/10 px-3 py-1">
            <Text className="font-label text-[10px] font-bold uppercase tracking-wider text-secondary">Living</Text>
          </View>
        </View>

        <Text className="mt-5 text-base leading-7 text-ink">
          {overview || INSIGHTS_COPY.empty}
        </Text>

        {sections.length ? (
          <View className="mt-5 border-t border-border pt-4">
            <Text className="mb-3 font-label text-xs font-bold uppercase tracking-widest text-muted">Highlights</Text>
            {sections.map((section) => (
              <View key={section.key} className="mb-3 flex-row items-start">
                <View className="mr-3 mt-2 h-1.5 w-1.5 rounded-full bg-secondary" />
                <View className="flex-1">
                  <Text className="font-label text-xs font-bold uppercase tracking-wider text-secondary">{section.label}</Text>
                  <Text className="mt-1 text-sm leading-5 text-muted">{section.values.map(conciseValue).join(' · ')}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function CategoryCard({
  category,
  count,
}: {
  category: SoulprintCategory;
  count: number;
}) {
  const meta = SOULPRINT_CATEGORY_META[category];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/(app)/insights/category/[category]',
          params: { category },
        })
      }
      className="mb-3 w-[48%] rounded-2xl border border-border bg-surface p-4 active:opacity-75"
    >
      <Text className="text-2xl text-secondary">{meta.icon}</Text>
      <Text className="mt-3 font-label font-bold text-ink">{meta.label}</Text>
      <Text className="mt-1 text-xs text-muted">
        {count} {count === 1 ? 'detail' : 'details'}
      </Text>
    </Pressable>
  );
}

export function EntryCard({
  entry,
  onPress,
  actions,
}: {
  entry: SoulprintEntry;
  onPress?: () => void;
  actions?: React.ReactNode;
}) {
  const meta = SOULPRINT_CATEGORY_META[entry.category];
  // Freshness is derived client-side from persisted observation timestamps;
  // it is informational and never changes the entry's authority or status.
  const observedAt = entry.lastObservedAt ?? entry.updatedAt;
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(observedAt).getTime()) / 86_400_000));
  const freshness = ageDays < 30 ? 'Recently observed' : ageDays < 180 ? 'Observed in recent months' : 'May need reconfirmation';
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      className="mb-3 rounded-2xl border border-border bg-surface p-4"
    >
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-secondary">
            {meta.label}
          </Text>
          {entry.key ? (
            <Text className="mt-2 font-label text-sm font-bold text-muted">
              {entry.key}
            </Text>
          ) : null}
          <Text className="mt-1 text-base leading-6 text-ink">
            {displayValue(entry.value)}
          </Text>
        </View>
        <Text className="text-xl text-secondary">{meta.icon}</Text>
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <View className="min-h-7 flex-row items-center rounded-full border border-border bg-surface-raised px-3 py-1">
          <View className="mr-2 h-1.5 w-1.5 rounded-full bg-secondary" />
          <Text className="font-label text-xs font-medium text-ink">
            {SOURCE_LABELS[entry.source]}
          </Text>
        </View>
        <View className="min-h-7 flex-row items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
          <View className="mr-2 h-1.5 w-1.5 rounded-full bg-primary" />
          <Text className="font-label text-xs font-medium text-primary">
            {VISIBILITY_META[entry.visibility].label}
          </Text>
        </View>
      </View>
      <Text className="mt-3 text-xs text-muted">{freshness}</Text>
      {actions ? (
        <View className="mt-4 flex-row gap-2 border-t border-border pt-3">
          {actions}
        </View>
      ) : null}
    </Pressable>
  );
}

export function InferenceReviewCard({
  entry,
  onConfirm,
  onDismiss,
  onCorrect,
  confirming = false,
  dismissing = false,
}: {
  entry: SoulprintEntry;
  onConfirm: () => void;
  onDismiss: () => void;
  onCorrect: (value: string) => void;
  confirming?: boolean;
  dismissing?: boolean;
}) {
  const meta = SOULPRINT_CATEGORY_META[entry.category];
  const busy = confirming || dismissing;
  // A correction is submitted through the confirmation endpoint so the server
  // records one atomic USER_CORRECTED_CONFIRMED audit event.
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState(displayValue(entry.value));
  const evidenceCount = entry.evidence?.length ?? 0;
  return (
    <View className="overflow-hidden rounded-3xl border border-secondary/30 bg-surface">
      <View className="h-1 bg-secondary" />
      <View className="p-6">
        <View className="flex-row items-start">
          <View className="mr-4 h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15">
            <Text className="font-label text-lg font-bold text-secondary">?</Text>
          </View>
          <View className="flex-1">
            <Text className="font-display text-2xl font-bold leading-8 text-secondary">Can I tell you something?</Text>
            <Text className="mt-2 font-label text-xs font-bold uppercase tracking-widest text-muted">{meta.label}</Text>
          </View>
        </View>

        <Text className="mt-6 text-base leading-7 text-ink">
          I&apos;ve been reflecting on our conversation. I noticed something that might be true for you:
        </Text>
        <View className="mt-4 rounded-2xl bg-surface-raised p-4">
          <Text className="text-base font-medium leading-7 text-ink">{displayValue(entry.value)}</Text>
        </View>
        <Text className="mt-3 text-xs leading-5 text-muted">
          Suggested from {evidenceCount || 'one or more'} of your Guidance messages. This remains tentative until you confirm it.
        </Text>
        <Text className="mt-5 text-base italic leading-7 text-muted">Does this resonate with you?</Text>

        {editing ? (
          <View className="mt-4">
            <TextInput
              accessibilityLabel="Correct this suggestion"
              multiline
              value={correction}
              onChangeText={setCorrection}
              maxLength={2000}
              className="min-h-24 rounded-2xl border border-border bg-surface-raised p-4 text-base text-ink"
            />
            <Pressable accessibilityRole="button" disabled={busy || !correction.trim()} onPress={() => onCorrect(correction.trim())} className="mt-3 min-h-12 items-center justify-center rounded-2xl bg-primary px-5">
              <Text className="font-label font-bold text-canvas">Save my correction</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onConfirm}
          className={`mt-6 min-h-14 items-center justify-center rounded-2xl bg-primary px-5 ${busy ? 'opacity-60' : 'active:opacity-80'}`}
        >
          <Text className="font-label text-base font-bold text-canvas">{confirming ? 'Confirming…' : 'Yes, that feels right'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setEditing((value) => !value)} className="mt-3 min-h-12 items-center justify-center px-5">
          <Text className="font-label text-base font-bold text-primary">{editing ? 'Cancel correction' : 'Not quite — let me correct it'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onDismiss}
          className={`mt-3 min-h-14 items-center justify-center rounded-2xl border border-border bg-surface-raised px-5 ${busy ? 'opacity-60' : 'active:opacity-80'}`}
        >
          <Text className="font-label text-base font-bold text-muted">{dismissing ? 'Dismissing…' : 'No, that’s not me'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function StateCard({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center rounded-3xl border border-border bg-surface p-7">
      <Text className="text-center text-base leading-6 text-muted">
        {message}
      </Text>
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}

export function SmallAction({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-10 flex-1 items-center justify-center rounded-xl bg-surface-raised px-3"
    >
      <Text
        className={`font-label text-sm font-bold ${danger ? 'text-danger' : 'text-primary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
