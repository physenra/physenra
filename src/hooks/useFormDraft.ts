// ==============================================================================
// PHYSENRA — FORM DRAFT & UNSAVED DATA PRESERVATION HOOK
// File: src/hooks/useFormDraft.ts
//
// Governs:
// 1. Auto-saving form drafts across internal route navigation and component unmounts.
// 2. Safe restoration of uncommitted drafts upon returning to the route.
// 3. Multi-tenant practice and user isolation.
// 4. Dirty tracking, beforeunload protection, and explicit discard.
// 5. Background re-fetch protection: prevents server loads from clobbering local edits.
// 6. Visible save status tracking: 'idle' | 'saving' | 'saved' | 'error'.
// ==============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { usePractice } from './usePractice';
import { formDraftService, DraftSaveStatus } from '../services/formDraftService';

export interface UseFormDraftOptions<T extends Record<string, any>> {
  formId: string;
  initialData: T;
  serverData?: T | null;
  debounceMs?: number;
  onRestore?: (restoredData: T) => void;
}

export interface UseFormDraftReturn<T extends Record<string, any>> {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  isDirty: boolean;
  isRestored: boolean;
  restoredAt: string | null;
  saveStatus: DraftSaveStatus;
  saveDraftNow: () => void;
  discardDraft: () => void;
  markSaved: () => void;
}

export function useFormDraft<T extends Record<string, any>>({
  formId,
  initialData,
  serverData,
  debounceMs = 400,
  onRestore,
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
  const { user } = useAuth();
  const { activePractice } = usePractice();

  const practiceId = activePractice?.id || '';
  const userId = user?.id || '';

  // Store baseline data for dirty comparison
  const baselineRef = useRef<T>(serverData || initialData);
  const [data, setData] = useState<T>(serverData || initialData);
  const [isRestored, setIsRestored] = useState<boolean>(false);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');

  const dataRef = useRef<T>(data);
  dataRef.current = data;

  const isDirtyRef = useRef<boolean>(isDirty);
  isDirtyRef.current = isDirty;

  // Track if initial draft inspection has occurred
  const initializedRef = useRef<boolean>(false);

  // Check for existing draft on mount or when practice/user/formId becomes available
  useEffect(() => {
    if (!practiceId || !userId || !formId || initializedRef.current) return;

    initializedRef.current = true;

    // 1. Check synchronous session memory first
    const memoryDraft = formDraftService.loadDraft<T>(practiceId, userId, formId);

    if (memoryDraft && memoryDraft.data) {
      setData(memoryDraft.data);
      setIsRestored(true);
      setRestoredAt(memoryDraft.updatedAt);
      setIsDirty(true);
      setSaveStatus('saved');
      onRestore?.(memoryDraft.data);
      return;
    }

    // 2. If no memory draft, asynchronously inspect server-side draft storage
    formDraftService.loadDraftAsync<T>(practiceId, userId, formId).then((serverDraft) => {
      if (serverDraft && serverDraft.data) {
        setData(serverDraft.data);
        setIsRestored(true);
        setRestoredAt(serverDraft.updatedAt);
        setIsDirty(true);
        setSaveStatus('saved');
        onRestore?.(serverDraft.data);
      } else if (serverData) {
        baselineRef.current = serverData;
        setData(serverData);
      }
    });
  }, [practiceId, userId, formId, serverData, onRestore]);

  // Protect against background server re-fetch clobbering uncommitted edits
  useEffect(() => {
    if (!serverData) return;
    if (!isDirtyRef.current) {
      // If user hasn't made local edits, update with fresh server data
      baselineRef.current = serverData;
      setData(serverData);
    }
  }, [serverData]);

  // Calculate dirty state
  const checkIfDirty = useCallback((current: T): boolean => {
    try {
      return JSON.stringify(current) !== JSON.stringify(baselineRef.current);
    } catch {
      return true;
    }
  }, []);

  // Update a single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      const dirty = checkIfDirty(next);
      setIsDirty(dirty);
      if (dirty) {
        setSaveStatus('saving');
      }
      return next;
    });
  }, [checkIfDirty]);

  // Synchronous immediate save
  const saveDraftNow = useCallback(() => {
    if (!practiceId || !userId || !formId) return;
    if (!isDirtyRef.current) return;
    setSaveStatus('saving');
    formDraftService.saveDraft<T>(practiceId, userId, formId, dataRef.current);
    formDraftService
      .syncDraftToServer(practiceId, userId, formId, dataRef.current)
      .then((ok) => {
        setSaveStatus(ok ? 'saved' : 'error');
      })
      .catch(() => {
        setSaveStatus('error');
      });
  }, [practiceId, userId, formId]);

  // Debounced auto-save as user types
  useEffect(() => {
    if (!practiceId || !userId || !formId || !isDirty) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      formDraftService.saveDraft<T>(practiceId, userId, formId, dataRef.current);
      formDraftService
        .syncDraftToServer(practiceId, userId, formId, dataRef.current)
        .then((ok) => {
          setSaveStatus(ok ? 'saved' : 'error');
        })
        .catch(() => {
          setSaveStatus('error');
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [data, isDirty, practiceId, userId, formId, debounceMs]);

  // Synchronously save draft when component unmounts (e.g. user navigates away via sidebar)
  useEffect(() => {
    return () => {
      if (practiceId && userId && formId && isDirtyRef.current) {
        formDraftService.saveDraft<T>(practiceId, userId, formId, dataRef.current);
      }
    };
  }, [practiceId, userId, formId]);

  // Browser beforeunload listener when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Discard draft and revert to baseline
  const discardDraft = useCallback(() => {
    if (practiceId && userId && formId) {
      formDraftService.clearDraft(practiceId, userId, formId);
    }
    setData(baselineRef.current);
    setIsDirty(false);
    setIsRestored(false);
    setRestoredAt(null);
    setSaveStatus('idle');
  }, [practiceId, userId, formId]);

  // Mark saved after successful backend submission
  const markSaved = useCallback(() => {
    if (practiceId && userId && formId) {
      formDraftService.clearDraft(practiceId, userId, formId);
    }
    baselineRef.current = dataRef.current;
    setIsDirty(false);
    setIsRestored(false);
    setRestoredAt(null);
    setSaveStatus('idle');
  }, [practiceId, userId, formId]);

  return {
    data,
    setData,
    updateField,
    isDirty,
    isRestored,
    restoredAt,
    saveStatus,
    saveDraftNow,
    discardDraft,
    markSaved,
  };
}
