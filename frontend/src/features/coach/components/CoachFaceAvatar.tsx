import { Image, View } from 'react-native';
import { coachFace } from '../coach-faces';

const faceSheet = require('../../../../assets/coaches/coach-faces-v1.png');

export function CoachFaceAvatar({
  appearance,
  size = 64,
}: {
  appearance?: string | null;
  name: string;
  size?: number;
}) {
  const face = coachFace(appearance);
  if (!face) return null;
  return (
    <View
      accessibilityLabel={`${face.title} coach face`}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="overflow-hidden bg-[#100B1F]"
    >
      <Image
        source={faceSheet}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: -face.index * size,
          top: -size / 2,
          width: size * 4,
          height: size * 2,
        }}
      />
    </View>
  );
}
