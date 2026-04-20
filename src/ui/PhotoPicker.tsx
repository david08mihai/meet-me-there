import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from './theme';

const ACCEPTED = /\.(jpg|jpeg|png)$/i;

type Props = {
  value: string | null;
  onChange: (uri: string | null) => void;
  shape?: 'circle' | 'square';
  placeholderLabel?: string;
};

export function PhotoPicker({
  value,
  onChange,
  shape = 'circle',
  placeholderLabel = 'Add photo',
}: Props) {
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    try {
      setLoading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to upload an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const name = asset.fileName ?? asset.uri;
      const mime = asset.mimeType ?? '';
      const validMime = /^image\/(jpeg|png)$/i.test(mime);
      const validExt = ACCEPTED.test(name);
      if (!validMime && !validExt) {
        Alert.alert('Invalid image', 'Accepted formats: JPG, JPEG, PNG.');
        return;
      }
      onChange(asset.uri);
    } finally {
      setLoading(false);
    }
  };

  const shapeStyle = shape === 'circle' ? styles.circle : styles.square;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={pick}
        disabled={loading}
        style={({ pressed }) => [styles.frame, shapeStyle, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        {value ? (
          <Image source={{ uri: value }} style={[styles.image, shapeStyle]} />
        ) : (
          <Text style={styles.placeholder}>{loading ? 'Loading…' : placeholderLabel}</Text>
        )}
      </Pressable>
      {value ? (
        <Pressable onPress={() => onChange(null)}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const SIZE = 96;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: theme.spacing.sm },
  frame: {
    width: SIZE,
    height: SIZE,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle: { borderRadius: SIZE / 2 },
  square: { borderRadius: theme.radius.md },
  pressed: { opacity: 0.8 },
  image: { width: SIZE, height: SIZE },
  placeholder: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  remove: { color: theme.colors.error, fontSize: theme.fontSize.sm },
});
