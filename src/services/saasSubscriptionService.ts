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
  SaasTrialExtension,
  PlatformSetting,
  PlatformKPIs,
  RegisterPracticeAndSubscribePayload,
  RegisterPracticeAndSubscribeResponse,
  SaasPlanCode,
  SaasPaymentGateway,
} from '../types/models';

export interface PracticeDossier {
  practice: {
    id: string;
    name: string;
    slug: string;
    status: string;
    country: string;
    timezone: string;
    created_at: string;
  };
  subscription: PracticeSubscription & { plan?: SaasPlan } | null;
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
      .select('id, name, slug, status, country, timezone, created_at')
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

    return {
      practice,
      subscription,
      trialExtensions: (extensions as SaasTrialExtension[]) || [],
      invoices,
      payments: (payments as SaasPayment[]) || [],
      practitionerCount: practitionerCount || 0,
    };
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
};
