import { Image, View } from 'react-native';
import { coachFace, COACH_FACE_IMAGES } from '../coach-faces';

export function CoachFaceAvatar({ appearance, size = 64 }: { appearance?: string | null; name: string; size?: number }) {
  const face = coachFace(appearance);
  return (
    <View accessibilityLabel={`${face.title} coach face`} style={{ width: size, height: size, borderRadius: size / 2 }} className="overflow-hidden bg-[#100B1F]">
      <Image source={COACH_FACE_IMAGES[face.id]} resizeMode="cover" style={{ width: size, height: size }} />
    </View>
  );
}
