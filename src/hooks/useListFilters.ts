// ==============================================================================
// PHYSENRA — LIST FILTERS & NAVIGATION STATE PRESERVATION HOOK
// File: src/hooks/useListFilters.ts
//
// Governs:
// 1. Preservation of list search terms, status filters, and pagination across navigation.
// 2. Synchronization between URL query parameters and session storage.
// 3. Seamless browser Back and Forward navigation without filter loss.
// 4. Safe defaults and clean reset actions.
// ==============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const LIST_PREFIX = 'physenra:list_filters:v1:';

export interface UseListFiltersOptions<T extends Record<string, any>> {
  listKey: string;
  defaultFilters: T;
}

export function useListFilters<T extends Record<string, any>>({
  listKey,
  defaultFilters,
}: UseListFiltersOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionKey = `${LIST_PREFIX}${listKey}`;

  // Helper to parse query parameters into filter values
  const getInitialFilters = (): T => {
    const filters: any = { ...defaultFilters };
    let hasUrlParams = false;

    // Check URL parameters first
    for (const key of Object.keys(defaultFilters)) {
      const urlVal = searchParams.get(key);
      if (urlVal !== null) {
        hasUrlParams = true;
        const defaultVal = defaultFilters[key];
        if (typeof defaultVal === 'number') {
          const parsed = parseInt(urlVal, 10);
          filters[key] = isNaN(parsed) ? defaultVal : parsed;
        } else if (typeof defaultVal === 'boolean') {
          filters[key] = urlVal === 'true';
        } else {
          filters[key] = urlVal;
        }
      }
    }

    if (hasUrlParams) {
      return filters;
    }

    // Check session storage if no URL params
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = window.sessionStorage.getItem(sessionKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...defaultFilters, ...parsed };
        }
      }
    } catch {
      // Ignore
    }

    return filters;
  };

  const [filters, setFilters] = useState<T>(getInitialFilters);
  const filtersRef = useRef<T>(filters);
  filtersRef.current = filters;

  // Persist to session storage whenever filters change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(sessionKey, JSON.stringify(filters));
      }
    } catch {
      // Ignore
    }
  }, [filters, sessionKey]);

  // Update a single filter field and sync with URL search params
  const setFilterField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };
      
      // Update URL search params
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        if (value === defaultFilters[key] || value === '' || value === null || value === undefined) {
          newParams.delete(key as string);
        } else {
          newParams.set(key as string, String(value));
        }
        return newParams;
      }, { replace: true });

      return updated;
    });
  }, [defaultFilters, setSearchParams]);

  // Reset all filters to default
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(sessionKey);
      }
    } catch {
      // Ignore
    }
    setSearchParams({}, { replace: true });
  }, [defaultFilters, sessionKey, setSearchParams]);

  return {
    filters,
    setFilters,
    setFilterField,
    resetFilters,
  };
}
