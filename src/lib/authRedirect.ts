// ==============================================================================
// PHYSENRA PLATFORM — AUTHENTICATION REDIRECT RESOLUTION
// File: src/lib/authRedirect.ts
// ==============================================================================

/**
 * Resolves the authorized redirect destination for authentication flows (email verification, password reset).
 *
 * Operational Rules:
 * - Production origin is strictly https://physenra.com
 * - Localhost is permitted only during local development (localhost / 127.0.0.1)
 * - Arbitrary, external, or wildcard redirect destinations are strictly rejected
 * - Defaults to https://physenra.com in production or SSR
 *
 * @param path - Normalized internal route destination (defaults to '/login')
 * @returns Fully qualified, authorized redirect URL
 */
export function getAuthRedirectUrl(path: string = '/login'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.toLowerCase();

    // Local development origins
    const isLocalhost =
      origin === 'http://localhost:3000' ||
      origin === 'http://127.0.0.1:3000' ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

    if (isLocalhost) {
      return `${origin}${normalizedPath}`;
    }

    // Explicit authorized production origin
    if (origin === 'https://physenra.com') {
      return `https://physenra.com${normalizedPath}`;
    }
  }

  // Authoritative production fallback
  return `https://physenra.com${normalizedPath}`;
}
