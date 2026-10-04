/**
 * PHYSENRA — PRACTICE BILLING RUNTIME RENDER INTEGRITY TEST SUITE
 * 
 * Verifies:
 * 1. React Rules of Hooks compliance (no hooks after conditional returns/guards).
 * 2. Unconditional top-level useMemo, useEffect, useCallback definitions.
 * 3. ErrorBoundary component implementation and wrapping around AppShell Outlet & App Routes.
 * 4. Safe date formatting (formatDate) preventing NaN / "Invalid Date" crashes.
 * 5. Guard hierarchy (Loading -> Role -> Tenant Context -> Commercial Content).
 * 6. Zero Kabworld contamination.
 * 7. Zero exposed secrets.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BILLING_PAGE_PATH = path.join(ROOT, 'src', 'pages', 'billing', 'PracticeBillingPage.tsx');
const INVOICE_LIST_PAGE_PATH = path.join(ROOT, 'src', 'pages', 'billing', 'PracticeInvoiceListPage.tsx');
const INVOICE_DETAIL_PAGE_PATH = path.join(ROOT, 'src', 'pages', 'billing', 'PracticeInvoiceDetailPage.tsx');
const APP_SHELL_PATH = path.join(ROOT, 'src', 'components', 'layout', 'AppShell.tsx');
const APP_PATH = path.join(ROOT, 'src', 'App.tsx');
const ERROR_BOUNDARY_PATH = path.join(ROOT, 'src', 'components', 'common', 'ErrorBoundary.tsx');

test('=== PHYSENRA — PRACTICE BILLING RUNTIME RENDER INTEGRITY ===', async (t) => {
  const billingPageCode = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  const invoiceListPageCode = fs.readFileSync(INVOICE_LIST_PAGE_PATH, 'utf8');
  const invoiceDetailPageCode = fs.readFileSync(INVOICE_DETAIL_PAGE_PATH, 'utf8');
  const appShellCode = fs.readFileSync(APP_SHELL_PATH, 'utf8');
  const appCode = fs.readFileSync(APP_PATH, 'utf8');
  const errorBoundaryCode = fs.readFileSync(ERROR_BOUNDARY_PATH, 'utf8');

  await t.test('1. ErrorBoundary: implements React ErrorBoundary lifecycle with fallback UI', () => {
    assert.match(
      errorBoundaryCode,
      /class\s+ErrorBoundary\s+extends\s+Component/,
      'ErrorBoundary must be a React class component extending Component'
    );
    assert.match(
      errorBoundaryCode,
      /static\s+getDerivedStateFromError/,
      'ErrorBoundary must implement static getDerivedStateFromError'
    );
    assert.match(
      errorBoundaryCode,
      /componentDidCatch/,
      'ErrorBoundary must implement componentDidCatch for diagnostics'
    );
    assert.match(
      errorBoundaryCode,
      /Try Again|Reload Page/,
      'ErrorBoundary must provide a recovery action button'
    );
    assert.match(
      errorBoundaryCode,
      /Return to Dashboard/,
      'ErrorBoundary must provide navigation escape back to dashboard'
    );
  });

  await t.test('2. AppShell: wraps <Outlet /> inside <ErrorBoundary> to protect app shell and navigation', () => {
    assert.match(
      appShellCode,
      /import\s*\{\s*ErrorBoundary\s*\}\s*from\s*['"]\.\.\/common\/ErrorBoundary['"]/,
      'AppShell must import ErrorBoundary'
    );
    assert.match(
      appShellCode,
      /<ErrorBoundary[\s\S]*?<Outlet\s*\/>[\s\S]*?<\/ErrorBoundary>/,
      'AppShell must wrap <Outlet /> inside <ErrorBoundary>'
    );
  });

  await t.test('3. App.tsx: wraps route tree inside top-level <ErrorBoundary>', () => {
    assert.match(
      appCode,
      /import\s*\{\s*ErrorBoundary\s*\}\s*from\s*['"]\.\/components\/common\/ErrorBoundary['"]/,
      'App.tsx must import ErrorBoundary'
    );
    assert.match(
      appCode,
      /<ErrorBoundary[\s\S]*?<Routes>[\s\S]*?<\/Routes>[\s\S]*?<\/ErrorBoundary>/,
      'App.tsx must wrap <Routes> inside <ErrorBoundary>'
    );
  });

  await t.test('4. PracticeBillingPage: statusConfig useMemo is defined BEFORE any conditional return', () => {
    // Find index of statusConfig useMemo definition
    const statusConfigIndex = billingPageCode.indexOf('const statusConfig = useMemo');
    assert.ok(statusConfigIndex > 0, 'statusConfig useMemo must exist');

    // Find indices of conditional returns
    const loadingReturnIndex = billingPageCode.indexOf('if (practiceLoading || (loading && !subscription))');
    const roleReturnIndex = billingPageCode.indexOf('if (isClinician || isReceptionist)');
    const tenantReturnIndex = billingPageCode.indexOf('if (!activePractice)');

    assert.ok(loadingReturnIndex > 0, 'loading return guard must exist');
    assert.ok(roleReturnIndex > 0, 'role return guard must exist');
    assert.ok(tenantReturnIndex > 0, 'tenant return guard must exist');

    assert.ok(
      statusConfigIndex < loadingReturnIndex,
      'statusConfig useMemo MUST be defined before loading guard return'
    );
    assert.ok(
      statusConfigIndex < roleReturnIndex,
      'statusConfig useMemo MUST be defined before clinician role guard return'
    );
    assert.ok(
      statusConfigIndex < tenantReturnIndex,
      'statusConfig useMemo MUST be defined before tenant guard return'
    );
  });

  await t.test('5. PracticeBillingPage: NO hooks called after conditional return statements', () => {
    const firstEarlyReturnIndex = billingPageCode.indexOf('if (practiceLoading || (loading && !subscription))');
    const codeAfterFirstReturn = billingPageCode.slice(firstEarlyReturnIndex);

    // Check for any hook invocations in the code after early return
    const forbiddenHookRegex = /\b(useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer)\s*\(/g;
    const matches = codeAfterFirstReturn.match(forbiddenHookRegex);
    assert.equal(
      matches,
      null,
      `No React hooks may be invoked after an early return guard. Found: ${matches ? matches.join(', ') : 'none'}`
    );
  });

  await t.test('6. PracticeInvoiceListPage: NO hooks called after conditional return statements', () => {
    const firstEarlyReturnIndex = invoiceListPageCode.indexOf('if (isClinician || isReceptionist)');
    assert.ok(firstEarlyReturnIndex > 0, 'Role guard must exist in PracticeInvoiceListPage');
    const codeAfterFirstReturn = invoiceListPageCode.slice(firstEarlyReturnIndex);

    const forbiddenHookRegex = /\b(useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer)\s*\(/g;
    const matches = codeAfterFirstReturn.match(forbiddenHookRegex);
    assert.equal(
      matches,
      null,
      `No React hooks may be invoked after an early return in PracticeInvoiceListPage. Found: ${matches ? matches.join(', ') : 'none'}`
    );
  });

  await t.test('7. PracticeInvoiceDetailPage: NO hooks called after conditional return statements', () => {
    const firstEarlyReturnIndex = invoiceDetailPageCode.indexOf('if (isClinician || isReceptionist)');
    assert.ok(firstEarlyReturnIndex > 0, 'Role guard must exist in PracticeInvoiceDetailPage');
    const codeAfterFirstReturn = invoiceDetailPageCode.slice(firstEarlyReturnIndex);

    const forbiddenHookRegex = /\b(useState|useEffect|useMemo|useCallback|useRef|useContext|useReducer)\s*\(/g;
    const matches = codeAfterFirstReturn.match(forbiddenHookRegex);
    assert.equal(
      matches,
      null,
      `No React hooks may be invoked after an early return in PracticeInvoiceDetailPage. Found: ${matches ? matches.join(', ') : 'none'}`
    );
  });

  await t.test('8. Safe Date Handling: formatDate helper guards all billing date displays against invalid/null dates', () => {
    // Check PracticeBillingPage
    assert.match(
      billingPageCode,
      /function\s+formatDate\(dateValue:/,
      'PracticeBillingPage must declare safe formatDate helper'
    );
    // Raw toLocaleDateString should only be inside formatDate
    const billingMatches = billingPageCode.match(/toLocaleDateString\(/g);
    assert.equal(
      billingMatches.length,
      1,
      'PracticeBillingPage must only invoke toLocaleDateString once inside formatDate'
    );

    // Check PracticeInvoiceListPage
    assert.match(
      invoiceListPageCode,
      /function\s+formatDate\(dateValue:/,
      'PracticeInvoiceListPage must declare safe formatDate helper'
    );
    const invoiceListMatches = invoiceListPageCode.match(/toLocaleDateString\(/g);
    assert.equal(
      invoiceListMatches.length,
      1,
      'PracticeInvoiceListPage must only invoke toLocaleDateString once inside formatDate'
    );

    // Check PracticeInvoiceDetailPage
    assert.match(
      invoiceDetailPageCode,
      /function\s+formatDate\(dateValue:/,
      'PracticeInvoiceDetailPage must declare safe formatDate helper'
    );
    const invoiceDetailMatches = invoiceDetailPageCode.match(/toLocaleDateString\(/g);
    assert.equal(
      invoiceDetailMatches.length,
      1,
      'PracticeInvoiceDetailPage must only invoke toLocaleDateString once inside formatDate'
    );
  });

  await t.test('9. Zero Kabworld contamination in all modified files', () => {
    const filesToCheck = [
      billingPageCode,
      invoiceListPageCode,
      invoiceDetailPageCode,
      appShellCode,
      appCode,
      errorBoundaryCode,
    ];

    filesToCheck.forEach((content) => {
      assert.doesNotMatch(
        content,
        /kabworld/i,
        'No Kabworld references permitted in Physenra files'
      );
    });
  });

  await t.test('10. Zero secret keys or service role tokens', () => {
    const filesToCheck = [
      billingPageCode,
      invoiceListPageCode,
      invoiceDetailPageCode,
      appShellCode,
      appCode,
      errorBoundaryCode,
    ];

    filesToCheck.forEach((content) => {
      assert.doesNotMatch(
        content,
        /service_role|supabase_service_key|eyJhbGciOi/i,
        'No secret keys or tokens permitted in frontend files'
      );
    });
  });
});
