import {
  User,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { firebaseAuth } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
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

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        signOut,
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
