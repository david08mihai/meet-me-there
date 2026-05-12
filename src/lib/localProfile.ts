import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PROFILE_EDIT_KEY = 'meet-me-there:profile-edit';

export type LocalProfileEdit = {
  displayName: string;
  location: string;
  bio: string;
  savedAt: string;
};

const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

export async function getLocalProfileEdit() {
  const raw = await storage.getItem(PROFILE_EDIT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalProfileEdit;
  } catch {
    return null;
  }
}

export async function saveLocalProfileEdit(input: Omit<LocalProfileEdit, 'savedAt'>) {
  const profile: LocalProfileEdit = {
    displayName: input.displayName.trim(),
    location: input.location.trim(),
    bio: input.bio.trim(),
    savedAt: new Date().toISOString(),
  };

  await storage.setItem(PROFILE_EDIT_KEY, JSON.stringify(profile));
  return profile;
}

export async function clearLocalProfileEdit() {
  await storage.removeItem(PROFILE_EDIT_KEY);
}
