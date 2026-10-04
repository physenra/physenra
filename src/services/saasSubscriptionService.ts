// ==============================================================================
// PHYSENRA SAAS SUBSCRIPTIONS & PLATFORM ADMINISTRATION SERVICE LAYER
// File: src/services/saasSubscriptionService.ts
//
// Governs:
// 1. Public SaaS Plan Catalog retrieval
// 2. Atomic Practice Onboarding & Subscription Initialization (register_practice_and_subscribe)
// 3. Practice Subscription state & access checks (practice_is_writable)
// 4. Platform Administration Console operations (KPIs, Dossiers, Trial Overrides)
// 5. Paystack settlement & idempotent webhook ingestion
// 6. Hardened Clinical Privacy: ZERO patient PHI or clinical records accessed
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  SaasPlan,
  SaasPlanUpdate,
  PracticeSubscription,
  SaasInvoice,
  SaasInvoiceLine,
  SaasPayment,
  SaasBillingCycle,
  SaasTrialExtension,
  PlatformSetting,
  PlatformKPIs,
  RegisterPracticeAndSubscribePayload,
  RegisterPracticeAndSubscribeResponse,
  SaasPlanCode,
  SaasPaymentGateway,
} from '../types/models';

export interface PracticeOwnerContact {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email: string | null;
  phone?: string | null;
  role: string;
  joined_at?: string | null;
}

export interface PracticeDossier {
  practice: {
    id: string;
    name: string;
    slug: string;
    status: string;
    country: string;
    timezone: string;
    email?: string | null;
    phone?: string | null;
    created_at: string;
  };
  owner: PracticeOwnerContact | null;
  subscription: (PracticeSubscription & { plan?: SaasPlan }) | null;
  trialExtensions: SaasTrialExtension[];
  invoices: (SaasInvoice & { lines?: SaasInvoiceLine[] })[];
  payments: SaasPayment[];
  practitionerCount: number;
}

export const saasSubscriptionService = {
  // ----------------------------------------------------------------------------
  // 1. PUBLIC & ONBOARDING OPERATIONS
  // ----------------------------------------------------------------------------

  /**
   * Fetches public, active SaaS plans for the public pricing page.
   */
  async getPublicPlans(): Promise<SaasPlan[]> {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('monthly_price_cents', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch SaaS plans: ${error.message}`);
    }

    return (data as SaasPlan[]) || [];
  },

  /**
   * Fetches a specific plan by its unique code.
   */
  async getPlanByCode(planCode: SaasPlanCode): Promise<SaasPlan | null> {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('plan_code', planCode)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch plan ${planCode}: ${error.message}`);
    }

    return (data as SaasPlan) || null;
  },

  /**
   * Atomically registers a new practice, assigns owner role, and sets up 14-day trial subscription.
   */
  async registerPracticeAndSubscribe(
    payload: RegisterPracticeAndSubscribePayload
  ): Promise<RegisterPracticeAndSubscribeResponse> {
    // Verify valid authenticated session and access token exists before invoking the RPC
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('Authentication required. Please sign in to complete practice registration.');
    }

    const { data, error } = await supabase.rpc('register_practice_and_subscribe', {
      p_practice_name: payload.practice_name,
      p_slug: payload.slug,
      p_plan_code: payload.plan_code,
      p_billing_interval: payload.billing_interval || 'monthly',
      p_country: payload.country || 'NG',
      p_timezone: payload.timezone || 'Africa/Lagos',
    });

    if (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }

    return data as unknown as RegisterPracticeAndSubscribeResponse;
  },

  // ----------------------------------------------------------------------------
  // 2. TENANT-PLANE SUBSCRIPTION OPERATIONS
  // ----------------------------------------------------------------------------

  /**
   * Retrieves the current practice's authoritative subscription details.
   */
  async getPracticeSubscription(
    practiceId?: string
  ): Promise<(PracticeSubscription & { plan?: SaasPlan }) | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data: subData, error: subError } = await supabase
      .from('practice_subscriptions')
      .select('*')
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (subError) {
      throw new Error(`Failed to fetch subscription: ${subError.message}`);
    }

    if (!subData) return null;

    const subscription = subData as PracticeSubscription;

    // Attach plan details
    const { data: planData } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .maybeSingle();

    return {
      ...subscription,
      plan: (planData as SaasPlan) || undefined,
    };
  },

  /**
   * Evaluates whether the practice workspace is writable under its subscription status.
   */
  async isPracticeWritable(practiceId?: string): Promise<boolean> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) return false;

    const { data, error } = await supabase.rpc('practice_is_writable', {
      p_practice_id: activePracticeId,
    });

    if (error) {
      console.error('Error checking practice writability:', error);
      return false;
    }

    return Boolean(data);
  },

  /**
   * Retrieves SaaS invoices for the practice.
   */
  async getPracticeInvoices(practiceId?: string): Promise<SaasInvoice[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) return [];

    const { data, error } = await supabase
      .from('saas_invoices')
      .select('*')
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch practice invoices: ${error.message}`);
    }

    return (data as SaasInvoice[]) || [];
  },

  /**
   * Retrieves line items for a specific SaaS invoice.
   */
  async getInvoiceLines(invoiceId: string): Promise<SaasInvoiceLine[]> {
    const { data, error } = await supabase
      .from('saas_invoice_lines')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (error) {
      throw new Error(`Failed to fetch invoice lines: ${error.message}`);
    }

    return (data as SaasInvoiceLine[]) || [];
  },

  /**
   * Retrieves SaaS payments for the practice.
   */
  async getPracticePayments(practiceId?: string): Promise<SaasPayment[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) return [];

    const { data, error } = await supabase
      .from('saas_payments')
      .select('*')
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch practice payments: ${error.message}`);
    }

    return (data as SaasPayment[]) || [];
  },

  /**
   * Retrieves the payment record associated with a specific SaaS invoice.
   */
  async getInvoicePayment(invoiceId: string, practiceId?: string): Promise<SaasPayment | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    let query = supabase
      .from('saas_payments')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (activePracticeId) {
      query = query.eq('practice_id', activePracticeId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Failed to fetch invoice payment:', error.message);
      return null;
    }

    return (data as SaasPayment) || null;
  },

  /**
   * Retrieves billing cycle details for an invoice if available.
   */
  async getBillingCycle(billingCycleId: string): Promise<SaasBillingCycle | null> {
    const { data, error } = await supabase
      .from('saas_billing_cycles')
      .select('*')
      .eq('id', billingCycleId)
      .maybeSingle();

    if (error) {
      console.warn('Failed to fetch billing cycle:', error.message);
      return null;
    }

    return (data as SaasBillingCycle) || null;
  },

  /**
   * Retrieves active clinical practitioner count for seat capacity checks.
   */
  async getActivePractitionerCount(practiceId?: string): Promise<number> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) return 0;

    const { count, error } = await supabase
      .from('practice_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('practice_id', activePracticeId)
      .in('role', ['physiotherapist', 'practice_owner'])
      .eq('status', 'active');

    if (error) {
      console.warn('Failed to count active practitioners:', error.message);
      return 0;
    }

    return count || 0;
  },

  // ----------------------------------------------------------------------------
  // 3. PLATFORM ADMINISTRATION CONSOLE OPERATIONS
  // ----------------------------------------------------------------------------

  /**
   * Queries executive platform KPIs (MRR, ARR, tenant counts).
   */
  async getPlatformKPIs(): Promise<PlatformKPIs> {
    const { data, error } = await supabase.rpc('get_platform_kpis');

    if (error) {
      throw new Error(`Failed to query platform KPIs: ${error.message}`);
    }

    return data as unknown as PlatformKPIs;
  },

  /**
   * Lists all practices and their subscription state for the Platform Admin Directory.
   */
  async getAllPractices(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      country: string;
      created_at: string;
      subscription: PracticeSubscription | null;
      planName: string;
    }>
  > {
    const { data: practices, error: pracError } = await supabase
      .from('practices')
      .select('*')
      .order('created_at', { ascending: false });

    if (pracError) {
      throw new Error(`Failed to fetch practices: ${pracError.message}`);
    }

    const { data: subs, error: subError } = await supabase
      .from('practice_subscriptions')
      .select('*');

    if (subError) {
      throw new Error(`Failed to fetch practice subscriptions: ${subError.message}`);
    }

    const { data: plans } = await supabase
      .from('saas_plans')
      .select('id, name');

    const planMap = new Map((plans || []).map((p) => [p.id, p.name]));
    const subMap = new Map((subs || []).map((s) => [s.practice_id, s as PracticeSubscription]));

    return (practices || []).map((p) => {
      const sub = subMap.get(p.id) || null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        country: p.country,
        created_at: p.created_at,
        subscription: sub,
        planName: sub ? planMap.get(sub.plan_id) || 'Unknown Plan' : 'No Subscription',
      };
    });
  },

  /**
   * Fetches full practice dossier for platform administrator review.
   * NOTE: Strictly complies with Clinical Privacy Firewall - ZERO patient or clinical records fetched!
   */
  async getPracticeDossier(practiceId: string): Promise<PracticeDossier> {
    // 1. Practice
    const { data: practice, error: pracError } = await supabase
      .from('practices')
      .select('id, name, slug, status, country, timezone, email, phone, created_at')
      .eq('id', practiceId)
      .single();

    if (pracError || !practice) {
      throw new Error(`Practice not found: ${pracError?.message || 'Missing record'}`);
    }

    // 2. Subscription
    const subscription = await this.getPracticeSubscription(practiceId);

    // 3. Trial Extensions
    const { data: extensions } = await supabase
      .from('saas_trial_extensions')
      .select('*')
      .eq('practice_id', practiceId)
      .order('created_at', { ascending: false });

    // 4. Invoices
    const invoices = await this.getPracticeInvoices(practiceId);

    // 5. Payments
    const { data: payments } = await supabase
      .from('saas_payments')
      .select('*')
      .eq('practice_id', practiceId)
      .order('created_at', { ascending: false });

    // 6. Active Practitioners count
    const { count: practitionerCount } = await supabase
      .from('practice_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('practice_id', practiceId)
      .in('role', ['physiotherapist', 'practice_owner'])
      .eq('status', 'active');

    // 7. Practice Owner Contact
    let owner: PracticeOwnerContact | null = null;
    try {
      const { data: ownerMembership } = await supabase
        .from('practice_memberships')
        .select('id, user_id, role, joined_at')
        .eq('practice_id', practiceId)
        .eq('role', 'practice_owner')
        .maybeSingle();

      if (ownerMembership?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, first_name, last_name, phone')
          .eq('id', ownerMembership.user_id)
          .maybeSingle();

        const fullName =
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
          profile?.display_name ||
          'Practice Owner';

        owner = {
          id: ownerMembership.user_id,
          name: fullName,
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          display_name: profile?.display_name || null,
          email: practice.email || null,
          phone: profile?.phone || practice.phone || null,
          role: ownerMembership.role,
          joined_at: ownerMembership.joined_at,
        };
      }
    } catch (ownerErr) {
      console.warn('Failed to resolve practice owner contact:', ownerErr);
    }

    return {
      practice,
      owner,
      subscription,
      trialExtensions: (extensions as SaasTrialExtension[]) || [],
      invoices,
      payments: (payments as SaasPayment[]) || [],
      practitionerCount: practitionerCount || 0,
    };
  },

  /**
   * Suspends a practice workspace and blocks further clinical/administrative writes.
   * Enforces mandatory audit justification.
   */
  async suspendPractice(
    practiceId: string,
    reason: string
  ): Promise<{
    success: boolean;
    practice_id: string;
    status: string;
    previous_status?: string;
    audit_event_id?: string;
    message?: string;
  }> {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Suspension reason is required and must be at least 5 characters');
    }
    const { data, error } = await supabase.rpc('suspend_practice', {
      p_practice_id: practiceId,
      p_reason: reason.trim(),
    });

    if (error) {
      throw new Error(`Practice suspension failed: ${error.message}`);
    }

    return data as any;
  },

  /**
   * Restores a suspended practice workspace to its appropriate subscription state.
   * Enforces mandatory audit justification.
   */
  async restorePractice(
    practiceId: string,
    reason: string
  ): Promise<{
    success: boolean;
    practice_id: string;
    status: string;
    practice_status?: string;
    prior_subscription_status?: string;
    audit_event_id?: string;
    message?: string;
  }> {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Restoration reason is required and must be at least 5 characters');
    }
    const { data, error } = await supabase.rpc('restore_practice', {
      p_practice_id: practiceId,
      p_reason: reason.trim(),
    });

    if (error) {
      throw new Error(`Practice restoration failed: ${error.message}`);
    }

    return data as any;
  },

  /**
   * Changes a practice subscription plan and seat limit.
   * Enforces seat capacity rules and immutable audit logging.
   */
  async changePracticePlan(
    practiceId: string,
    planCode: string,
    seatLimit?: number,
    reason?: string
  ): Promise<{
    success: boolean;
    practice_id: string;
    plan_id: string;
    plan_code: string;
    plan_name: string;
    seat_limit: number;
    price_cents: number;
    currency: string;
    audit_event_id: string;
  }> {
    const { data, error } = await supabase.rpc('change_practice_plan', {
      p_practice_id: practiceId,
      p_plan_code: planCode,
      p_seat_limit: seatLimit ?? null,
      p_reason: reason?.trim() || 'Administrative plan adjustment',
    });

    if (error) {
      throw new Error(`Plan change failed: ${error.message}`);
    }

    return data as any;
  },

  /**
   * Queries trialing practices whose trials expire within the threshold window (default: 7 days).
   */
  async getExpiringTrials(daysThreshold = 7): Promise<
    Array<{
      practiceId: string;
      practiceName: string;
      slug: string;
      planName: string;
      trialEndsAt: string;
      daysRemaining: number;
      status: string;
    }>
  > {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysThreshold);

    const { data: subs, error: subErr } = await supabase
      .from('practice_subscriptions')
      .select('practice_id, status, trial_ends_at, plan_id')
      .eq('status', 'trialing')
      .not('trial_ends_at', 'is', null)
      .lte('trial_ends_at', futureDate.toISOString())
      .order('trial_ends_at', { ascending: true });

    if (subErr) {
      throw new Error(`Failed to fetch expiring trials: ${subErr.message}`);
    }
    if (!subs || subs.length === 0) return [];

    const practiceIds = subs.map((s) => s.practice_id);
    const planIds = Array.from(new Set(subs.map((s) => s.plan_id)));

    const [{ data: practices }, { data: plans }] = await Promise.all([
      supabase.from('practices').select('id, name, slug').in('id', practiceIds),
      supabase.from('saas_plans').select('id, name').in('id', planIds),
    ]);

    const practiceMap = new Map((practices || []).map((p) => [p.id, p]));
    const planMap = new Map((plans || []).map((p) => [p.id, p.name]));

    return subs.map((s) => {
      const p = practiceMap.get(s.practice_id);
      const endsAt = new Date(s.trial_ends_at!);
      const msDiff = endsAt.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

      return {
        practiceId: s.practice_id,
        practiceName: p?.name || 'Unknown Practice',
        slug: p?.slug || '',
        planName: planMap.get(s.plan_id) || 'Unknown Plan',
        trialEndsAt: s.trial_ends_at!,
        daysRemaining,
        status: s.status,
      };
    });
  },

  /**
   * Queries practices currently in dunning states (past_due, grace_period, expired).
   */
  async getDunningPractices(): Promise<
    Array<{
      practiceId: string;
      practiceName: string;
      slug: string;
      status: string;
      planName: string;
      currentPeriodEnd: string | null;
      amountDueCents: number;
    }>
  > {
    const { data: subs, error: subErr } = await supabase
      .from('practice_subscriptions')
      .select('practice_id, status, current_period_end, current_price_cents, plan_id, updated_at')
      .in('status', ['past_due', 'grace_period', 'expired'])
      .order('updated_at', { ascending: false });

    if (subErr) {
      throw new Error(`Failed to fetch dunning practices: ${subErr.message}`);
    }
    if (!subs || subs.length === 0) return [];

    const practiceIds = subs.map((s) => s.practice_id);
    const planIds = Array.from(new Set(subs.map((s) => s.plan_id)));

    const [{ data: practices }, { data: plans }] = await Promise.all([
      supabase.from('practices').select('id, name, slug').in('id', practiceIds),
      supabase.from('saas_plans').select('id, name').in('id', planIds),
    ]);

    const practiceMap = new Map((practices || []).map((p) => [p.id, p]));
    const planMap = new Map((plans || []).map((p) => [p.id, p.name]));

    return subs.map((s) => {
      const p = practiceMap.get(s.practice_id);
      return {
        practiceId: s.practice_id,
        practiceName: p?.name || 'Unknown Practice',
        slug: p?.slug || '',
        status: s.status,
        planName: planMap.get(s.plan_id) || 'Unknown Plan',
        currentPeriodEnd: s.current_period_end,
        amountDueCents: s.current_price_cents || 0,
      };
    });
  },

  /**
   * Fetches webhook event telemetry for administrative debugging.
   */
  async getWebhookTelemetry(limit = 50): Promise<
    Array<{
      id: string;
      gateway: string;
      external_event_id: string;
      event_type: string;
      signature_verified: boolean;
      processed: boolean;
      error_message: string | null;
      received_at: string;
      processed_at: string | null;
    }>
  > {
    const { data, error } = await supabase
      .from('saas_webhook_events')
      .select('id, gateway, external_event_id, event_type, signature_verified, processed, error_message, received_at, processed_at')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Failed to load webhook telemetry:', error);
      return [];
    }

    return (data as Array<{
      id: string;
      gateway: string;
      external_event_id: string;
      event_type: string;
      signature_verified: boolean;
      processed: boolean;
      error_message: string | null;
      received_at: string;
      processed_at: string | null;
    }>) || [];
  },

  /**
   * Extends evaluation trial for a practice with mandatory reason.
   */
  async extendTrial(
    practiceId: string,
    daysToAdd: number,
    reason: string
  ): Promise<{ practice_id: string; status: string; new_trial_ends_at: string }> {
    const { data, error } = await supabase.rpc('extend_practice_trial', {
      p_practice_id: practiceId,
      p_days_to_add: daysToAdd,
      p_reason: reason,
    });

    if (error) {
      throw new Error(`Trial extension failed: ${error.message}`);
    }

    return data as unknown as { practice_id: string; status: string; new_trial_ends_at: string };
  },

  /**
   * Fetches all plans including inactive or private ones for platform administration.
   */
  async getAllPlans(): Promise<SaasPlan[]> {
    const { data, error } = await supabase
      .from('saas_plans')
      .select('*')
      .order('monthly_price_cents', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch SaaS plans: ${error.message}`);
    }

    return (data as SaasPlan[]) || [];
  },

  /**
   * Updates plan settings and pricing.
   */
  async updatePlan(planId: string, updates: Partial<SaasPlanUpdate>): Promise<SaasPlan> {
    const { data, error } = await supabase
      .from('saas_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update SaaS plan: ${error.message}`);
    }

    try {
      await supabase.rpc('log_audit_event', {
        p_practice_id: null,
        p_action: 'plan.updated',
        p_entity_type: 'saas_plan',
        p_entity_id: planId,
        p_metadata: {
          plan_id: planId,
          plan_code: data.plan_code,
          plan_name: data.name,
          updated_fields: Object.keys(updates),
          updates,
        },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('Audit logging for plan update failed:', auditErr);
    }

    return data as SaasPlan;
  },

  /**
   * Fetches all platform billing invoices.
   */
  async getAllInvoices(): Promise<SaasInvoice[]> {
    const { data, error } = await supabase
      .from('saas_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch platform invoices: ${error.message}`);
    }

    return (data as SaasInvoice[]) || [];
  },

  /**
   * Fetches all platform payments.
   */
  async getAllPayments(): Promise<SaasPayment[]> {
    const { data, error } = await supabase
      .from('saas_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch platform payments: ${error.message}`);
    }

    return (data as SaasPayment[]) || [];
  },

  /**
   * Fetches platform audit logs from public.audit_events.
   */
  async getPlatformAuditEvents(limit = 100): Promise<Array<{
    id: string;
    practice_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>> {
    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch audit events: ${error.message}`);
    }

    return (data as Array<{
      id: string;
      practice_id: string | null;
      action: string;
      entity_type: string;
      entity_id: string;
      metadata: Record<string, unknown>;
      created_at: string;
    }>) || [];
  },

  /**
   * Fetches platform settings.
   */
  async getPlatformSettings(): Promise<PlatformSetting[]> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch platform settings: ${error.message}`);
    }

    return (data as PlatformSetting[]) || [];
  },

  /**
   * Updates a platform setting.
   */
  async updatePlatformSetting(key: string, value: unknown, description?: string): Promise<void> {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        key,
        value: value as any,
        description: description || null,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to update platform setting: ${error.message}`);
    }

    try {
      await supabase.rpc('log_audit_event', {
        p_practice_id: null,
        p_action: 'platform_settings.updated',
        p_entity_type: 'platform_setting',
        p_entity_id: null,
        p_metadata: {
          key,
          value: value as any,
          description: description || null,
        },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('Audit logging for platform setting update failed:', auditErr);
    }
  },

  // ----------------------------------------------------------------------------
  // 4. SETTLEMENT & GATEWAY HELPERS
  // ----------------------------------------------------------------------------

  /**
   * Settles a SaaS invoice via verified payment (e.g. from Paystack webhook).
   */
  async settleSubscriptionPayment(
    invoiceId: string,
    gateway: SaasPaymentGateway,
    gatewayReference: string,
    amountCents: number,
    paymentMethod: string,
    gatewayFeeCents = 0,
    authToken?: string
  ): Promise<{ status: string; invoice_id: string; payment_id?: string; new_period_end?: string }> {
    const { data, error } = await supabase.rpc('process_subscription_payment_settlement', {
      p_invoice_id: invoiceId,
      p_gateway: gateway,
      p_gateway_reference: gatewayReference,
      p_amount_cents: amountCents,
      p_payment_method: paymentMethod,
      p_gateway_fee_cents: gatewayFeeCents,
      p_auth_token: authToken || null,
    });

    if (error) {
      throw new Error(`Settlement failed: ${error.message}`);
    }

    return data as unknown as { status: string; invoice_id: string; payment_id?: string; new_period_end?: string };
  },

  // ----------------------------------------------------------------------------
  // 5. PRACTICE OWNER SELF-SERVICE BILLING (PHASE 4A)
  // ----------------------------------------------------------------------------

  /**
   * Generates or retrieves an authoritative SaaS invoice for subscription payment.
   * Callable strictly by verified practice_owner.
   */
  async initiatePracticeSubscriptionPayment(
    practiceId: string,
    planCode: string,
    billingInterval: 'monthly' | 'annual' = 'monthly'
  ): Promise<{
    success: boolean;
    is_reused: boolean;
    invoice_id: string;
    invoice_number: string;
    amount_cents: number;
    currency: string;
    plan_code: string;
    plan_name: string;
    billing_interval: string;
    seat_limit: number;
    due_date: string;
    status: string;
  }> {
    const { data, error } = await supabase.rpc('initiate_practice_subscription_payment', {
      p_practice_id: practiceId,
      p_plan_code: planCode,
      p_billing_interval: billingInterval,
    });

    if (error) {
      throw new Error(`Payment initiation failed: ${error.message}`);
    }

    return data as any;
  },

  /**
   * Adjusts subscription plan for practice owner (immediate for trial, scheduled for paid downgrade, invoice for upgrade).
   * Callable strictly by verified practice_owner.
   */
  async selfServiceChangePlan(
    practiceId: string,
    planCode: string,
    billingInterval: 'monthly' | 'annual' = 'monthly',
    reason?: string
  ): Promise<{
    success: boolean;
    action: string;
    plan_code?: string;
    target_plan_code?: string;
    target_plan_name?: string;
    invoice_id?: string;
    invoice_number?: string;
    amount_cents?: number;
    effective_at?: string;
    message?: string;
  }> {
    const { data, error } = await supabase.rpc('self_service_change_plan', {
      p_practice_id: practiceId,
      p_plan_code: planCode,
      p_billing_interval: billingInterval,
      p_reason: reason?.trim() || 'Practice owner requested plan adjustment',
    });

    if (error) {
      throw new Error(`Plan change failed: ${error.message}`);
    }

    return data as any;
  },

  /**
   * Cancels subscription (immediate for trial, end-of-period for active paid subscription).
   * Callable strictly by verified practice_owner.
   */
  async cancelPracticeSubscription(
    practiceId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    status: string;
    cancel_at_period_end: boolean;
    effective_at?: string;
    message?: string;
  }> {
    const { data, error } = await supabase.rpc('cancel_practice_subscription', {
      p_practice_id: practiceId,
      p_reason: reason?.trim() || 'Practice owner requested cancellation',
    });

    if (error) {
      throw new Error(`Cancellation failed: ${error.message}`);
    }

    return data as any;
  },

  /**
   * Reactivates a subscription that has cancel_at_period_end = true before the period expires.
   * Callable strictly by verified practice_owner.
   */
  async reactivatePracticeSubscription(
    practiceId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    status: string;
    cancel_at_period_end?: boolean;
    requires_payment?: boolean;
    message?: string;
  }> {
    const { data, error } = await supabase.rpc('reactivate_practice_subscription', {
      p_practice_id: practiceId,
      p_reason: reason?.trim() || 'Practice owner requested reactivation',
    });

    if (error) {
      throw new Error(`Reactivation failed: ${error.message}`);
    }

    return data as any;
  },

  // ----------------------------------------------------------------------------
  // 6. SERVERLESS PAYSTACK CHECKOUT & VERIFICATION (PHASE 4B)
  // ----------------------------------------------------------------------------

  /**
   * Initializes a Paystack checkout transaction via the serverless API.
   * Derives authoritative invoice amount and gateway reference server-side.
   * Client amounts are strictly ignored.
   */
  async initializePaystackCheckout(
    practiceId: string,
    invoiceId: string
  ): Promise<{
    success: boolean;
    authorization_url: string;
    access_code: string;
    reference: string;
    invoice_id: string;
    invoice_number: string;
    amount_cents: number;
    currency: string;
  }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required to initialize checkout');
    }

    const response = await fetch('/api/initialize-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        practice_id: practiceId,
        invoice_id: invoiceId,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to initialize payment checkout');
    }

    return result;
  },

  /**
   * Fallback server-side verification invoked after browser checkout completes.
   * Confirms payment against Paystack server-to-server and triggers idempotent settlement.
   */
  async verifyPaystackPayment(
    practiceId: string,
    reference: string
  ): Promise<{
    status: string;
    message?: string;
    settlement?: any;
    payment_id?: string;
    invoice_id?: string;
  }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required to verify payment');
    }

    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        practice_id: practiceId,
        reference: reference,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to verify payment with server');
    }

    return result;
  },
};

