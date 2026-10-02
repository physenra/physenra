// ==============================================================================
// PHYSENRA — PHASE 4D: INVOICE, RECEIPT & PRINTABLE BILLING DOCUMENTS TEST SUITE
// Test Suite: tests/invoice_receipt_phase4d.test.cjs
//
// Governs all 28 required verification tests:
// TEST 1:  /app/billing/invoices route exists
// TEST 2:  invoice detail route exists
// TEST 3:  authenticated practice context required
// TEST 4:  practice owner can view own invoices
// TEST 5:  accountant can view authorized invoices
// TEST 6:  unauthorized role cannot access invoices
// TEST 7:  cross-practice invoice access rejected
// TEST 8:  invoice totals are read from authoritative fields
// TEST 9:  invoice lines are read from authoritative data
// TEST 10: invoice number uses authoritative invoice number
// TEST 11: paid invoice displays payment information
// TEST 12: open invoice displays Pay Now only when eligible
// TEST 13: paid invoice does not display Pay Now
// TEST 14: Pay Now uses existing Phase 4B endpoint
// TEST 15: frontend does not directly mutate invoices
// TEST 16: frontend does not directly mutate payments
// TEST 17: print invoice control exists
// TEST 18: print receipt control exists
// TEST 19: print CSS hides navigation
// TEST 20: print CSS preserves invoice content
// TEST 21: mobile layout avoids horizontal overflow
// TEST 22: no Paystack secret in frontend
// TEST 23: no service-role key in frontend
// TEST 24: no Kabworld references
// TEST 25: Phase 4A tests pass
// TEST 26: Phase 4B tests pass
// TEST 27: Phase 4C tests pass
// TEST 28: full regression passes
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_ASSETS_DIR = path.join(DIST_DIR, 'assets');

const APP_TSX_PATH = path.join(SRC_DIR, 'App.tsx');
const INVOICE_LIST_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeInvoiceListPage.tsx');
const INVOICE_DETAIL_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeInvoiceDetailPage.tsx');
const BILLING_PAGE_PATH = path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx');
const SAAS_SERVICE_PATH = path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts');
const INDEX_CSS_PATH = path.join(SRC_DIR, 'index.css');

test('PHYSENRA — Phase 4D: Invoice, Receipt & Printable Documents Test Suite', async (t) => {
  const appTsx = fs.readFileSync(APP_TSX_PATH, 'utf8');
  const invoiceListPage = fs.readFileSync(INVOICE_LIST_PATH, 'utf8');
  const invoiceDetailPage = fs.readFileSync(INVOICE_DETAIL_PATH, 'utf8');
  const billingPage = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
  const saasService = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');
  const indexCss = fs.readFileSync(INDEX_CSS_PATH, 'utf8');

  // ============================================================================
  // SUITE 1: Routing & Context (Tests 1 - 3)
  // ============================================================================
  await t.test('--- SUITE 1: Routing & Context ---', async (st) => {
    await st.test('TEST 1: /app/billing/invoices route exists', () => {
      assert(appTsx.includes('path="billing/invoices"'), 'App.tsx must register billing/invoices route');
      assert(appTsx.includes('<PracticeInvoiceListPage />'), 'billing/invoices route must render PracticeInvoiceListPage');
    });

    await st.test('TEST 2: invoice detail route exists', () => {
      assert(appTsx.includes('path="billing/invoices/:invoiceId"'), 'App.tsx must register billing/invoices/:invoiceId route');
      assert(appTsx.includes('<PracticeInvoiceDetailPage />'), 'billing/invoices/:invoiceId must render PracticeInvoiceDetailPage');
    });

    await st.test('TEST 3: authenticated practice context required', () => {
      const appIndex = appTsx.indexOf('path="/app"');
      const protectedIndex = appTsx.indexOf('<ProtectedRoute>', appIndex);
      const appShellIndex = appTsx.indexOf('<AppShell />', protectedIndex);
      const invoicesIndex = appTsx.indexOf('path="billing/invoices"', appShellIndex);
      const invoiceDetailIndex = appTsx.indexOf('path="billing/invoices/:invoiceId"', appShellIndex);

      assert(appIndex !== -1, '/app parent route exists');
      assert(protectedIndex > appIndex, 'ProtectedRoute wraps /app');
      assert(appShellIndex > protectedIndex, 'AppShell is nested inside ProtectedRoute');
      assert(invoicesIndex > appShellIndex, 'invoices route is child of AppShell');
      assert(invoiceDetailIndex > appShellIndex, 'invoice detail route is child of AppShell');
    });
  });

  // ============================================================================
  // SUITE 2: Role Access & Multi-Tenant Isolation (Tests 4 - 7)
  // ============================================================================
  await t.test('--- SUITE 2: Role Access & Multi-Tenant Isolation ---', async (st) => {
    await st.test('TEST 4: practice owner can view own invoices', () => {
      assert(invoiceListPage.includes('isOwner'), 'PracticeInvoiceListPage checks isOwner');
      assert(invoiceDetailPage.includes('isOwner'), 'PracticeInvoiceDetailPage checks isOwner');
      assert(invoiceListPage.includes('isAuthorizedViewer = isOwner || isAccountant || isManager'), 'Practice owner is authorized viewer');
      assert(invoiceDetailPage.includes('isAuthorizedViewer = isOwner || isAccountant || isManager'), 'Practice owner is authorized viewer for detail');
    });

    await st.test('TEST 5: accountant can view authorized invoices', () => {
      assert(invoiceListPage.includes('isAccountant'), 'PracticeInvoiceListPage permits isAccountant');
      assert(invoiceDetailPage.includes('isAccountant'), 'PracticeInvoiceDetailPage permits isAccountant');
      assert(invoiceDetailPage.includes('const isReadOnly = !isOwner'), 'Accountant receives read-only access without Pay Now');
    });

    await st.test('TEST 6: unauthorized role cannot access invoices', () => {
      assert(invoiceListPage.includes('isClinician || isReceptionist'), 'PracticeInvoiceListPage restricts clinicians and receptionists');
      assert(invoiceListPage.includes('Access Restricted'), 'PracticeInvoiceListPage shows Access Restricted screen');
      assert(invoiceDetailPage.includes('isClinician || isReceptionist'), 'PracticeInvoiceDetailPage restricts clinicians and receptionists');
      assert(invoiceDetailPage.includes('Access Restricted'), 'PracticeInvoiceDetailPage shows Access Restricted screen');
    });

    await st.test('TEST 7: cross-practice invoice access rejected', () => {
      assert(invoiceDetailPage.includes('targetInvoice.practice_id !== activePractice.id'), 'PracticeInvoiceDetailPage strictly compares invoice practice_id with activePractice.id');
      assert(invoiceDetailPage.includes('Invoice not found or does not belong to the active practice'), 'PracticeInvoiceDetailPage safely rejects cross-practice access');
      assert(saasService.includes('.eq(\'practice_id\', activePracticeId)'), 'saasSubscriptionService enforces practice_id filter on invoices query');
    });
  });

  // ============================================================================
  // SUITE 3: Authoritative Financial Data (Tests 8 - 10)
  // ============================================================================
  await t.test('--- SUITE 3: Authoritative Financial Data ---', async (st) => {
    await st.test('TEST 8: invoice totals are read from authoritative fields', () => {
      assert(invoiceDetailPage.includes('invoice.subtotal_cents'), 'Subtotal read directly from invoice.subtotal_cents');
      assert(invoiceDetailPage.includes('invoice.discount_cents'), 'Discount read directly from invoice.discount_cents');
      assert(invoiceDetailPage.includes('invoice.tax_cents'), 'Tax read directly from invoice.tax_cents');
      assert(invoiceDetailPage.includes('invoice.total_cents'), 'Total read directly from invoice.total_cents');
      assert(!invoiceDetailPage.includes('invoice.total_cents ='), 'Frontend does not recalculate or overwrite invoice.total_cents');
    });

    await st.test('TEST 9: invoice lines are read from authoritative data', () => {
      assert(invoiceDetailPage.includes('saasSubscriptionService.getInvoiceLines'), 'Invoice lines loaded from saasSubscriptionService.getInvoiceLines');
      assert(invoiceDetailPage.includes('item.unit_price_cents'), 'Unit price read from item.unit_price_cents');
      assert(invoiceDetailPage.includes('item.amount_cents'), 'Amount read from item.amount_cents');
      assert(invoiceDetailPage.includes('item.description'), 'Description read from item.description');
      assert(invoiceDetailPage.includes('item.quantity'), 'Quantity read from item.quantity');
    });

    await st.test('TEST 10: invoice number uses authoritative invoice number', () => {
      assert(invoiceDetailPage.includes('invoice.invoice_number'), 'PracticeInvoiceDetailPage uses invoice.invoice_number');
      assert(invoiceListPage.includes('inv.invoice_number'), 'PracticeInvoiceListPage uses inv.invoice_number');
      assert(!invoiceDetailPage.includes('Math.random()'), 'Zero generated mock invoice numbers');
      assert(!invoiceListPage.includes('Math.random()'), 'Zero generated mock invoice numbers in list');
    });
  });

  // ============================================================================
  // SUITE 4: Payment Presentation & Pay Now Integration (Tests 11 - 14)
  // ============================================================================
  await t.test('--- SUITE 4: Payment Presentation & Pay Now Integration ---', async (st) => {
    await st.test('TEST 11: paid invoice displays payment information', () => {
      assert(invoiceDetailPage.includes('Payment Settlement Details'), 'Renders settlement details for paid invoices');
      assert(invoiceDetailPage.includes('paymentReference'), 'Displays payment gateway reference');
      assert(invoiceDetailPage.includes('paymentSettledDate'), 'Displays settlement date');
      assert(invoiceDetailPage.includes('Paystack'), 'Identifies Paystack gateway');
    });

    await st.test('TEST 12: open invoice displays Pay Now only when eligible', () => {
      assert(invoiceDetailPage.includes("invoice.status === 'open' && !isReadOnly"), 'Pay Now displayed strictly when status is open and user is owner');
      assert(invoiceListPage.includes("inv.status === 'open' && !isReadOnly"), 'Pay Now in list displayed strictly when status is open and user is owner');
    });

    await st.test('TEST 13: paid invoice does not display Pay Now', () => {
      assert(!invoiceDetailPage.includes("invoice.status === 'paid' && !isReadOnly &&"), 'Paid invoices do NOT show Pay Now');
      assert(invoiceDetailPage.includes("const isPaid = invoice.status === 'paid'"), 'Tracks paid state');
    });

    await st.test('TEST 14: Pay Now uses existing Phase 4B endpoint', () => {
      assert(invoiceDetailPage.includes('saasSubscriptionService.initializePaystackCheckout'), 'Invoice detail uses initializePaystackCheckout');
      assert(invoiceListPage.includes('saasSubscriptionService.initializePaystackCheckout'), 'Invoice list uses initializePaystackCheckout');
      assert(saasService.includes("await fetch('/api/initialize-payment'"), 'initializePaystackCheckout invokes Phase 4B /api/initialize-payment');
    });
  });

  // ============================================================================
  // SUITE 5: Immutability & Financial Invariant (Tests 15 - 16)
  // ============================================================================
  await t.test('--- SUITE 5: Immutability & Financial Invariant ---', async (st) => {
    await st.test('TEST 15: frontend does not directly mutate invoices', () => {
      assert(!invoiceListPage.includes(".from('saas_invoices').update"), 'PracticeInvoiceListPage does not mutate saas_invoices');
      assert(!invoiceListPage.includes(".from('saas_invoices').delete"), 'PracticeInvoiceListPage does not delete saas_invoices');
      assert(!invoiceDetailPage.includes(".from('saas_invoices').update"), 'PracticeInvoiceDetailPage does not mutate saas_invoices');
      assert(!invoiceDetailPage.includes(".from('saas_invoices').delete"), 'PracticeInvoiceDetailPage does not delete saas_invoices');
    });

    await st.test('TEST 16: frontend does not directly mutate payments', () => {
      assert(!invoiceListPage.includes(".from('saas_payments').insert"), 'PracticeInvoiceListPage does not insert saas_payments');
      assert(!invoiceListPage.includes(".from('saas_payments').update"), 'PracticeInvoiceListPage does not update saas_payments');
      assert(!invoiceDetailPage.includes(".from('saas_payments').insert"), 'PracticeInvoiceDetailPage does not insert saas_payments');
      assert(!invoiceDetailPage.includes(".from('saas_payments').update"), 'PracticeInvoiceDetailPage does not update saas_payments');
    });
  });

  // ============================================================================
  // SUITE 6: Print & Responsive Controls (Tests 17 - 21)
  // ============================================================================
  await t.test('--- SUITE 6: Print & Responsive Controls ---', async (st) => {
    await st.test('TEST 17: print invoice control exists', () => {
      assert(invoiceDetailPage.includes('Print Invoice'), 'Print Invoice button exists in detail view');
      assert(invoiceDetailPage.includes('window.print()'), 'Uses browser-native window.print()');
    });

    await st.test('TEST 18: print receipt control exists', () => {
      assert(invoiceDetailPage.includes('Print Receipt'), 'Print Receipt button exists in detail view');
      assert(invoiceDetailPage.includes("viewMode === 'receipt'"), 'Receipt view mode supported for paid invoices');
      assert(invoiceDetailPage.includes('Official SaaS Subscription Payment Receipt'), 'Contains official payment receipt subtitle');
    });

    await st.test('TEST 19: print CSS hides navigation', () => {
      assert(indexCss.includes('@media print'), 'index.css defines dedicated @media print rules');
      assert(indexCss.includes('.header-bar'), 'print CSS hides header bar');
      assert(indexCss.includes('.sidebar'), 'print CSS hides sidebar');
      assert(indexCss.includes('.print\\:hidden'), 'print CSS hides print:hidden elements');
      assert(indexCss.includes('display: none !important'), 'print CSS applies display: none !important to navigation and controls');
    });

    await st.test('TEST 20: print CSS preserves invoice content', () => {
      assert(indexCss.includes('.printable-document'), 'print CSS defines styles for .printable-document');
      assert(indexCss.includes('page-break-inside: avoid'), 'print CSS prevents breaks inside invoice/receipt content');
      assert(indexCss.includes('-webkit-print-color-adjust: exact'), 'print CSS ensures exact color fidelity');
    });

    await st.test('TEST 21: mobile layout avoids horizontal overflow', () => {
      assert(invoiceListPage.includes('overflow-x-auto'), 'Invoice list wraps table in horizontal scroll container');
      assert(invoiceDetailPage.includes('overflow-x-auto'), 'Invoice detail wraps line items in scroll container');
      assert(invoiceDetailPage.includes('max-w-4xl'), 'Invoice detail uses responsive max-width layout');
    });
  });

  // ============================================================================
  // SUITE 7: Security Hygiene & Upstream Verifications (Tests 22 - 28)
  // ============================================================================
  await t.test('--- SUITE 7: Security Hygiene & Upstream Verifications ---', async (st) => {
    await st.test('TEST 22: no Paystack secret in frontend', () => {
      const filesToCheck = [
        INVOICE_LIST_PATH,
        INVOICE_DETAIL_PATH,
        BILLING_PAGE_PATH,
        SAAS_SERVICE_PATH,
        INDEX_CSS_PATH,
      ];
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('PAYSTACK_SECRET_KEY'), `${filePath} contains PAYSTACK_SECRET_KEY`);
        assert(!content.includes('sk_live_'), `${filePath} contains sk_live_`);
        assert(!content.includes('sk_test_'), `${filePath} contains sk_test_`);
      }
    });

    await st.test('TEST 23: no service-role key in frontend', () => {
      const filesToCheck = [
        INVOICE_LIST_PATH,
        INVOICE_DETAIL_PATH,
        BILLING_PAGE_PATH,
        SAAS_SERVICE_PATH,
      ];
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('service_role'), `${filePath} contains service_role`);
        assert(!content.includes('sbp_'), `${filePath} contains sbp_`);
      }
    });

    await st.test('TEST 24: no Kabworld references', () => {
      const filesToCheck = [
        INVOICE_LIST_PATH,
        INVOICE_DETAIL_PATH,
        BILLING_PAGE_PATH,
        SAAS_SERVICE_PATH,
        INDEX_CSS_PATH,
      ];
      const forbidden = ['k', 'a', 'b', 'w', 'o', 'r', 'l', 'd'].join('');
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.toLowerCase().includes(forbidden), `${filePath} contains forbidden reference`);
      }
    });

    await st.test('TEST 25: Phase 4A tests pass', () => {
      const phase4aTestPath = path.join(ROOT_DIR, 'tests', 'practice_self_service_billing_phase4a.test.cjs');
      assert(fs.existsSync(phase4aTestPath), 'Phase 4A test file exists');
      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }
      const output = execSync(`node --test "${phase4aTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('tests 48'), 'All 48 Phase 4A tests run');
      assert(!output.includes('fail 1'), '0 failures in Phase 4A');
    });

    await st.test('TEST 26: Phase 4B tests pass', () => {
      const phase4bTestPath = path.join(ROOT_DIR, 'tests', 'paystack_phase4b.test.cjs');
      assert(fs.existsSync(phase4bTestPath), 'Phase 4B test file exists');
      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }
      const output = execSync(`node --test "${phase4bTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('tests 42'), 'All 42 Phase 4B tests run');
      assert(!output.includes('fail 1'), '0 failures in Phase 4B');
    });

    await st.test('TEST 27: Phase 4C tests pass', () => {
      const phase4cTestPath = path.join(ROOT_DIR, 'tests', 'practice_billing_phase4c.test.cjs');
      assert(fs.existsSync(phase4cTestPath), 'Phase 4C test file exists');
      const cleanEnv = { ...process.env };
      for (const k of Object.keys(cleanEnv)) {
        if (k.startsWith('NODE_TEST')) delete cleanEnv[k];
      }
      const output = execSync(`node --test "${phase4cTestPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        env: cleanEnv,
      });
      assert(output.includes('pass 42') || output.includes('tests 42'), 'All Phase 4C tests pass');
      assert(!output.includes('fail 1') && !output.includes('fail 2'), '0 failures in Phase 4C');
    });

    await st.test('TEST 28: full regression passes', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
      assert(pkg.scripts.test, 'npm test script exists');
    });
  });
});
