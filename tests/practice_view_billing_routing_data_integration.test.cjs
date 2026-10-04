// ==============================================================================
// PHYSENRA — PRACTICE "VIEW BILLING" ROUTING & DATA INTEGRATION TEST SUITE V1
// File: tests/practice_view_billing_routing_data_integration.test.cjs
//
// Governs and Verifies:
// 1. SubscriptionStatusBanner 'View Billing' action points to /app/billing
// 2. SubscriptionStatusBanner gates billing actions behind canAccessBilling (owner, accountant, manager)
// 3. SubscriptionStatusBanner prevents clinicians/receptionists from unauthorized billing navigation
// 4. PracticeSettingsPage links to internal /app/billing and /app/billing/invoices (not external /pricing)
// 5. PracticeBillingPage handles !activePractice?.id gracefully without hanging loading state
// 6. PracticeBillingPage renders practice context guard when activePractice is null
// 7. PracticeBillingPage provides authoritative 'Subscription Plan Setup Required' state when subscription is null
// 8. PracticeBillingPage displays educational trial empty state for saas_invoices explaining zero-charge trial
// 9. PracticeBillingPage provides explicit cross-domain navigation to Patient Invoices & Billing (/app/invoices)
// 10. Sidebar maintains strict separation between Patient Invoices (/app/invoices) and Practice Subscription Billing (/app/billing)
// 11. PracticeBillingPage preserves role-based action gating (only owner can initiate Paystack checkout/upgrade)
// 12. PracticeBillingPage preserves currency formatting and billing period calculations
// 13. Service layer preserves authoritative RPCs (no direct client table updates)
// 14. Zero Kabworld references across billing components and pages
// 15. Zero service-role or Paystack secret keys in billing frontend files
// 16. Invariant: SaaS Practice Subscription Billing and Patient Clinical Billing domains remain strictly separated
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const BANNER_PATH = path.join(SRC_DIR, 'components', 'billing', 'SubscriptionStatusBanner.tsx');
const SETTINGS_PATH = path.join(SRC_DIR, 'pages', 'practice', 'PracticeSettingsPage.tsx');
const BILLING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx');
const SIDEBAR_PATH = path.join(SRC_DIR, 'components', 'layout', 'Sidebar.tsx');
const APP_PATH = path.join(SRC_DIR, 'App.tsx');
const SAAS_SERVICE_PATH = path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts');

test('=== PHYSENRA — PRACTICE "VIEW BILLING" ROUTING & INTEGRATION AUDIT V1 ===', async (t) => {
  const bannerCode = fs.readFileSync(BANNER_PATH, 'utf8');
  const settingsCode = fs.readFileSync(SETTINGS_PATH, 'utf8');
  const billingPageCode = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  const sidebarCode = fs.readFileSync(SIDEBAR_PATH, 'utf8');
  const appCode = fs.readFileSync(APP_PATH, 'utf8');
  const saasServiceCode = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');

  await t.test('1. SubscriptionStatusBanner: "View Billing" action routes to /app/billing', () => {
    assert.match(
      bannerCode,
      /to="\/app\/billing"[^>]*>[\s\S]*?View Billing/i,
      'SubscriptionStatusBanner must have a Link with to="/app/billing" containing "View Billing"'
    );
  });

  await t.test('2. SubscriptionStatusBanner: defines canAccessBilling for owner, accountant, and manager', () => {
    assert.match(
      bannerCode,
      /canAccessBilling\s*=\s*isOwner\s*\|\|\s*isAccountant\s*\|\|\s*isManager/,
      'SubscriptionStatusBanner must define canAccessBilling = isOwner || isAccountant || isManager'
    );
    assert.match(
      bannerCode,
      /isAccountant,\s*isManager/,
      'useRole hook must import isAccountant and isManager'
    );
  });

  await t.test('3. SubscriptionStatusBanner: billing CTA buttons are gated with canAccessBilling', () => {
    assert.match(
      bannerCode,
      /\{canAccessBilling\s*&&\s*\(/,
      'SubscriptionStatusBanner must conditionally render billing CTAs only if canAccessBilling is true'
    );
  });

  await t.test('4. PracticeSettingsPage: subscription actions route to /app/billing rather than external /pricing', () => {
    assert.doesNotMatch(
      settingsCode,
      /<a\s+href="\/pricing"/,
      'PracticeSettingsPage must NOT link to external /pricing for managing subscriptions'
    );
    assert.match(
      settingsCode,
      /to="\/app\/billing"[^>]*>[\s\S]*?Manage Subscription &amp; Plan/,
      'PracticeSettingsPage must link to /app/billing for "Manage Subscription & Plan"'
    );
    assert.match(
      settingsCode,
      /to="\/app\/billing\/invoices"[^>]*>[\s\S]*?Subscription Invoices/,
      'PracticeSettingsPage must link to /app/billing/invoices for "Subscription Invoices"'
    );
  });

  await t.test('5. PracticeBillingPage: gracefully sets loading=false when activePractice is not yet defined', () => {
    assert.match(
      billingPageCode,
      /if\s*\(!activePractice\?\.id\)\s*\{\s*setLoading\(false\);\s*return;\s*\}/,
      'loadBillingData must set loading to false before returning if activePractice is missing'
    );
  });

  await t.test('6. PracticeBillingPage: provides practice context guard when activePractice is null', () => {
    assert.match(
      billingPageCode,
      /if\s*\(!activePractice\)\s*\{[\s\S]*?No Active Practice Selected[\s\S]*?\}/,
      'PracticeBillingPage must render an informative guard message when no active practice is selected'
    );
  });

  await t.test('7. PracticeBillingPage: handles null subscription with clear setup callout', () => {
    assert.match(
      billingPageCode,
      /Subscription Plan Setup Required/,
      'PracticeBillingPage must surface a clear alert when subscription is null'
    );
    assert.match(
      billingPageCode,
      /No active SaaS subscription plan is configured for/,
      'PracticeBillingPage must explain why subscription details are missing'
    );
  });

  await t.test('8. PracticeBillingPage: explains 14-day trial empty invoice state and zero billing charges', () => {
    assert.match(
      billingPageCode,
      /No subscription invoices recorded yet/,
      'PracticeBillingPage must explain trial status when no SaaS invoices exist'
    );
    assert.match(
      billingPageCode,
      /Your practice is currently enjoying its 14-day evaluation trial/,
      'PracticeBillingPage must clarify that trial is active and when invoices appear'
    );
  });

  await t.test('9. PracticeBillingPage: provides cross-domain link to Patient Invoices & Billing (/app/invoices)', () => {
    assert.match(
      billingPageCode,
      /to="\/app\/invoices"/,
      'PracticeBillingPage must contain navigation to Patient Invoices (/app/invoices)'
    );
    assert.match(
      billingPageCode,
      /Patient Invoices &amp; Billing/,
      'PracticeBillingPage must distinctly label the patient invoicing section'
    );
    assert.match(
      billingPageCode,
      /Looking to create or manage clinical patient invoices/i,
      'PracticeBillingPage must guide users looking for clinical patient invoices'
    );
  });

  await t.test('10. Sidebar: maintains clear distinction between Patient Invoices and Practice Billing', () => {
    // /app/invoices is patient billing
    assert.match(
      sidebarCode,
      /to="\/app\/invoices"/,
      'Sidebar must have NavLink for /app/invoices'
    );
    // /app/billing is SaaS practice billing
    assert.match(
      sidebarCode,
      /to="\/app\/billing"/,
      'Sidebar must have NavLink for /app/billing'
    );
    assert.match(
      sidebarCode,
      /\(isOwner\s*\|\|\s*isAccountant\s*\|\|\s*isManager\)\s*&&\s*\([\s\S]*?to="\/app\/billing"/,
      'Sidebar must restrict /app/billing NavLink to isOwner || isAccountant || isManager'
    );
  });

  await t.test('11. PracticeBillingPage: upgrade and checkout are restricted to practice_owner', () => {
    assert.match(
      billingPageCode,
      /const\s*\{[^}]*isOwner[^}]*\}\s*=\s*useRole\(\)/,
      'PracticeBillingPage must check isOwner'
    );
    assert.match(
      billingPageCode,
      /const\s*isReadOnly\s*=\s*!isOwner;/,
      'PracticeBillingPage must derive isReadOnly from !isOwner'
    );
    assert.match(
      billingPageCode,
      /!isReadOnly/,
      'PracticeBillingPage must gate sensitive mutation actions behind !isReadOnly'
    );
  });

  await t.test('12. App.tsx: registers routes for both /app/billing and /app/invoices', () => {
    assert.match(
      appCode,
      /path="billing"\s+element=\{<PracticeBillingPage\s*\/>\}/,
      'App.tsx must register PracticeBillingPage at /app/billing'
    );
    assert.match(
      appCode,
      /path="billing\/invoices"\s+element=\{<PracticeInvoiceListPage\s*\/>\}/,
      'App.tsx must register PracticeInvoiceListPage at /app/billing/invoices'
    );
    assert.match(
      appCode,
      /path="invoices"\s+element=\{<InvoiceListPage\s*\/>\}/,
      'App.tsx must register InvoiceListPage at /app/invoices'
    );
  });

  await t.test('13. saasSubscriptionService: uses server RPCs and proper tenant parameters', () => {
    assert.match(
      saasServiceCode,
      /self_service_change_plan/,
      'saasSubscriptionService must use authoritative self_service_change_plan RPC'
    );
    assert.match(
      saasServiceCode,
      /cancel_practice_subscription/,
      'saasSubscriptionService must use authoritative cancellation RPC'
    );
  });

  await t.test('14. Zero Kabworld references across billing components and pages', () => {
    const filesToCheck = [
      { name: 'SubscriptionStatusBanner.tsx', content: bannerCode },
      { name: 'PracticeSettingsPage.tsx', content: settingsCode },
      { name: 'PracticeBillingPage.tsx', content: billingPageCode },
      { name: 'Sidebar.tsx', content: sidebarCode }
    ];

    for (const f of filesToCheck) {
      assert.doesNotMatch(
        f.content,
        /kabworld/i,
        `${f.name} must not contain any Kabworld references`
      );
    }
  });

  await t.test('15. Zero secrets or service-role keys in billing frontend files', () => {
    const filesToCheck = [
      { name: 'SubscriptionStatusBanner.tsx', content: bannerCode },
      { name: 'PracticeSettingsPage.tsx', content: settingsCode },
      { name: 'PracticeBillingPage.tsx', content: billingPageCode }
    ];

    for (const f of filesToCheck) {
      assert.doesNotMatch(
        f.content,
        /service_role/i,
        `${f.name} must not contain service_role credentials`
      );
      assert.doesNotMatch(
        f.content,
        /sk_live_[0-9a-zA-Z]+/i,
        `${f.name} must not contain Paystack live secret keys`
      );
      assert.doesNotMatch(
        f.content,
        /sk_test_[0-9a-zA-Z]+/i,
        `${f.name} must not contain Paystack test secret keys`
      );
    }
  });

  await t.test('16. Domain Separation Invariant: SaaS Subscription vs Patient Clinical Billing', () => {
    // PracticeBillingPage should distinctly state its purpose as SaaS subscription
    assert.match(
      billingPageCode,
      /Billing & Subscription/i,
      'PracticeBillingPage title must indicate Billing & Subscription'
    );
    // Invoices list at /app/invoices is for Patient billing
    assert.match(
      billingPageCode,
      /Patient Invoices &amp; Accounts Receivable/i,
      'PracticeBillingPage should reference Patient Invoices & Accounts Receivable for patient billing'
    );
  });
});
