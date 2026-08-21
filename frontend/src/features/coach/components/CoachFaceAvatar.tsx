import { Image, View } from 'react-native';
import { coachFace } from '../coach-faces';

const faceSheet = require('../../../../assets/coaches/coach-faces-v2.png');

export function CoachFaceAvatar({ appearance, size = 64 }: { appearance?: string | null; name: string; size?: number }) {
  const face = coachFace(appearance);
  const column = face.index % 4;
  const row = Math.floor(face.index / 4);
  return (
    <View accessibilityLabel={`${face.title} coach face`} style={{ width: size, height: size, borderRadius: size / 2 }} className="overflow-hidden bg-[#100B1F]">
      <Image source={faceSheet} resizeMode="stretch" style={{ position: 'absolute', left: -column * size, top: -row * size, width: size * 4, height: size * 4 }} />
    </View>
  );
}
