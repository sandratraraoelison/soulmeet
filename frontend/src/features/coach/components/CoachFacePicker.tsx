import { Image, Text, useWindowDimensions, View } from 'react-native';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { coachFace, COACH_FACE_IMAGES, COACH_FACES } from '../coach-faces';
const genderLabel = { MALE: 'Male', FEMALE: 'Female', NON_GENDERED: 'Any' } as const;

export function CoachFacePicker({ value, onChange, compact = false }: {
  value?: string | null;
  onChange: (appearance: string, gender: (typeof COACH_FACES)[number]['gender']) => void;
  compact?: boolean;
}) {
  const { width } = useWindowDimensions();
  const selectedFace = coachFace(value);
  const pickerWidth = Math.min(width - (compact ? 80 : 40), 620);
  const gap = 8;
  const tileSize = (pickerWidth - gap * 3) / 4;

  return (
    <View>
      <View className="flex-row items-end justify-between">
        <Text className="font-label text-sm font-semibold text-ink">Coach appearance</Text>
        <Text className="text-xs font-bold text-secondary">{selectedFace.title}</Text>
      </View>
      <Text className="mt-1 text-xs leading-5 text-muted">Choose the face that feels easiest to talk to.</Text>
      <View style={{ width: pickerWidth, gap }} className="mt-3 self-center flex-row flex-wrap">
        {COACH_FACES.map((face) => {
          const active = selectedFace.id === face.id;
          return (
            <MotionPressable
              pressedScale={0.97}
              key={face.id}
              accessibilityRole="radio"
              accessibilityLabel={`${face.title}, ${face.description}`}
              accessibilityState={{ checked: active }}
              onPress={() => onChange(face.id, face.gender)}
              style={{ width: tileSize, height: tileSize, borderRadius: 14 }}
              className="relative overflow-hidden bg-[#100B1F]"
            >
              <Image source={COACH_FACE_IMAGES[face.id]} resizeMode="cover" style={{ width: tileSize, height: tileSize }} />
              {active ? <View pointerEvents="none" className="absolute inset-0 rounded-[14px] border-[3px] border-secondary" /> : null}
              {active ? <View className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-secondary"><Text className="font-bold text-canvas">✓</Text></View> : null}
            </MotionPressable>
          );
        })}
      </View>
      <View className="mt-3 rounded-xl border border-border bg-surface-raised px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-ink">{selectedFace.name} · {selectedFace.title}</Text>
          <Text className="text-[11px] font-bold uppercase tracking-wider text-secondary">{selectedFace.category}</Text>
        </View>
        <Text className="mt-1 text-xs leading-5 text-muted">{selectedFace.description}</Text>
        <Text className="mt-2 text-[11px] font-bold uppercase tracking-wider text-secondary">{genderLabel[selectedFace.gender]}</Text>
      </View>
    </View>
  );
}
