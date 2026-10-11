// ==============================================================================
// PHYSENRA — MANUAL BANK TRANSFER & ADMIN PAYMENT CONFIRMATION V1 TEST SUITE
// File: tests/manual_bank_transfer_v1.test.cjs
//
// Governs:
// 1. Bank transfer configuration defaults to DISABLED and UNVERIFIED
// 2. Strict validation: missing or unverified details prevent enablement
// 3. Strict RBAC: only Platform Admins can configure and confirm/reject payments
// 4. Practice owners cannot approve or self-settle bank transfers
// 5. Customer reference submission transitions to 'submitted_for_review' WITHOUT
//    activating subscription or marking invoice paid
// 6. Admin confirmation triggers atomic settlement via process_subscription_payment_settlement
// 7. Admin rejection requires a reason >= 5 characters and leaves invoice open
// 8. Idempotency: duplicate references cannot be confirmed twice
// 9. UI integration: Plan Change Modal, Invoices tables, Invoice Detail, Admin Queue
// 10. Paystack TEST checkout coexistence, zero Kabworld references, zero exposed secrets
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const migrationPath = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20261009010000_manual_bank_transfer_foundation.sql'
);
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

const fixMigrationPath = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20261011220000_fix_submit_bank_transfer_reference_signature.sql'
);
const fixMigrationContent = fs.readFileSync(fixMigrationPath, 'utf8');

const servicePath = path.join(SRC_DIR, 'services', 'saasSubscriptionService.ts');
const serviceContent = fs.readFileSync(servicePath, 'utf8');

const databaseTypesPath = path.join(SRC_DIR, 'types', 'database.ts');
const databaseTypesContent = fs.readFileSync(databaseTypesPath, 'utf8');

const modelsPath = path.join(SRC_DIR, 'types', 'models.ts');
const modelsContent = fs.readFileSync(modelsPath, 'utf8');

const practiceBillingPath = path.join(SRC_DIR, 'pages', 'billing', 'PracticeBillingPage.tsx');
const practiceBillingContent = fs.readFileSync(practiceBillingPath, 'utf8');

const practiceInvoiceDetailPath = path.join(SRC_DIR, 'pages', 'billing', 'PracticeInvoiceDetailPage.tsx');
const practiceInvoiceDetailContent = fs.readFileSync(practiceInvoiceDetailPath, 'utf8');

const platformSettingsPath = path.join(SRC_DIR, 'pages', 'platform', 'PlatformSettingsPage.tsx');
const platformSettingsContent = fs.readFileSync(platformSettingsPath, 'utf8');

const platformBillingPath = path.join(SRC_DIR, 'pages', 'platform', 'PlatformBillingPage.tsx');
const platformBillingContent = fs.readFileSync(platformBillingPath, 'utf8');

test('=== PHYSENRA MANUAL BANK TRANSFER & ADMIN PAYMENT CONFIRMATION V1 SUITE ===', async (t) => {
  // ----------------------------------------------------------------------------
  // SUITE 1: Database Foundation & Safe Default Configuration
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 1: Database Foundation & Default Disabled State ---', async (t1) => {
    await t1.test('TEST 1: Table public.saas_bank_transfer_requests exists with full auditing schema', () => {
      assert.match(migrationContent, /CREATE TABLE IF NOT EXISTS public\.saas_bank_transfer_requests/i);
      assert.match(migrationContent, /request_number text/i);
      assert.match(migrationContent, /practice_id uuid NOT NULL REFERENCES public\.practices/i);
      assert.match(migrationContent, /invoice_id uuid NOT NULL REFERENCES public\.saas_invoices/i);
      assert.match(migrationContent, /subscription_id uuid NOT NULL/i);
      assert.match(migrationContent, /amount_cents bigint NOT NULL/i);
      assert.match(migrationContent, /status text NOT NULL DEFAULT 'pending_transfer'/i);
      assert.match(migrationContent, /bank_name text NOT NULL/i);
      assert.match(migrationContent, /account_number text NOT NULL/i);
      assert.match(migrationContent, /account_name text NOT NULL/i);
      assert.match(migrationContent, /customer_reference text/i);
      assert.match(migrationContent, /reviewed_by uuid REFERENCES public\.profiles\(id\)/i);
      assert.match(migrationContent, /payment_id uuid REFERENCES public\.saas_payments/i);
    });

    await t1.test('TEST 2: Sequence saas_bank_transfer_request_seq formats human-readable IDs', () => {
      assert.match(migrationContent, /CREATE SEQUENCE IF NOT EXISTS public\.saas_bank_transfer_request_seq/);
      assert.match(migrationContent, /'PHY-BTR-' \|\| to_char\(now\(\), 'YYYY'\) \|\| '-' \|\| lpad/i);
    });

    await t1.test('TEST 3: Platform settings seeds bank transfer config as STRICTLY DISABLED by default', () => {
      assert.match(migrationContent, /'bank_transfer_config'/);
      assert.match(migrationContent, /'is_enabled',\s*false/);
      assert.match(migrationContent, /'is_verified',\s*false/);
      assert.match(migrationContent, /'bank_name',\s*''/);
      assert.match(migrationContent, /'account_number',\s*''/);
    });

    await t1.test('TEST 4: Partial unique index prevents duplicate active requests for the same invoice', () => {
      assert.match(
        migrationContent,
        /CREATE UNIQUE INDEX IF NOT EXISTS uq_active_invoice_bank_transfer\s+ON public\.saas_bank_transfer_requests\s*\(invoice_id\)\s*WHERE status IN \('pending_transfer', 'submitted_for_review'\)/
      );
    });

    await t1.test('TEST 5: Partial unique index prevents settling duplicate customer references', () => {
      assert.match(
        migrationContent,
        /CREATE UNIQUE INDEX IF NOT EXISTS uq_confirmed_bank_transfer_ref\s+ON public\.saas_bank_transfer_requests\s*\(customer_reference\)\s*WHERE status = 'confirmed'/
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 2: Authoritative RPC Security & RBAC Enforcement
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 2: RPC Security & RBAC Guards ---', async (t2) => {
    await t2.test('TEST 6: get_active_bank_transfer_config returns disabled response when unverified or disabled', () => {
      assert.match(migrationContent, /CREATE OR REPLACE FUNCTION public\.get_active_bank_transfer_config/);
      assert.match(migrationContent, /IF NOT v_is_enabled OR NOT v_is_verified/);
      assert.match(migrationContent, /'is_available', false/);
      assert.match(migrationContent, /Bank transfer is not currently available/);
    });

    await t2.test('TEST 7: update_bank_transfer_config enforces platform admin check and resets verification', () => {
      assert.match(migrationContent, /CREATE OR REPLACE FUNCTION public\.update_bank_transfer_config/);
      assert.match(migrationContent, /IF NOT COALESCE\(public\.is_platform_admin\(\), false\) THEN/);
      assert.match(migrationContent, /Only Platform Administrators may update receiving bank configuration/);
      assert.match(migrationContent, /'is_verified', false/);
      assert.match(migrationContent, /'is_enabled', false/);
    });

    await t2.test('TEST 8: verify_and_enable_bank_transfer_config rejects enablement if account details incomplete', () => {
      assert.match(migrationContent, /CREATE OR REPLACE FUNCTION public\.verify_and_enable_bank_transfer_config/);
      assert.match(migrationContent, /IF v_bank_name = '' OR v_acct_name = '' OR v_acct_num = '' THEN/);
      assert.match(migrationContent, /IF length\(v_acct_num\) < 10 THEN/);
      assert.match(migrationContent, /Account number must be a valid Nigerian bank account number \(at least 10 digits\)/);
    });

    await t2.test('TEST 9: create_bank_transfer_payment_request blocks creation when config is disabled', () => {
      assert.match(migrationContent, /CREATE OR REPLACE FUNCTION public\.create_bank_transfer_payment_request/);
      assert.match(migrationContent, /v_cfg := public\.get_active_bank_transfer_config\(\);/);
      assert.match(migrationContent, /IF NOT COALESCE\(\(v_cfg->>'is_available'\)::boolean, false\) THEN/);
      assert.match(migrationContent, /Bank transfer is not currently available/);
    });

    await t2.test('TEST 10: confirm_bank_transfer_payment requires Platform Admin and locks request during settlement', () => {
      assert.match(migrationContent, /CREATE OR REPLACE FUNCTION public\.confirm_bank_transfer_payment/);
      assert.match(migrationContent, /IF NOT COALESCE\(public\.is_platform_admin\(\), false\) THEN/);
      assert.match(migrationContent, /SELECT \* INTO v_req\s*FROM public\.saas_bank_transfer_requests\s*WHERE id = p_request_id\s*FOR UPDATE/);
      assert.match(migrationContent, /IF v_req\.status = 'confirmed' THEN/);
      assert.match(migrationContent, /'is_already_confirmed', true/);
    });

    await t2.test('TEST 11: confirm_bank_transfer_payment atomically invokes process_subscription_payment_settlement', () => {
      assert.match(
        migrationContent,
        /v_settle := public\.process_subscription_payment_settlement\(/
      );
      assert.match(migrationContent, /p_gateway := 'manual_bank_transfer'/);
      assert.match(migrationContent, /p_payment_method := 'bank_transfer'/);
    });

    await t2.test('TEST 12: reject_bank_transfer_payment requires reason with minimum length 5 characters', () => {
      assert.match(migrationContent, /CREATE OR REPLACE FUNCTION public\.reject_bank_transfer_payment/);
      assert.match(migrationContent, /IF p_rejection_reason IS NULL OR length\(TRIM\(p_rejection_reason\)\) < 5 THEN/);
      assert.match(migrationContent, /Rejection reason is required and must be at least 5 characters/);
      assert.match(migrationContent, /status = 'rejected'/);
    });

    await t2.test('TEST 13: submit_bank_transfer_reference transitions to submitted_for_review without settling', () => {
      assert.match(migrationContent, /CREATE OR REPLACE FUNCTION public\.submit_bank_transfer_reference/);
      assert.match(migrationContent, /status = 'submitted_for_review'/);
      assert.doesNotMatch(
        migrationContent.substring(migrationContent.indexOf('submit_bank_transfer_reference'), migrationContent.indexOf('confirm_bank_transfer_payment')),
        /process_subscription_payment_settlement/
      );
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 3: TypeScript Service Layer Verification
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 3: Service Layer Implementation ---', async (t3) => {
    await t3.test('TEST 14: saasSubscriptionService exposes all 10 authoritative bank transfer methods', () => {
      assert.match(serviceContent, /getActiveBankTransferConfig\(\)/);
      assert.match(serviceContent, /getBankTransferConfigAdmin\(\)/);
      assert.match(serviceContent, /updateBankTransferConfig\(/);
      assert.match(serviceContent, /verifyAndEnableBankTransferConfig\(/);
      assert.match(serviceContent, /createBankTransferPaymentRequest\(/);
      assert.match(serviceContent, /submitBankTransferReference\(/);
      assert.match(serviceContent, /confirmBankTransferPayment\(/);
      assert.match(serviceContent, /rejectBankTransferPayment\(/);
      assert.match(serviceContent, /cancelBankTransferRequest\(/);
      assert.match(serviceContent, /getPracticeBankTransferRequests\(/);
      assert.match(serviceContent, /getAllBankTransferRequests\(\)/);
    });

    await t3.test('TEST 15: Database contracts in database.ts define saas_bank_transfer_requests and all 8 RPCs', () => {
      assert.match(databaseTypesContent, /saas_bank_transfer_requests:\s*\{/);
      assert.match(databaseTypesContent, /get_active_bank_transfer_config:\s*\{/);
      assert.match(databaseTypesContent, /update_bank_transfer_config:\s*\{/);
      assert.match(databaseTypesContent, /verify_and_enable_bank_transfer_config:\s*\{/);
      assert.match(databaseTypesContent, /create_bank_transfer_payment_request:\s*\{/);
      assert.match(databaseTypesContent, /submit_bank_transfer_reference:\s*\{/);
      assert.match(databaseTypesContent, /confirm_bank_transfer_payment:\s*\{/);
      assert.match(databaseTypesContent, /reject_bank_transfer_payment:\s*\{/);
      assert.match(databaseTypesContent, /cancel_bank_transfer_payment_request:\s*\{/);
    });

    await t3.test('TEST 16: Models in models.ts define SaasBankTransferRequestWithRelations', () => {
      assert.match(modelsContent, /export type SaasBankTransferRequestWithRelations = SaasBankTransferRequest & \{/);
      assert.match(modelsContent, /export type BankTransferStatus =/);
      assert.match(modelsContent, /export interface BankTransferConfig/);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 4: Practice Owner UI Integration (PracticeBillingPage & InvoiceDetailPage)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 4: Practice Owner UI Experience ---', async (t4) => {
    await t4.test('TEST 17: Plan change modal displays disabled Bank Transfer option when unverified/disabled', () => {
      assert.match(practiceBillingContent, /paymentMethod === 'bank_transfer'/);
      assert.match(practiceBillingContent, /!bankConfig\?\.is_available/);
      assert.match(
        practiceBillingContent,
        /Bank transfer is not currently available\. Please use the available payment method or contact Physenra support\./
      );
    });

    await t4.test('TEST 18: Card/Paystack is selected by default in upgrade checkout modal', () => {
      assert.match(practiceBillingContent, /const \[paymentMethod, setPaymentMethod\] = useState<'paystack' \| 'bank_transfer'>\('paystack'\);/);
    });

    await t4.test('TEST 19: Invoices tables render transfer status pill and View Transfer button for active request', () => {
      assert.match(practiceBillingContent, /activeBtr\?\.status === 'submitted_for_review'\s*\?\s*\(/);
      assert.match(practiceBillingContent, /activeBtr\?\.status === 'pending_transfer'\s*\?\s*\(/);
      assert.match(practiceBillingContent, /setSelectedTransferRequest\(activeBtr\)/);
      assert.match(practiceBillingContent, /View Transfer/);
    });

    await t4.test('TEST 20: Modal 4 renders copy button, amount, instructions, and customer reference form', () => {
      assert.match(practiceBillingContent, /MODAL 4: MANUAL BANK TRANSFER PAYMENT REQUEST DETAILS/);
      assert.match(practiceBillingContent, /handleCopyAccount\(selectedTransferRequest\.account_number\)/);
      assert.match(practiceBillingContent, /handleSubmitReference/);
      assert.match(practiceBillingContent, /handleCancelTransferRequest/);
    });

    await t4.test('TEST 21: PracticeInvoiceDetailPage renders dedicated bank transfer card and copy button', () => {
      assert.match(practiceInvoiceDetailContent, /Manual Bank Transfer: \{bankTransferRequest\.request_number\}/);
      assert.match(practiceInvoiceDetailContent, /handleCopyAccount\(bankTransferRequest\.account_number\)/);
      assert.match(practiceInvoiceDetailContent, /handleSubmitReference/);
      assert.match(practiceInvoiceDetailContent, /Manual Bank Transfer \(Admin Verified\)/);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 5: Platform Admin Experience (Settings & Review Queue)
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 5: Platform Admin UI Experience ---', async (t5) => {
    await t5.test('TEST 22: PlatformSettingsPage renders receiving account card with Configuration Pending badge', () => {
      assert.match(platformSettingsContent, /SaaS Manual Bank Transfer Receiving Account/);
      assert.match(platformSettingsContent, /Configuration Pending \(Disabled\)/);
      assert.match(platformSettingsContent, /Verified & Enabled/);
      assert.match(platformSettingsContent, /Verify & Enable/);
      assert.match(platformSettingsContent, /Disable Bank Transfer/);
    });

    await t5.test('TEST 23: PlatformBillingPage renders Bank Transfer Queue tab', () => {
      assert.match(platformBillingContent, /activeTab === 'transfers'/);
      assert.match(platformBillingContent, /Bank Transfer Queue/);
      assert.match(platformBillingContent, /Confirm Bank Transfer Payment/);
      assert.match(platformBillingContent, /Reject Bank Transfer Payment/);
    });

    await t5.test('TEST 24: PlatformBillingPage Confirm modal warns that confirmation triggers authoritative settlement', () => {
      assert.match(platformBillingContent, /Confirming will mark the invoice paid and immediately activate the subscription/);
      assert.match(platformBillingContent, /confirmBankTransferPayment/);
    });

    await t5.test('TEST 25: PlatformBillingPage Reject modal requires explicit rejection reason', () => {
      assert.match(platformBillingContent, /Mandatory Rejection Reason/);
      assert.match(platformBillingContent, /rejectBankTransferPayment/);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 6: Paystack Coexistence, Security & Isolation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 6: Paystack TEST Mode Coexistence & Production Safety ---', async (t6) => {
    const initPaymentPath = path.join(ROOT_DIR, 'netlify', 'functions', 'initialize-payment.cjs');
    const initContent = fs.readFileSync(initPaymentPath, 'utf8');

    const verifyPaymentPath = path.join(ROOT_DIR, 'netlify', 'functions', 'verify-payment.cjs');
    const verifyContent = fs.readFileSync(verifyPaymentPath, 'utf8');

    const webhookPath = path.join(ROOT_DIR, 'netlify', 'functions', 'paystack-webhook.cjs');
    const webhookContent = fs.readFileSync(webhookPath, 'utf8');

    const libPaystackPath = path.join(ROOT_DIR, 'netlify', 'functions', 'lib', 'paystack.cjs');
    const libPaystackContent = fs.readFileSync(libPaystackPath, 'utf8');

    await t6.test('TEST 26: Paystack initialize-payment endpoint remains intact and functional', () => {
      assert.match(initContent, /initializePaystackTransaction/);
      assert.match(libPaystackContent, /api\.paystack\.co\/transaction\/initialize/);
      assert.match(initContent, /PAYSTACK_SECRET_KEY/);
      assert.match(initContent, /SUPABASE_SERVICE_ROLE_KEY/);
    });

    await t6.test('TEST 27: Paystack verify-payment endpoint remains intact and functional', () => {
      assert.match(verifyContent, /verifyPaystackTransaction/);
      assert.match(libPaystackContent, /api\.paystack\.co\/transaction\/verify/);
      assert.match(verifyContent, /process_subscription_payment_settlement/);
    });

    await t6.test('TEST 28: Paystack webhook endpoint remains intact with HMAC-SHA512 verification', () => {
      assert.match(webhookContent, /x-paystack-signature/);
      assert.match(webhookContent, /verifyPaystackSignature/);
      assert.match(libPaystackContent, /createHmac\('sha512'/);
      assert.match(webhookContent, /saas_webhook_events/);
    });

    await t6.test('TEST 29: Zero Kabworld references across all modified files', () => {
      assert.doesNotMatch(migrationContent, /kabworld/i);
      assert.doesNotMatch(serviceContent, /kabworld/i);
      assert.doesNotMatch(practiceBillingContent, /kabworld/i);
      assert.doesNotMatch(practiceInvoiceDetailContent, /kabworld/i);
      assert.doesNotMatch(platformSettingsContent, /kabworld/i);
      assert.doesNotMatch(platformBillingContent, /kabworld/i);
    });

    await t6.test('TEST 30: Zero hardcoded secrets in source files', () => {
      assert.doesNotMatch(serviceContent, /sk_live_/i);
      assert.doesNotMatch(serviceContent, /sk_test_/i);
      assert.doesNotMatch(practiceBillingContent, /sk_live_/i);
      assert.doesNotMatch(practiceBillingContent, /sk_test_/i);
      assert.doesNotMatch(platformSettingsContent, /sk_live_/i);
      assert.doesNotMatch(platformSettingsContent, /sk_test_/i);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 7: Verification RPC Signature, Schema Cache & Multi-Tenant Boundaries
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 7: Verification RPC Signature & Schema Cache Integrity ---', async (t7) => {
    await t7.test('TEST 31: verify_and_enable_bank_transfer_config accepts p_enable and p_enabled with defaults', () => {
      assert.match(
        migrationContent,
        /CREATE OR REPLACE FUNCTION public\.verify_and_enable_bank_transfer_config\(\s*p_enable boolean DEFAULT NULL,\s*p_enabled boolean DEFAULT NULL\s*\)/
      );
      assert.match(
        migrationContent,
        /v_effective_enable := COALESCE\(p_enable, p_enabled, true\);/
      );
    });

    await t7.test('TEST 32: Database types contracts match verify_and_enable_bank_transfer_config signature', () => {
      assert.match(databaseTypesContent, /verify_and_enable_bank_transfer_config:\s*\{/);
      assert.match(databaseTypesContent, /p_enable\?:\s*boolean;/);
      assert.match(databaseTypesContent, /p_enabled\?:\s*boolean;/);
    });

    await t7.test('TEST 33: update_bank_transfer_config strictly resets is_verified and is_enabled to false', () => {
      assert.match(migrationContent, /'is_enabled',\s*false/);
      assert.match(migrationContent, /'is_verified',\s*false/);
      assert.match(migrationContent, /'platform_settings\.bank_transfer_updated'/);
    });

    await t7.test('TEST 34: Migration records into schema_migrations and issues NOTIFY pgrst reload schema', () => {
      assert.match(
        migrationContent,
        /INSERT INTO supabase_migrations\.schema_migrations\s*\(version,\s*name\)\s*VALUES\s*\('20261009010000',\s*'manual_bank_transfer_foundation'\)/
      );
      assert.match(migrationContent, /NOTIFY pgrst,\s*'reload schema';/);
    });

    await t7.test('TEST 35: Patient invoices, clinical visits, and clinical wallets are untouched', () => {
      assert.doesNotMatch(migrationContent, /CREATE TABLE public\.patient_invoices/i);
      assert.doesNotMatch(migrationContent, /CREATE TABLE public\.patients/i);
      assert.doesNotMatch(migrationContent, /CREATE TABLE public\.clinical_visits/i);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 8: Bank Transfer Request Submission Feedback & State Preservation
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 8: Bank Transfer Submission Feedback & State Preservation ---', async (t8) => {
    await t8.test('TEST 36: submit_bank_transfer_reference disallows using request_number as customer reference', () => {
      assert.match(
        migrationContent,
        /UPPER\(TRIM\(p_customer_reference\)\)\s*=\s*UPPER\(TRIM\(v_req\.request_number\)\)/
      );
      assert.match(
        migrationContent,
        /Please enter the transaction reference from your bank receipt or payment session, not the Physenra request number/
      );
    });

    await t8.test('TEST 37: submit_bank_transfer_reference returns full updated request row in JSON response', () => {
      assert.match(migrationContent, /RETURNING \* INTO v_updated;/);
      assert.match(migrationContent, /'request',\s*row_to_json\(v_updated\)/);
    });

    await t8.test('TEST 38: saasSubscriptionService.submitBankTransferReference returns complete SaasBankTransferRequest', () => {
      assert.match(
        serviceContent,
        /submitBankTransferReference\([\s\S]*?\):\s*Promise<SaasBankTransferRequest>/
      );
      assert.match(
        serviceContent,
        /\.from\('saas_bank_transfer_requests'\)[\s\S]*?\.select\('\*'\)[\s\S]*?\.eq\('id',\s*requestId\)/
      );
    });

    await t8.test('TEST 39: PracticeBillingPage renders dedicated inline modal feedback alerts inside Modal 4', () => {
      assert.match(practiceBillingContent, /modalErrorMessage\s*&&\s*\(/);
      assert.match(practiceBillingContent, /modalSuccessMessage\s*&&\s*\(/);
      assert.match(practiceBillingContent, /setModalErrorMessage/);
      assert.match(practiceBillingContent, /setModalSuccessMessage/);
    });

    await t8.test('TEST 40: PracticeBillingPage disables submission and renders spinner while submitting', () => {
      assert.match(practiceBillingContent, /disabled=\{submittingReference\}/);
      assert.match(practiceBillingContent, /Submitting for Review\.\.\./);
    });

    await t8.test('TEST 41: PracticeInvoiceDetailPage validates against request_number and renders submission spinner', () => {
      assert.match(
        practiceInvoiceDetailContent,
        /trimmedRef\.toUpperCase\(\)\s*===\s*bankTransferRequest\.request_number\.toUpperCase\(\)/
      );
      assert.match(practiceInvoiceDetailContent, /disabled=\{submittingReference\}/);
      assert.match(practiceInvoiceDetailContent, /Submitting Reference\.\.\./);
    });
  });

  // ----------------------------------------------------------------------------
  // SUITE 9: RPC Signature Mismatch Resolution & Request ID Normalization
  // ----------------------------------------------------------------------------
  await t.test('--- SUITE 9: RPC Signature Mismatch Resolution & ID Normalization ---', async (t9) => {
    await t9.test('TEST 42: Migration 20261011220000 drops legacy signature and implements flexible defaults', () => {
      assert.match(fixMigrationContent, /DROP FUNCTION IF EXISTS public\.submit_bank_transfer_reference\(uuid, text, timestamptz, text\);/i);
      assert.match(fixMigrationContent, /p_request_id uuid DEFAULT NULL/i);
      assert.match(fixMigrationContent, /p_customer_reference text DEFAULT NULL/i);
      assert.match(fixMigrationContent, /p_transferred_at timestamptz DEFAULT NULL/i);
      assert.match(fixMigrationContent, /p_notes text DEFAULT NULL/i);
      assert.match(fixMigrationContent, /p_id uuid DEFAULT NULL/i);
      assert.match(fixMigrationContent, /v_effective_id := COALESCE\(p_request_id, p_id\);/i);
      assert.match(fixMigrationContent, /Bank transfer request ID is required to submit transfer reference/i);
    });

    await t9.test('TEST 43: create_bank_transfer_payment_request returns both id and request_id in JSON payload', () => {
      assert.match(fixMigrationContent, /'request_id', v_req_id/);
      assert.match(fixMigrationContent, /'id', v_req_id/);
      assert.match(migrationContent, /'request_id', v_req_id/);
      assert.match(migrationContent, /'id', v_req_id/);
    });

    await t9.test('TEST 44: TypeScript contracts in database.ts support optional p_request_id and p_id for PostgREST', () => {
      assert.match(databaseTypesContent, /submit_bank_transfer_reference:\s*\{/);
      assert.match(databaseTypesContent, /p_request_id\?:\s*string/);
      assert.match(databaseTypesContent, /p_id\?:\s*string/);
    });

    await t9.test('TEST 45: saasSubscriptionService.createBankTransferPaymentRequest normalizes both id and request_id', () => {
      assert.match(serviceContent, /const reqId = \(data as any\)\?\.id \|\| \(data as any\)\?\.request_id;/);
      assert.match(serviceContent, /id: reqId,/);
    });

    await t9.test('TEST 46: saasSubscriptionService.submitBankTransferReference verifies requestId and sends both aliases', () => {
      assert.match(serviceContent, /if \(!requestId\) \{[\s\S]*?throw new Error\('Bank transfer request ID is required/);
      assert.match(serviceContent, /p_request_id: requestId,/);
      assert.match(serviceContent, /p_id: requestId,/);
    });

    await t9.test('TEST 47: PracticeBillingPage normalizes request.id in openTransferModal and resolves ID in submit and cancel', () => {
      assert.match(practiceBillingContent, /id: request\.id \|\| request\.request_id,/);
      assert.match(practiceBillingContent, /const reqId = selectedTransferRequest\.id \|\| \(selectedTransferRequest as any\)\.request_id;/);
      assert.match(practiceBillingContent, /const effectiveId = requestId \|\| selectedTransferRequest\?\.id \|\| \(selectedTransferRequest as any\)\?\.request_id;/);
    });

    await t9.test('TEST 48: PracticeInvoiceDetailPage defensively resolves reqId before submitting transfer reference', () => {
      assert.match(practiceInvoiceDetailContent, /const reqId = bankTransferRequest\.id \|\| \(bankTransferRequest as any\)\.request_id;/);
      assert.match(practiceInvoiceDetailContent, /if \(!reqId\) \{/);
    });
  });
});


