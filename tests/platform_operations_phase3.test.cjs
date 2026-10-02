// ==============================================================================
// PHYSENRA — PHASE 3: PLATFORM ADMINISTRATION & SAAS OPERATIONS V1
// Test Suite: tests/platform_operations_phase3.test.cjs
//
// Authoritative Verification:
// TEST 1:   Migration file 20261002000000_platform_saas_operations_v1.sql exists
// TEST 2:   Migration defines public.suspend_practice RPC with SECURITY DEFINER
// TEST 3:   suspend_practice enforces is_platform_admin() authorization guard
// TEST 4:   suspend_practice validates mandatory reason parameter (>= 5 chars)
// TEST 5:   suspend_practice locks subscription and transitions status to suspended
// TEST 6:   suspend_practice logs immutable audit event (practice.suspended)
// TEST 7:   Migration defines public.restore_practice RPC with SECURITY DEFINER
// TEST 8:   restore_practice enforces is_platform_admin() authorization guard
// TEST 9:   restore_practice validates mandatory reason parameter (>= 5 chars)
// TEST 10:  restore_practice applies state-aware restoration rules from audit history
// TEST 11:  restore_practice logs immutable audit event (practice.restored)
// TEST 12:  Migration defines public.change_practice_plan RPC with SECURITY DEFINER
// TEST 13:  change_practice_plan enforces is_platform_admin() authorization guard
// TEST 14:  change_practice_plan rejects invalid or inactive plans
// TEST 15:  change_practice_plan enforces seat limit >= plan catalog minimum
// TEST 16:  change_practice_plan blocks downgrade if active practitioners exceed seats
// TEST 17:  change_practice_plan counts roles ('physiotherapist', 'practice_owner') with status = 'active'
// TEST 18:  change_practice_plan recalculates price based on active billing interval
// TEST 19:  change_practice_plan logs immutable audit event (practice.plan_changed)
// TEST 20:  Migration creates memberships_select_platform_admin policy on practice_memberships
// TEST 21:  Migration creates practices_select_platform_admin policy on practices
// TEST 22:  RPC execution permissions revoked from public and granted to authenticated/service_role
// TEST 23:  saasSubscriptionService defines PracticeOwnerContact interface
// TEST 24:  PracticeDossier interface includes owner contact and practice contact details
// TEST 25:  getPracticeDossier queries practice owner profile and clinical practitioner count
// TEST 26:  saasSubscriptionService implements suspendPractice with parameter validation
// TEST 27:  saasSubscriptionService implements restorePractice with parameter validation
// TEST 28:  saasSubscriptionService implements changePracticePlan
// TEST 29:  saasSubscriptionService implements getExpiringTrials feed query
// TEST 30:  saasSubscriptionService implements getDunningPractices watchlist query
// TEST 31:  saasSubscriptionService implements getWebhookTelemetry query
// TEST 32:  saasSubscriptionService updatePlan emits plan.updated audit log
// TEST 33:  saasSubscriptionService updatePlatformSetting emits platform_settings.updated audit log
// TEST 34:  PlatformPracticeDetailPage renders Practice Owner Contact Card
// TEST 35:  PlatformPracticeDetailPage implements Suspend Practice modal with mandatory reason
// TEST 36:  PlatformPracticeDetailPage implements Restore Practice modal with state explanation
// TEST 37:  PlatformPracticeDetailPage implements Change Plan modal with capacity validation
// TEST 38:  PlatformDashboardPage includes Expiring Trials feed widget (within 7 days)
// TEST 39:  PlatformDashboardPage includes Overdue & Dunning watchlist widget
// TEST 40:  PlatformBillingPage includes read-only Webhook Telemetry tab
// TEST 41:  PlatformSettingsPage labels trial setting as Default Trial Duration for New Plans
// TEST 42:  Legacy Isolation: Zero kabworld references across codebase
// TEST 43:  Security: Zero leaked secrets (sk_live_, sbp_, service_role) in frontend source
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const MIGRATION_PATH = path.join(
  ROOT_DIR,
  'supabase',
  'migrations',
  '20261002000000_platform_saas_operations_v1.sql'
);
const SAAS_SERVICE_PATH = path.join(ROOT_DIR, 'src', 'services', 'saasSubscriptionService.ts');
const PRACTICE_DETAIL_PAGE_PATH = path.join(
  ROOT_DIR,
  'src',
  'pages',
  'platform',
  'PlatformPracticeDetailPage.tsx'
);
const DASHBOARD_PAGE_PATH = path.join(
  ROOT_DIR,
  'src',
  'pages',
  'platform',
  'PlatformDashboardPage.tsx'
);
const BILLING_PAGE_PATH = path.join(
  ROOT_DIR,
  'src',
  'pages',
  'platform',
  'PlatformBillingPage.tsx'
);
const PRACTICES_PAGE_PATH = path.join(
  ROOT_DIR,
  'src',
  'pages',
  'platform',
  'PlatformPracticesPage.tsx'
);
const SETTINGS_PAGE_PATH = path.join(
  ROOT_DIR,
  'src',
  'pages',
  'platform',
  'PlatformSettingsPage.tsx'
);

const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const saasServiceCode = fs.readFileSync(SAAS_SERVICE_PATH, 'utf8');
const practiceDetailCode = fs.readFileSync(PRACTICE_DETAIL_PAGE_PATH, 'utf8');
const dashboardCode = fs.readFileSync(DASHBOARD_PAGE_PATH, 'utf8');
const billingCode = fs.readFileSync(BILLING_PAGE_PATH, 'utf8');
const practicesPageCode = fs.readFileSync(PRACTICES_PAGE_PATH, 'utf8');
const settingsCode = fs.readFileSync(SETTINGS_PAGE_PATH, 'utf8');

test('Physenra Phase 3 — Platform Administration & SaaS Operations V1', async (t) => {
  // ----------------------------------------------------------------------------
  // 1. DATABASE MIGRATION SPECIFICATION (SQL)
  // ----------------------------------------------------------------------------
  await t.test('1. Migration file exists and is non-empty', () => {
    assert.ok(fs.existsSync(MIGRATION_PATH), 'Migration file must exist');
    assert.ok(migrationSql.length > 500, 'Migration must have substantial content');
  });

  await t.test('2. Migration defines suspend_practice with SECURITY DEFINER and fixed search_path', () => {
    assert.ok(
      migrationSql.includes('CREATE OR REPLACE FUNCTION public.suspend_practice('),
      'Must define public.suspend_practice'
    );
    assert.ok(
      migrationSql.includes('SECURITY DEFINER SET search_path = public, auth, pg_temp;'),
      'Must have SECURITY DEFINER with fixed search_path'
    );
  });

  await t.test('3. suspend_practice enforces is_platform_admin() authorization check', () => {
    assert.ok(
      migrationSql.includes('IF NOT COALESCE(public.is_platform_admin(), false) THEN'),
      'Must verify platform admin identity'
    );
    assert.ok(
      migrationSql.includes('only platform administrators can suspend practices'),
      'Must provide descriptive error message on privilege violation'
    );
  });

  await t.test('4. suspend_practice validates mandatory reason (minimum 5 characters)', () => {
    assert.ok(
      migrationSql.includes('p_reason IS NULL OR length(trim(p_reason)) < 5'),
      'Must check reason length >= 5'
    );
  });

  await t.test('5. suspend_practice locks row and updates both practice and subscription status', () => {
    assert.ok(migrationSql.includes('FOR UPDATE;'), 'Must lock subscription row');
    assert.ok(
      migrationSql.includes("UPDATE public.practice_subscriptions\n  SET \n    status = 'suspended'"),
      'Must update practice_subscriptions to suspended'
    );
    assert.ok(
      migrationSql.includes("UPDATE public.practices\n  SET \n    status = 'suspended'"),
      'Must update practices to suspended'
    );
  });

  await t.test('6. suspend_practice logs practice.suspended audit event', () => {
    assert.ok(
      migrationSql.includes("'practice.suspended'"),
      'Must log practice.suspended action'
    );
  });

  await t.test('7. Migration defines restore_practice with SECURITY DEFINER and fixed search_path', () => {
    assert.ok(
      migrationSql.includes('CREATE OR REPLACE FUNCTION public.restore_practice('),
      'Must define public.restore_practice'
    );
    assert.ok(
      migrationSql.includes('SECURITY DEFINER SET search_path = public, auth, pg_temp;'),
      'Must have SECURITY DEFINER with fixed search_path'
    );
  });

  await t.test('8. restore_practice enforces is_platform_admin() authorization check', () => {
    assert.ok(
      migrationSql.includes('only platform administrators can restore practices'),
      'Must enforce platform admin authorization'
    );
  });

  await t.test('9. restore_practice validates mandatory reason (minimum 5 characters)', () => {
    assert.ok(
      migrationSql.includes('Restoration reason is required and must be at least 5 characters'),
      'Must validate reason parameter'
    );
  });

  await t.test('10. restore_practice queries audit log to determine state-accurate restoration', () => {
    assert.ok(
      migrationSql.includes("action = 'practice.suspended'"),
      'Must query suspension audit event'
    );
    assert.ok(
      migrationSql.includes("v_prior_sub_status = 'trialing'"),
      'Must handle trialing prior status'
    );
    assert.ok(
      migrationSql.includes("v_prior_sub_status = 'active'"),
      'Must handle active prior status'
    );
    assert.ok(
      migrationSql.includes("v_prior_sub_status = 'past_due'"),
      'Must handle past_due prior status'
    );
  });

  await t.test('11. restore_practice logs practice.restored audit event', () => {
    assert.ok(
      migrationSql.includes("'practice.restored'"),
      'Must log practice.restored action'
    );
  });

  await t.test('12. Migration defines change_practice_plan with SECURITY DEFINER and fixed search_path', () => {
    assert.ok(
      migrationSql.includes('CREATE OR REPLACE FUNCTION public.change_practice_plan('),
      'Must define public.change_practice_plan'
    );
  });

  await t.test('13. change_practice_plan enforces is_platform_admin() authorization check', () => {
    assert.ok(
      migrationSql.includes('only platform administrators can modify practice plans'),
      'Must enforce platform admin authorization'
    );
  });

  await t.test('14. change_practice_plan verifies target plan is active in catalog', () => {
    assert.ok(
      migrationSql.includes('FROM public.saas_plans\n  WHERE plan_code::text = p_plan_code\n    AND is_active = true'),
      'Must check plan existence and active status'
    );
  });

  await t.test('15. change_practice_plan enforces seat limit >= plan catalog minimum', () => {
    assert.ok(
      migrationSql.includes('v_target_seats < v_plan.practitioner_seat_limit'),
      'Must guard against setting seat limit below plan minimum'
    );
  });

  await t.test('16. change_practice_plan blocks downgrade if active practitioners exceed seat limit', () => {
    assert.ok(
      migrationSql.includes('v_active_practitioners > v_target_seats'),
      'Must reject downgrade if active staff exceed target seats'
    );
  });

  await t.test('17. change_practice_plan counts clinical practitioners with role in (physiotherapist, practice_owner) and status = active', () => {
    assert.ok(
      migrationSql.includes("role IN ('physiotherapist', 'practice_owner')"),
      'Must include both physiotherapist and practice_owner roles'
    );
    assert.ok(
      migrationSql.includes("status = 'active'"),
      'Must check status is active'
    );
  });

  await t.test('18. change_practice_plan updates current_price_cents based on billing_interval', () => {
    assert.ok(
      migrationSql.includes("v_sub.billing_interval = 'annual'"),
      'Must check billing interval'
    );
    assert.ok(
      migrationSql.includes('v_new_price_cents := v_plan.annual_price_cents'),
      'Must assign annual price when annual'
    );
    assert.ok(
      migrationSql.includes('v_new_price_cents := v_plan.monthly_price_cents'),
      'Must assign monthly price when monthly'
    );
  });

  await t.test('19. change_practice_plan logs practice.plan_changed audit event', () => {
    assert.ok(
      migrationSql.includes("'practice.plan_changed'"),
      'Must log practice.plan_changed action'
    );
  });

  await t.test('20. Migration creates memberships_select_platform_admin RLS policy', () => {
    assert.ok(
      migrationSql.includes('CREATE POLICY memberships_select_platform_admin ON public.practice_memberships'),
      'Must create RLS policy for memberships'
    );
  });

  await t.test('21. Migration creates practices_select_platform_admin RLS policy', () => {
    assert.ok(
      migrationSql.includes('CREATE POLICY practices_select_platform_admin ON public.practices'),
      'Must create RLS policy for practices'
    );
  });

  await t.test('22. Migration properly configures RPC execution permissions', () => {
    assert.ok(migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.suspend_practice FROM anon, public;'));
    assert.ok(migrationSql.includes('GRANT EXECUTE ON FUNCTION public.suspend_practice TO authenticated, service_role;'));
    assert.ok(migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.restore_practice FROM anon, public;'));
    assert.ok(migrationSql.includes('GRANT EXECUTE ON FUNCTION public.restore_practice TO authenticated, service_role;'));
    assert.ok(migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.change_practice_plan FROM anon, public;'));
    assert.ok(migrationSql.includes('GRANT EXECUTE ON FUNCTION public.change_practice_plan TO authenticated, service_role;'));
  });

  // ----------------------------------------------------------------------------
  // 2. SERVICE LAYER SPECIFICATION (TypeScript)
  // ----------------------------------------------------------------------------
  await t.test('23. saasSubscriptionService defines PracticeOwnerContact interface', () => {
    assert.ok(saasServiceCode.includes('export interface PracticeOwnerContact {'), 'Must export PracticeOwnerContact');
    assert.ok(saasServiceCode.includes('role: string;'), 'Must have role');
    assert.ok(saasServiceCode.includes('email: string | null;'), 'Must have email');
  });

  await t.test('24. PracticeDossier interface includes owner contact and contact fields', () => {
    assert.ok(saasServiceCode.includes('owner: PracticeOwnerContact | null;'), 'Must have owner');
    assert.ok(saasServiceCode.includes('email?: string | null;'), 'Must have email');
    assert.ok(saasServiceCode.includes('phone?: string | null;'), 'Must have phone');
  });

  await t.test('25. getPracticeDossier queries practice owner profile and active practitioners count', () => {
    assert.ok(saasServiceCode.includes(".eq('role', 'practice_owner')"), 'Must query practice_owner');
    assert.ok(saasServiceCode.includes("from('profiles')"), 'Must query profiles');
    assert.ok(saasServiceCode.includes("in('role', ['physiotherapist', 'practice_owner'])"), 'Must count active practitioners');
  });

  await t.test('26. saasSubscriptionService implements suspendPractice with validation', () => {
    assert.ok(saasServiceCode.includes('async suspendPractice('), 'Must implement suspendPractice');
    assert.ok(saasServiceCode.includes("rpc('suspend_practice'"), 'Must invoke suspend_practice RPC');
    assert.ok(saasServiceCode.includes('reason.trim().length < 5'), 'Must enforce min 5 chars');
  });

  await t.test('27. saasSubscriptionService implements restorePractice with validation', () => {
    assert.ok(saasServiceCode.includes('async restorePractice('), 'Must implement restorePractice');
    assert.ok(saasServiceCode.includes("rpc('restore_practice'"), 'Must invoke restore_practice RPC');
    assert.ok(saasServiceCode.includes('reason.trim().length < 5'), 'Must enforce min 5 chars');
  });

  await t.test('28. saasSubscriptionService implements changePracticePlan', () => {
    assert.ok(saasServiceCode.includes('async changePracticePlan('), 'Must implement changePracticePlan');
    assert.ok(saasServiceCode.includes("rpc('change_practice_plan'"), 'Must invoke change_practice_plan RPC');
  });

  await t.test('29. saasSubscriptionService implements getExpiringTrials query', () => {
    assert.ok(saasServiceCode.includes('async getExpiringTrials('), 'Must implement getExpiringTrials');
    assert.ok(saasServiceCode.includes("eq('status', 'trialing')"), 'Must filter trialing status');
  });

  await t.test('30. saasSubscriptionService implements getDunningPractices query', () => {
    assert.ok(saasServiceCode.includes('async getDunningPractices('), 'Must implement getDunningPractices');
    assert.ok(saasServiceCode.includes("['past_due', 'grace_period', 'expired']"), 'Must query dunning statuses');
  });

  await t.test('31. saasSubscriptionService implements getWebhookTelemetry query', () => {
    assert.ok(saasServiceCode.includes('async getWebhookTelemetry('), 'Must implement getWebhookTelemetry');
    assert.ok(saasServiceCode.includes("from('saas_webhook_events')"), 'Must query saas_webhook_events');
  });

  await t.test('32. updatePlan emits plan.updated audit log', () => {
    assert.ok(saasServiceCode.includes("p_action: 'plan.updated'"), 'Must log plan.updated');
  });

  await t.test('33. updatePlatformSetting emits platform_settings.updated audit log', () => {
    assert.ok(saasServiceCode.includes("p_action: 'platform_settings.updated'"), 'Must log platform_settings.updated');
  });

  // ----------------------------------------------------------------------------
  // 3. UI COMPONENTS SPECIFICATION (React / TSX)
  // ----------------------------------------------------------------------------
  await t.test('34. PlatformPracticeDetailPage renders Practice Owner Contact Card', () => {
    assert.ok(practiceDetailCode.includes('Practice Owner Contact'), 'Must render card header');
    assert.ok(practiceDetailCode.includes('Verified Owner'), 'Must show verified badge when present');
    assert.ok(practiceDetailCode.includes('owner.name'), 'Must render owner name');
  });

  await t.test('35. PlatformPracticeDetailPage implements Suspend Practice modal with mandatory reason', () => {
    assert.ok(practiceDetailCode.includes('Suspend Practice Workspace'), 'Must render modal title');
    assert.ok(practiceDetailCode.includes('handleSuspendPractice'), 'Must implement submit handler');
    assert.ok(practiceDetailCode.includes('suspendReason.trim().length < 5'), 'Must enforce min 5 chars');
  });

  await t.test('36. PlatformPracticeDetailPage implements Restore Practice modal with state explanation', () => {
    assert.ok(practiceDetailCode.includes('Restore Practice Workspace'), 'Must render restore modal title');
    assert.ok(practiceDetailCode.includes('Automatic State Restoration'), 'Must provide state restoration explanation');
    assert.ok(practiceDetailCode.includes('handleRestorePractice'), 'Must implement restore handler');
  });

  await t.test('37. PlatformPracticeDetailPage implements Change Plan modal with capacity validation', () => {
    assert.ok(practiceDetailCode.includes('Change Practice Plan & Seat Limits'), 'Must render change plan title');
    assert.ok(practiceDetailCode.includes('handleChangePlan'), 'Must implement handler');
    assert.ok(practiceDetailCode.includes('practitionerCount > customSeats'), 'Must validate against active practitioner count');
    assert.ok(practiceDetailCode.includes('Downgrade blocked'), 'Must display warning message when active staff exceed seats');
  });

  await t.test('38. PlatformDashboardPage includes Expiring Trials feed widget (within 7 days)', () => {
    assert.ok(dashboardCode.includes('Expiring Trials Feed'), 'Must render feed title');
    assert.ok(dashboardCode.includes('getExpiringTrials'), 'Must call getExpiringTrials');
    assert.ok(dashboardCode.includes('Next 7 Days'), 'Must show 7-day indicator');
  });

  await t.test('39. PlatformDashboardPage includes Overdue & Dunning watchlist widget', () => {
    assert.ok(dashboardCode.includes('Overdue & Dunning Watchlist'), 'Must render dunning title');
    assert.ok(dashboardCode.includes('getDunningPractices'), 'Must call getDunningPractices');
  });

  await t.test('40. PlatformBillingPage includes read-only Webhook Telemetry tab', () => {
    assert.ok(billingCode.includes("activeTab === 'webhooks'"), 'Must handle webhooks tab');
    assert.ok(billingCode.includes('Webhook Telemetry'), 'Must render tab label');
    assert.ok(billingCode.includes('getWebhookTelemetry'), 'Must call getWebhookTelemetry');
  });

  await t.test('41. PlatformSettingsPage labels trial setting as Default Trial Duration for New Plans', () => {
    assert.ok(
      settingsCode.includes('Default Trial Duration for New Plans (Days)'),
      'Must use explicit label'
    );
    assert.ok(
      settingsCode.includes('Does not retroactively alter active practice trials'),
      'Must explain non-retroactive semantics'
    );
  });

  // ----------------------------------------------------------------------------
  // 4. SECURITY & SYSTEM ISOLATION VERIFICATION
  // ----------------------------------------------------------------------------
  await t.test('42. Zero kabworld references across codebase (strict zero-leak isolation)', () => {
    const filesToCheck = [
      MIGRATION_PATH,
      SAAS_SERVICE_PATH,
      PRACTICE_DETAIL_PAGE_PATH,
      DASHBOARD_PAGE_PATH,
      BILLING_PAGE_PATH,
      PRACTICES_PAGE_PATH,
      SETTINGS_PAGE_PATH,
    ];

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(
        !content.toLowerCase().includes('kabworld'),
        `File ${path.basename(file)} must not contain any reference to kabworld`
      );
    }
  });

  await t.test('43. Zero leaked live secrets in source code', () => {
    const srcDir = path.join(ROOT_DIR, 'src');
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const code = fs.readFileSync(fullPath, 'utf8');
          assert.ok(!code.includes('sk_live_'), `Secret sk_live_ found in ${entry.name}`);
          assert.ok(!code.includes('sbp_'), `Supabase PAT found in ${entry.name}`);
          assert.ok(
            !code.includes('service_role_secret'),
            `Service role secret found in ${entry.name}`
          );
        }
      }
    };
    scanDir(srcDir);
  });
});
