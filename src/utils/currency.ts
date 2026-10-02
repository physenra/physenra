// ==============================================================================
// PHYSENRA SAAS — CENTRAL COMMERCIAL CURRENCY & INTEGER FORMATTER
// File: src/utils/currency.ts
//
// Governs:
// 1. Strict integer arithmetic (no floating-point rounding errors)
// 2. Conversion of minor currency units (cents/kobo) to formatted Naira display
// 3. Centralized platform currency formatting
// ==============================================================================

/**
 * Formats integer kobo (cents) to a human-readable Naira string (e.g. ₦15,000).
 * Uses strictly integer division to prevent floating-point rounding drift.
 *
 * @param amountCents - Amount in minor currency units (kobo/cents)
 * @returns Formatted currency string
 */
export function formatNaira(amountCents: number | null | undefined): string {
  if (amountCents === null || amountCents === undefined || isNaN(amountCents)) {
    return '₦0';
  }
  const naira = Math.floor(amountCents / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

/**
 * Formats a monthly/annual subscription plan price display.
 * Example: ₦15,000 / month or ₦150,000 / year
 */
export function formatPlanPrice(
  amountCents: number | null | undefined,
  interval: 'monthly' | 'annual' = 'monthly'
): string {
  const formatted = formatNaira(amountCents);
  const periodLabel = interval === 'annual' ? 'year' : 'month';
  return `${formatted} / ${periodLabel}`;
}
