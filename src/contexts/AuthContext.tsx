import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, setActivePracticeHeader } from '../lib/supabase';
import { getAuthRedirectUrl } from '../lib/authRedirect';
import type { Profile } from '../types/models';

export interface SignUpMetadata {
  first_name?: string;
  last_name?: string;
  display_name?: string;
}

export interface SignUpResult {
  error: AuthError | null;
  session: Session | null;
  user: User | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  pendingAuthFlow: 'recovery' | 'invite' | null;
  clearPendingAuthFlow: () => void;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string, redirectPath?: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

function detectUrlAuthFlowType(): 'recovery' | 'invite' | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const combined = `${hash}&${search}`.toLowerCase();
  if (combined.includes('type=recovery')) return 'recovery';
  if (combined.includes('type=invite')) return 'invite';
  return null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAuthFlow, setPendingAuthFlow] = useState<'recovery' | 'invite' | null>(() =>
    detectUrlAuthFlowType()
  );

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Physenra: Error fetching user profile:', profileError.message);
        return;
      }
      setProfile(data);
    } catch (err) {
      console.error('Physenra: Unexpected error loading profile:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Physenra: Session initialization error:', sessionError.message);
          if (isMounted) setError(sessionError.message);
        }

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (err) {
        console.error('Physenra: Unexpected auth initialization error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setPendingAuthFlow('recovery');
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setActivePracticeHeader(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return { error: signInError };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchProfile(data.user.id);
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during sign in';
      setError(message);
      return { error: err as AuthError };
    }
  }, [fetchProfile]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: SignUpMetadata
  ): Promise<SignUpResult> => {
    setError(null);
    try {
      const trimmedEmail = email.trim();
      const displayName = metadata?.display_name?.trim() ||
        (metadata?.first_name ? `${metadata.first_name.trim()} ${(metadata?.last_name || '').trim()}`.trim() : trimmedEmail);

      const redirectUrl = getAuthRedirectUrl('/login');
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: metadata?.first_name?.trim() || null,
            last_name: metadata?.last_name?.trim() || null,
            display_name: displayName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { error: signUpError, session: null, user: null };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        if (data.user) {
          await fetchProfile(data.user.id);
        }
      } else if (data.user) {
        setUser(data.user);
      }

      return { error: null, session: data.session, user: data.user };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during account creation';
      setError(message);
      return { error: err as AuthError, session: null, user: null };
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Physenra: Error during sign out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setActivePracticeHeader(null);
    }
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string, redirectPath: string = '/reset-password'): Promise<{ error: AuthError | null }> => {
    setError(null);
    try {
      const redirectUrl = getAuthRedirectUrl(redirectPath);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (resetError) {
        setError(resetError.message);
        return { error: resetError };
      }
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email';
      setError(message);
      return { error: err as AuthError };
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearPendingAuthFlow = useCallback(() => {
    setPendingAuthFlow(null);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    profile,
    loading,
    error,
    pendingAuthFlow,
    clearPendingAuthFlow,
    signIn,
    signUp,
    signOut,
    resetPasswordForEmail,
    refreshProfile,
    clearError,
  }), [user, session, profile, loading, error, pendingAuthFlow, clearPendingAuthFlow, signIn, signUp, signOut, resetPasswordForEmail, refreshProfile, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
