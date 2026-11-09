// ==============================================================================
// PHYSENRA SAAS — REFERRAL ATTRIBUTION TRACKING SERVICE
// File: src/services/referralTrackingService.ts
//
// Governs:
// 1. First-touch referral code capture from URL query parameters (?ref= / ?referral=)
// 2. 30-day attribution persistence via LocalStorage and HTTP cookies
// 3. Strict alphanumeric code validation (4-32 characters, uppercase)
// 4. Prevention of referral overwriting (first-touch attribution rule)
// ==============================================================================

const STORAGE_KEY = 'physenra_referral_code';
const STORAGE_EXPIRY_KEY = 'physenra_referral_expires_at';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_REGEX = /^[A-Z0-9_-]{4,32}$/;

/**
 * Validates whether a referral code satisfies the strict alphanumeric schema.
 */
export function isValidReferralCode(code: unknown): boolean {
  if (typeof code !== 'string') return false;
  return CODE_REGEX.test(code.trim().toUpperCase());
}

/**
 * Normalizes a referral code string to trimmed uppercase.
 */
export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Sets a cookie in the browser with 30-day lifetime and Lax SameSite policy.
 */
function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  try {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  } catch (err) {
    console.warn('[ReferralTracking] Failed to write cookie:', err);
  }
}

/**
 * Reads a cookie by name from the browser document.
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const matches = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`));
    return matches ? decodeURIComponent(matches[1]) : null;
  } catch (err) {
    console.warn('[ReferralTracking] Failed to read cookie:', err);
    return null;
  }
}

/**
 * Deletes a cookie by name.
 */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  } catch (err) {
    console.warn('[ReferralTracking] Failed to delete cookie:', err);
  }
}

export const referralTrackingService = {
  /**
   * Retrieves the currently stored first-touch referral code if still within 30 days.
   */
  getStoredReferralCode(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      // 1. Check LocalStorage with expiration
      const storedCode = localStorage.getItem(STORAGE_KEY);
      const expiresAt = localStorage.getItem(STORAGE_EXPIRY_KEY);

      if (storedCode && expiresAt) {
        if (Date.now() < Number(expiresAt)) {
          const normalized = normalizeReferralCode(storedCode);
          if (isValidReferralCode(normalized)) {
            return normalized;
          }
        } else {
          // Expired
          this.clearStoredReferralCode();
        }
      }

      // 2. Fallback to Cookie
      const cookieCode = getCookie(STORAGE_KEY);
      if (cookieCode) {
        const normalized = normalizeReferralCode(cookieCode);
        if (isValidReferralCode(normalized)) {
          // Sync back to localStorage
          this.setReferralCode(normalized, false);
          return normalized;
        }
      }
    } catch (err) {
      console.warn('[ReferralTracking] Error reading stored referral code:', err);
    }

    return null;
  },

  /**
   * Persists a referral code adhering to the First-Touch Attribution invariant.
   * If a code is already stored, it is preserved unless `force` is explicitly true.
   */
  setReferralCode(code: string, force = false): boolean {
    if (!isValidReferralCode(code)) return false;
    const normalized = normalizeReferralCode(code);

    if (typeof window === 'undefined') return false;

    try {
      const existing = this.getStoredReferralCode();
      if (existing && !force) {
        // First-touch wins: do not overwrite
        return false;
      }

      const expiry = Date.now() + THIRTY_DAYS_MS;
      localStorage.setItem(STORAGE_KEY, normalized);
      localStorage.setItem(STORAGE_EXPIRY_KEY, String(expiry));
      setCookie(STORAGE_KEY, normalized, 30 * 24 * 60 * 60);
      return true;
    } catch (err) {
      console.warn('[ReferralTracking] Failed to persist referral code:', err);
      return false;
    }
  },

  /**
   * Captures referral code from window.location.search or provided URLSearchParams.
   * Checks `ref`, `referral`, or `referral_code` parameters.
   */
  captureReferralFromUrl(searchParams?: URLSearchParams): string | null {
    if (typeof window === 'undefined' && !searchParams) return null;

    try {
      const params = searchParams || new URLSearchParams(window.location.search);
      const candidate =
        params.get('ref') ||
        params.get('referral') ||
        params.get('referral_code') ||
        params.get('sales_rep');

      if (candidate && isValidReferralCode(candidate)) {
        this.setReferralCode(candidate, false); // First-touch preserves existing
        return this.getStoredReferralCode();
      }
    } catch (err) {
      console.warn('[ReferralTracking] Error capturing referral from URL:', err);
    }

    return this.getStoredReferralCode();
  },

  /**
   * Clears any active referral attribution from storage and cookies.
   */
  clearStoredReferralCode(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_EXPIRY_KEY);
      deleteCookie(STORAGE_KEY);
    } catch (err) {
      console.warn('[ReferralTracking] Failed to clear referral code:', err);
    }
  },
};
