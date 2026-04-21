import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

export type SignUpErrorCode = 'email-already-in-use' | 'unknown';

export class SignUpError extends Error {
  code: SignUpErrorCode;
  constructor(code: SignUpErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type SignInErrorCode =
  | 'invalid-credentials'
  | 'too-many-attempts'
  | 'user-disabled'
  | 'email-not-verified'
  | 'unknown';

export class SignInError extends Error {
  code: SignInErrorCode;
  constructor(code: SignInErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type SignUpInput = {
  email: string;
  password: string;
  displayName?: string;
  photoURL?: string;
};

type SignInInput = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  initializing: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  resendVerificationFor: (input: SignInInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('Error getting session:', error);
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const reloadUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    setUser(data.user ?? null);
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });

    if (error) throw error;
  };

  // Resend the verification email for a user who is not currently signed in.
  // Re-authenticates briefly with email/password, sends the email, then signs out.
  const resendVerificationFor = async ({ email, password }: SignInInput) => {
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await sendEmailVerification(credential.user);
    } finally {
      if (firebaseAuth.currentUser) {
        await firebaseSignOut(firebaseAuth);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        initializing,
        signUp,
        signIn,
        signOut,
        reloadUser,
        resendVerificationEmail,
        resendVerificationFor,
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