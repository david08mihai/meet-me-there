import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { firebaseAuth } from '../lib/firebase';

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
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async ({ email, password, displayName, photoURL }: SignUpInput) => {
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (displayName || photoURL) {
        await updateProfile(credential.user, {
          displayName: displayName?.trim() || null,
          photoURL: photoURL || null,
        });
      }
      await sendEmailVerification(credential.user);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        throw new SignUpError('email-already-in-use', 'An account with this email already exists');
      }
      throw new SignUpError('unknown', 'Something went wrong. Please try again');
    }
  };

  const signIn = async ({ email, password }: SignInInput) => {
    let credential;
    try {
      credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        throw new SignInError('invalid-credentials', 'Invalid email or password');
      }
      if (code === 'auth/too-many-requests') {
        throw new SignInError(
          'too-many-attempts',
          'Too many login attempts. Please try again in 15 minutes',
        );
      }
      if (code === 'auth/user-disabled') {
        throw new SignInError(
          'user-disabled',
          'Your account has been suspended. Please contact support',
        );
      }
      throw new SignInError('unknown', 'Something went wrong. Please try again');
    }

    if (!credential.user.emailVerified) {
      await firebaseSignOut(firebaseAuth);
      throw new SignInError('email-not-verified', 'Please verify your email before logging in');
    }
  };

  const signOut = () => firebaseSignOut(firebaseAuth);

  const reloadUser = async () => {
    const current = firebaseAuth.currentUser;
    if (!current) return;
    await reload(current);
    setUser(firebaseAuth.currentUser ? { ...firebaseAuth.currentUser } : null);
  };

  const resendVerificationEmail = async () => {
    const current = firebaseAuth.currentUser;
    if (!current) return;
    await sendEmailVerification(current);
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
