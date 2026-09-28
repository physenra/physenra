import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, setActivePracticeHeader, getActivePracticeHeader } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { UserPracticeMembership, Practice, MembershipRole } from '../types/models';

interface PracticeContextType {
  memberships: UserPracticeMembership[];
  activeMembership: UserPracticeMembership | null;
  activePractice: Practice | null;
  currentRole: MembershipRole | null;
  loading: boolean;
  error: string | null;
  switchPractice: (practiceId: string) => Promise<void>;
  refreshPractices: () => Promise<void>;
}

const PracticeContext = createContext<PracticeContextType | undefined>(undefined);

export const PracticeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<UserPracticeMembership[]>([]);
  const [activeMembership, setActiveMembership] = useState<UserPracticeMembership | null>(null);
  const [activePractice, setActivePractice] = useState<Practice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberships = useCallback(async (): Promise<UserPracticeMembership[]> => {
    if (!user) {
      setMemberships([]);
      setActiveMembership(null);
      setActivePractice(null);
      setActivePracticeHeader(null);
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch active practice memberships for the user with practice metadata
      const { data: memberRows, error: memberError } = await supabase
        .from('practice_memberships')
        .select(`
          id,
          practice_id,
          role,
          status,
          practices (
            id,
            name,
            slug,
            status,
            email,
            phone,
            timezone,
            country,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (memberError) {
        console.error('Physenra: Failed to load practice memberships:', memberError.message);
        setError(memberError.message);
        return [];
      }

      const activeList: UserPracticeMembership[] = (memberRows || [])
        .filter((row: any) => row.practices !== null && row.status === 'active')
        .map((row: any) => {
          const p = row.practices;
          return {
            id: row.id,
            practiceId: row.practice_id,
            practiceName: p.name,
            practiceSlug: p.slug,
            practiceStatus: p.status,
            role: row.role,
            membershipStatus: row.status,
            timezone: p.timezone,
            country: p.country,
          };
        });

      setMemberships(activeList);

      // Determine active practice context
      let selected: UserPracticeMembership | null = null;
      const storedPracticeId = getActivePracticeHeader();

      if (storedPracticeId) {
        selected = activeList.find((m) => m.practiceId === storedPracticeId) ?? null;
      }

      // Default to first active practice if stored is invalid or absent
      if (!selected && activeList.length > 0) {
        selected = activeList[0];
      }

      if (selected) {
        setActiveMembership(selected);
        setActivePracticeHeader(selected.practiceId);

        // Fetch full practice details
        const { data: practiceData } = await supabase
          .from('practices')
          .select('*')
          .eq('id', selected.practiceId)
          .maybeSingle();

        if (practiceData) {
          setActivePractice(practiceData);
        }
      } else {
        setActiveMembership(null);
        setActivePractice(null);
        setActivePracticeHeader(null);
      }

      return activeList;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error loading practices';
      console.error('Physenra: Practice context error:', err);
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const switchPractice = useCallback(async (practiceId: string) => {
    const target = memberships.find((m) => m.practiceId === practiceId);
    if (!target) {
      console.warn(`Physenra: Attempted switch to unauthorized or unknown practice ${practiceId}`);
      return;
    }

    setActiveMembership(target);
    setActivePracticeHeader(target.practiceId);

    // Fetch refreshed practice record
    const { data: practiceData } = await supabase
      .from('practices')
      .select('*')
      .eq('id', target.practiceId)
      .maybeSingle();

    if (practiceData) {
      setActivePractice(practiceData);
    }
  }, [memberships]);

  const refreshPractices = useCallback(async () => {
    await fetchMemberships();
  }, [fetchMemberships]);

  const currentRole = activeMembership?.role ?? null;

  const value = useMemo<PracticeContextType>(() => ({
    memberships,
    activeMembership,
    activePractice,
    currentRole,
    loading,
    error,
    switchPractice,
    refreshPractices,
  }), [memberships, activeMembership, activePractice, currentRole, loading, error, switchPractice, refreshPractices]);

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
};

export function usePractice(): PracticeContextType {
  const context = useContext(PracticeContext);
  if (!context) {
    throw new Error('usePractice must be used within a PracticeProvider');
  }
  return context;
}
