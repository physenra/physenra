import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Physenra: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. ' +
    'Please configure your .env.local file using .env.example as a template.'
  );
}

// Module-level storage for current active practice context header
let currentActivePracticeId: string | null = null;

/**
 * Updates the active practice context header for all subsequent Supabase API calls.
 * The database function public.current_practice_id() validates this header against
 * active practice memberships.
 */
export function setActivePracticeHeader(practiceId: string | null): void {
  currentActivePracticeId = practiceId;
  if (practiceId) {
    localStorage.setItem('physenra_active_practice_id', practiceId);
  } else {
    localStorage.removeItem('physenra_active_practice_id');
  }
}

export function getActivePracticeHeader(): string | null {
  if (!currentActivePracticeId) {
    currentActivePracticeId = localStorage.getItem('physenra_active_practice_id');
  }
  return currentActivePracticeId;
}

// Custom fetch interceptor injecting x-practice-id header for database RLS resolution
const customFetch: typeof fetch = (input, init = {}) => {
  const headers = new Headers(init?.headers);
  const activePractice = getActivePracticeHeader();
  if (activePractice) {
    headers.set('x-practice-id', activePractice);
  }
  return fetch(input, { ...init, headers });
};

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage,
    },
    global: {
      fetch: customFetch,
    },
  }
);
