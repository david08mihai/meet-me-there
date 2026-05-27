import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

type AccountType = 'personal' | 'business';

type LocalAccount = {
  id: string;
  email: string;
  password: string;
  accountType: AccountType;
  displayName: string;
  phone: string;
  createdAt: string;
};

const ACCOUNTS_KEY = 'meet-me-there:local-accounts';
const SESSION_KEY = 'meet-me-there:local-session';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function toSupabaseUser(account: LocalAccount): User {
  return {
    id: account.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: account.email,
    email_confirmed_at: account.createdAt,
    phone: account.phone,
    created_at: account.createdAt,
    updated_at: account.createdAt,
    app_metadata: {
      provider: 'local',
      providers: ['local'],
    },
    user_metadata: {
      is_local: true,
      account_type: account.accountType,
      display_name: account.displayName,
      full_name: account.accountType === 'personal' ? account.displayName : undefined,
      business_name: account.accountType === 'business' ? account.displayName : undefined,
      phone: account.phone,
    },
  } as User;
}

async function readAccounts() {
  const raw = await storage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as LocalAccount[];
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: LocalAccount[]) {
  await storage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function isAuthNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /load failed|fetch failed|failed to fetch|network request failed|enotfound/i.test(message);
}

export function isLocalUser(user: User | null | undefined) {
  return Boolean(user?.user_metadata?.is_local);
}

export function hasSupabaseUserId(user: User | null | undefined): user is User {
  return Boolean(user?.id && UUID_PATTERN.test(user.id));
}

export async function createLocalAccount(input: {
  email: string;
  password: string;
  accountType: AccountType;
  displayName: string;
  phone: string;
}) {
  const email = input.email.trim().toLowerCase();
  const accounts = await readAccounts();
  const existing = accounts.find((account) => account.email === email);
  if (existing) throw new Error('A local account with this email already exists.');

  const account: LocalAccount = {
    id: `local-${Date.now()}`,
    email,
    password: input.password,
    accountType: input.accountType,
    displayName: input.displayName.trim() || 'Local User',
    phone: input.phone.trim(),
    createdAt: new Date().toISOString(),
  };

  await writeAccounts([...accounts, account]);
  await storage.setItem(SESSION_KEY, account.id);
  return toSupabaseUser(account);
}

export async function signInLocalAccount(emailValue: string, password: string) {
  const email = emailValue.trim().toLowerCase();
  const accounts = await readAccounts();
  const account = accounts.find((item) => item.email === email && item.password === password);
  if (!account) return null;

  await storage.setItem(SESSION_KEY, account.id);
  return toSupabaseUser(account);
}

export async function getLocalSessionUser() {
  const sessionId = await storage.getItem(SESSION_KEY);
  if (!sessionId) return null;

  const accounts = await readAccounts();
  const account = accounts.find((item) => item.id === sessionId);
  return account ? toSupabaseUser(account) : null;
}

export async function saveLocalSessionUser(user: User) {
  if (!isLocalUser(user)) return;
  await storage.setItem(SESSION_KEY, user.id);
}

export async function clearLocalSession() {
  await storage.removeItem(SESSION_KEY);
}

export async function deleteLocalAccount(userId: string) {
  const accounts = await readAccounts();
  await writeAccounts(accounts.filter((account) => account.id !== userId));
  await clearLocalSession();
}
