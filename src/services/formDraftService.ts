// ==============================================================================
// PHYSENRA — FORM DRAFT & UNSAVED DATA PRESERVATION SERVICE
// File: src/services/formDraftService.ts
//
// Governs:
// 1. Strict multi-tenant and user draft isolation:
//    Key format: physenra:draft:v1:{practiceId}:{userId}:{formId}
// 2. Draft TTL expiration (default 24 hours) with automatic stale pruning.
// 3. User & practice boundary checks: never restores across practice/user boundaries.
// 4. Safe storage driver with in-memory fallback if browser storage is restricted.
// 5. Zero secrets or authentication tokens in storage.
// 6. Complete lifecycle: save, load, clear, discard, and practice-wide purge.
// ==============================================================================

export interface FormDraftEnvelope<T = any> {
  version: number;
  formId: string;
  practiceId: string;
  userId: string;
  data: T;
  updatedAt: string;
  expiresAt: string;
}

const DRAFT_PREFIX = 'physenra:draft:v1:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory fallback map if localStorage/sessionStorage is blocked or throws
const inMemoryStore = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test storage availability
      const testKey = '__physenra_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Storage access denied (e.g. private mode or iframe restrictions)
  }
  return null;
}

function storageGet(key: string): string | null {
  const storage = getStorage();
  if (storage) {
    try {
      return storage.getItem(key);
    } catch {
      // Fallback
    }
  }
  return inMemoryStore.get(key) || null;
}

function storageSet(key: string, value: string): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(key, value);
      return;
    } catch {
      // Fallback
    }
  }
  inMemoryStore.set(key, value);
}

function storageRemove(key: string): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch {
      // Fallback
    }
  }
  inMemoryStore.delete(key);
}

function buildKey(practiceId: string, userId: string, formId: string): string {
  return `${DRAFT_PREFIX}${practiceId}:${userId}:${formId}`;
}

export const formDraftService = {
  /**
   * Saves a form draft with strict practice and user scoping.
   */
  saveDraft<T>(
    practiceId: string,
    userId: string,
    formId: string,
    data: T,
    ttlMs: number = DEFAULT_TTL_MS
  ): FormDraftEnvelope<T> | null {
    if (!practiceId || !userId || !formId) {
      console.warn('Physenra draft service: practiceId, userId, and formId are required to save draft.');
      return null;
    }

    try {
      const now = new Date();
      const expires = new Date(now.getTime() + ttlMs);

      const envelope: FormDraftEnvelope<T> = {
        version: 1,
        formId,
        practiceId,
        userId,
        data,
        updatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      };

      const key = buildKey(practiceId, userId, formId);
      storageSet(key, JSON.stringify(envelope));
      return envelope;
    } catch (err) {
      console.error('Physenra draft service: Failed to save draft:', err);
      return null;
    }
  },

  /**
   * Loads a form draft, verifying ownership, practice context, and TTL validity.
   */
  loadDraft<T>(
    practiceId: string,
    userId: string,
    formId: string
  ): FormDraftEnvelope<T> | null {
    if (!practiceId || !userId || !formId) return null;

    try {
      const key = buildKey(practiceId, userId, formId);
      const raw = storageGet(key);
      if (!raw) return null;

      const envelope: FormDraftEnvelope<T> = JSON.parse(raw);

      // Verify tenant and user boundary
      if (envelope.practiceId !== practiceId || envelope.userId !== userId || envelope.formId !== formId) {
        console.warn('Physenra draft service: Draft boundary mismatch; purging invalid draft.');
        storageRemove(key);
        return null;
      }

      // Check TTL expiration
      const expiresAt = new Date(envelope.expiresAt).getTime();
      if (Date.now() > expiresAt) {
        // Expired draft - remove
        storageRemove(key);
        return null;
      }

      return envelope;
    } catch (err) {
      console.error('Physenra draft service: Failed to load draft:', err);
      return null;
    }
  },

  /**
   * Removes a specific form draft.
   */
  clearDraft(practiceId: string, userId: string, formId: string): void {
    if (!practiceId || !userId || !formId) return;
    try {
      const key = buildKey(practiceId, userId, formId);
      storageRemove(key);
    } catch (err) {
      console.error('Physenra draft service: Failed to clear draft:', err);
    }
  },

  /**
   * Checks if an active unexpired draft exists for the specified form.
   */
  hasDraft(practiceId: string, userId: string, formId: string): boolean {
    const draft = this.loadDraft(practiceId, userId, formId);
    return draft !== null;
  },

  /**
   * Purges all drafts belonging to a specific practice (e.g. upon practice switch).
   */
  clearPracticeDrafts(practiceId: string): void {
    if (!practiceId) return;
    try {
      const targetPrefix = `${DRAFT_PREFIX}${practiceId}:`;
      const storage = getStorage();
      if (storage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(targetPrefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => storage.removeItem(k));
      }

      // In-memory cleanup
      for (const key of inMemoryStore.keys()) {
        if (key.startsWith(targetPrefix)) {
          inMemoryStore.delete(key);
        }
      }
    } catch (err) {
      console.error('Physenra draft service: Failed to purge practice drafts:', err);
    }
  },

  /**
   * Purges all drafts belonging to a specific user (e.g. upon logout).
   */
  clearUserDrafts(userId: string): void {
    if (!userId) return;
    try {
      const storage = getStorage();
      if (storage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(DRAFT_PREFIX) && key.includes(`:${userId}:`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => storage.removeItem(k));
      }

      for (const key of inMemoryStore.keys()) {
        if (key.startsWith(DRAFT_PREFIX) && key.includes(`:${userId}:`)) {
          inMemoryStore.delete(key);
        }
      }
    } catch (err) {
      console.error('Physenra draft service: Failed to purge user drafts:', err);
    }
  },
};
