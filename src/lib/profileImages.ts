import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from './supabase';

function isRemoteImage(uri: string | null) {
  return Boolean(uri && /^https?:\/\//i.test(uri));
}

export async function uploadProfileImage(uri: string | null, userId: string) {
  if (!uri || isRemoteImage(uri)) return uri;

  const cleanUri = uri.split('?')[0];
  const rawExt = cleanUri.split('.').pop()?.toLowerCase();
  const fileExt = rawExt === 'png' ? 'png' : 'jpg';
  const filePath = `profiles/${userId}/${Date.now()}.${fileExt}`;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from('profile-images')
    .upload(filePath, decode(base64), {
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('profile-images').getPublicUrl(filePath);

  return data.publicUrl;
}
