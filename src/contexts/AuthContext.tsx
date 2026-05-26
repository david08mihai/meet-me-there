import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import {
  clearLocalSession,
  deleteLocalAccount,
  getLocalSessionUser,
  isAuthNetworkError,
  isLocalUser,
  saveLocalSessionUser,
} from '../lib/localAuth';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  initializing: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setLocalSession: (user: User) => Promise<void>;
  reloadUser: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!mounted) return;

        if (error && !isAuthNetworkError(error)) {
          console.error('Error getting session:', error);
        }

        const localUser = data.session ? null : await getLocalSessionUser();

        setSession(data.session ?? null);
        setUser(data.session?.user ?? localUser);
        setInitializing(false);
      })
      .catch(async (error) => {
        if (!mounted) return;
        if (!isAuthNetworkError(error)) {
          console.error('Error getting session:', error);
        }

        const localUser = await getLocalSessionUser();
        setSession(null);
        setUser(localUser);
        setInitializing(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setInitializing(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await clearLocalSession();
    setSession(null);
    setUser(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error && !isAuthNetworkError(error)) throw error;
    } catch (error) {
      if (!isAuthNetworkError(error)) throw error;
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    if (isLocalUser(user)) {
      await deleteLocalAccount(user.id);
      setSession(null);
      setUser(null);
      setInitializing(false);
      return;
    }

    const { error } = await supabase.rpc('delete_current_user');
    if (error) throw error;

    await clearLocalSession();
    setSession(null);
    setUser(null);
    setInitializing(false);

    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError && !isAuthNetworkError(signOutError)) throw signOutError;
    } catch (error) {
      if (!isAuthNetworkError(error)) throw error;
    }
  };

  const setLocalSession = async (localUser: User) => {
    await saveLocalSessionUser(localUser);
    setSession(null);
    setUser(localUser);
    setInitializing(false);
  };

  const reloadUser = async () => {
    if (isLocalUser(user)) return;

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(data.user ?? null);
    } catch (error) {
      if (!isAuthNetworkError(error)) throw error;
    }
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;
    } catch (error) {
      if (isAuthNetworkError(error)) {
        throw new Error('Cannot reach Supabase right now. Try again after the API URL is fixed.');
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        initializing,
        signOut,
        deleteAccount,
        setLocalSession,
        reloadUser,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
