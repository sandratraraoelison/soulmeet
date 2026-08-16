import { Image, Text, useWindowDimensions, View } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { coachFace, COACH_FACES } from '../coach-faces';

const faceSheet = require('../../../../assets/coaches/coach-faces-v1.png');
const genderLabel = {
  MALE: 'Male',
  FEMALE: 'Female',
  NON_GENDERED: 'Non-gendered',
} as const;

export function CoachFacePicker({
  value,
  onChange,
  compact = false,
}: {
  value?: string | null;
  onChange: (
    appearance: string,
    gender: (typeof COACH_FACES)[number]['gender'],
  ) => void;
  compact?: boolean;
}) {
  const { width } = useWindowDimensions();
  const selected = value ?? 'neutral-ai';
  const selectedFace = coachFace(selected)!;
  const pickerWidth = Math.min(width - (compact ? 80 : 40), 620);
  const pickerHeight = pickerWidth / 2;
  return (
    <View>
      <View className="flex-row items-end justify-between">
        <Text className="font-label text-sm font-semibold text-ink">
          Coach appearance
        </Text>
        <Text className="text-xs font-bold text-secondary">
          {selectedFace.title} · {genderLabel[selectedFace.gender]}
        </Text>
      </View>
      <Text className="mt-1 text-xs leading-5 text-muted">
        Tap a portrait to change your coach.
      </Text>
      <View
        style={{ width: pickerWidth, height: pickerHeight }}
        className="mt-3 self-center overflow-hidden rounded-2xl border border-border bg-[#100B1F]"
      >
        <Image
          source={faceSheet}
          resizeMode="stretch"
          className="absolute inset-0 h-full w-full"
        />
        <View className="absolute inset-0 flex-row">
          {COACH_FACES.map((face) => {
            const active = selected === face.id;
            return (
              <MotionPressable
                pressedScale={0.99}
                key={face.id}
                accessibilityRole="radio"
                accessibilityLabel={`${face.title}, ${genderLabel[face.gender]}`}
                accessibilityState={{ checked: active }}
                onPress={() => onChange(face.id, face.gender)}
                className="relative flex-1 border-r border-white/10"
              >
                {active ? (
                  <View
                    pointerEvents="none"
                    className="absolute z-10 border-[3px] border-secondary"
                    style={{
                      top: 2,
                      right: 2,
                      bottom: 2,
                      left: 2,
                      borderRadius: 13,
                    }}
                  />
                ) : null}
                {active ? (
                  <View className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-secondary">
                    <Text className="font-bold text-canvas">✓</Text>
                  </View>
                ) : null}
              </MotionPressable>
            );
          })}
        </View>
      </View>
      {compact ? (
        <View className="mt-3 rounded-xl border border-border bg-surface-raised px-4 py-3">
          <Text className="text-sm font-bold text-ink">
            {selectedFace.title}
          </Text>
          <Text className="mt-1 text-xs text-muted">
            {selectedFace.description}
          </Text>
          <Text className="mt-2 text-[11px] font-bold uppercase tracking-wider text-secondary">
            Gender · {genderLabel[selectedFace.gender]}
          </Text>
        </View>
      ) : (
        <View className="mt-3 flex-row">
          {COACH_FACES.map((face) => (
            <View key={face.id} className="flex-1 px-1">
              <Text
                className={`text-center text-[10px] font-bold ${selected === face.id ? 'text-secondary' : 'text-muted'}`}
              >
                {face.title}
              </Text>
              <Text className="mt-1 text-center text-[9px] text-muted">
                {genderLabel[face.gender]}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
