// ==============================================================================
// PHYSENRA RECURRING MEMBERSHIPS FOUNDATION V1 SERVICE LAYER
// File: src/services/membershipService.ts
//
// Architecture: OPTION E (Formally Cleared)
// Invoiced Billing-Cycle Demand + Decoupled Membership Enrollment + 
// Cycle-Scoped Immutable Entitlement & Usage Ledger
//
// Governs:
// 1. Membership Plans Catalog management (CRUD & status toggling)
// 2. Patient Membership Enrollment via authoritative RPC (enroll_patient_in_membership)
// 3. Membership Lifecycle transitions (pause, resume, cancel)
// 4. Billing Cycle tracking, invoice linkage, and derived session quota computation
// 5. In-app deterministic renewal cycle generation (generate_membership_renewal_cycles)
// 6. Clinical Visit usage decrement via authoritative RPC (record_membership_visit_usage)
// 7. Explicit PostgREST constraint hint disambiguation
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  MembershipPlanWithService,
  PatientMembershipWithRelations,
  MembershipBillingCycleWithRelations,
  MembershipBillingCycleWithQuota,
  MembershipUsageLedgerEntryWithRelations,
  CreateMembershipPlanPayload,
  UpdateMembershipPlanPayload,
  EnrollMembershipPayload,
  RecordMembershipUsagePayload,
  PauseMembershipPayload,
  ResumeMembershipPayload,
  CancelMembershipPayload,
  MembershipPlanFilters,
  MembershipFilters,
} from '../types/models';

export const membershipService = {
  // ----------------------------------------------------------------------------
  // 1. MEMBERSHIP PLANS CATALOG
  // ----------------------------------------------------------------------------

  /**
   * Retrieves membership plans for the active practice with linked service catalog info.
   */
  async getPlans(
    practiceId?: string,
    filters?: MembershipPlanFilters
  ): Promise<MembershipPlanWithService[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('membership_plans')
      .select(`
        *,
        service:services!fk_plan_service_practice (
          id,
          service_code,
          name,
          category,
          standard_duration_minutes
        )
      `)
      .eq('practice_id', activePracticeId)
      .order('name', { ascending: true });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.billingFrequency && filters.billingFrequency !== 'all') {
      query = query.eq('billing_frequency', filters.billingFrequency);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    let results = (data || []) as unknown as MembershipPlanWithService[];

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const codeMatch = p.plan_code.toLowerCase().includes(q);
        const serviceMatch = p.service?.name.toLowerCase().includes(q) || false;
        return nameMatch || codeMatch || serviceMatch;
      });
    }

    return results;
  },

  /**
   * Retrieves a single membership plan by ID.
   */
  async getPlanById(
    id: string,
    practiceId?: string
  ): Promise<MembershipPlanWithService | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('membership_plans')
      .select(`
        *,
        service:services!fk_plan_service_practice (
          id,
          service_code,
          name,
          category,
          standard_duration_minutes
        )
      `)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as unknown as MembershipPlanWithService | null;
  },

  /**
   * Creates a new membership plan offering in the practice catalog.
   */
  async createPlan(
    payload: CreateMembershipPlanPayload,
    practiceId?: string
  ): Promise<MembershipPlanWithService> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('Authentication required.');
    }

    const { data, error } = await supabase
      .from('membership_plans')
      .insert({
        practice_id: activePracticeId,
        plan_code: payload.plan_code.trim().toUpperCase(),
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        included_service_id: payload.included_service_id,
        billing_frequency: payload.billing_frequency || 'monthly',
        cycle_price: payload.cycle_price,
        currency: payload.currency || 'NGN',
        cycle_session_quota: payload.cycle_session_quota,
        status: payload.status || 'active',
        created_by: user.id,
      })
      .select(`
        *,
        service:services!fk_plan_service_practice (
          id,
          service_code,
          name,
          category,
          standard_duration_minutes
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as MembershipPlanWithService;
  },

  /**
   * Updates an existing membership plan.
   */
  async updatePlan(
    id: string,
    payload: UpdateMembershipPlanPayload,
    practiceId?: string
  ): Promise<MembershipPlanWithService> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('Authentication required.');
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updatePayload.name = payload.name.trim();
    if (payload.description !== undefined) updatePayload.description = payload.description.trim() || null;
    if (payload.cycle_price !== undefined) updatePayload.cycle_price = payload.cycle_price;
    if (payload.cycle_session_quota !== undefined) updatePayload.cycle_session_quota = payload.cycle_session_quota;
    if (payload.status !== undefined) updatePayload.status = payload.status;

    const { data, error } = await supabase
      .from('membership_plans')
      .update(updatePayload as any)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .select(`
        *,
        service:services!fk_plan_service_practice (
          id,
          service_code,
          name,
          category,
          standard_duration_minutes
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as MembershipPlanWithService;
  },

  // ----------------------------------------------------------------------------
  // 2. PATIENT MEMBERSHIP ENROLLMENT & LIFECYCLE
  // ----------------------------------------------------------------------------

  /**
   * Enrolls a patient into a membership plan via authoritative database RPC.
   * Creates enrollment agreement, initial billing cycle 1, and cycle 1 invoice.
   */
  async enrollPatient(
    payload: EnrollMembershipPayload,
    practiceId?: string
  ): Promise<{
    success: boolean;
    membership_id: string;
    membership_number: string;
    status: string;
    cycle_id: string;
    cycle_number: number;
    cycle_start_date: string;
    cycle_end_date: string;
    invoice_id: string;
    invoice_number: string;
    cycle_price: number;
    session_quota: number;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('enroll_patient_in_membership', {
      p_practice_id: activePracticeId,
      p_patient_id: payload.patient_id,
      p_plan_id: payload.plan_id,
      p_start_date: payload.start_date || new Date().toISOString().split('T')[0],
      p_auto_renew: payload.auto_renew !== undefined ? payload.auto_renew : true,
      p_notes: payload.notes?.trim() || null,
    });

    if (error) {
      throw error;
    }

    return data as any;
  },

  /**
   * Retrieves patient membership enrollments for the practice with relations and live quota.
   */
  async getMemberships(
    practiceId?: string,
    filters?: MembershipFilters
  ): Promise<PatientMembershipWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('patient_memberships')
      .select(`
        *,
        patient:patients!fk_membership_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          date_of_birth,
          sex,
          email,
          phone
        ),
        plan:membership_plans!fk_membership_plan_practice (
          id,
          plan_code,
          name,
          description,
          included_service_id,
          billing_frequency,
          cycle_price,
          currency,
          cycle_session_quota,
          status,
          service:services!fk_plan_service_practice (
            id,
            service_code,
            name,
            category
          )
        ),
        cycles:membership_billing_cycles!fk_cycle_membership_practice (
          id,
          cycle_number,
          cycle_start_date,
          cycle_end_date,
          billing_date,
          invoice_id,
          cycle_price,
          currency,
          session_quota,
          status,
          created_at,
          invoice:invoices!fk_cycle_invoice_practice (
            id,
            invoice_number,
            status,
            grand_total,
            amount_paid,
            balance_due
          )
        )
      `)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.patientId) {
      query = query.eq('patient_id', filters.patientId);
    }

    if (filters?.planId) {
      query = query.eq('plan_id', filters.planId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const rawList = (data || []) as unknown as PatientMembershipWithRelations[];

    // Fetch usage entries for these cycles to derive remaining quota accurately
    const cycleIds = rawList.flatMap((m) => m.cycles?.map((c) => c.id) || []);
    let usageByCycle: Record<string, number> = {};

    if (cycleIds.length > 0) {
      const { data: usageData } = await supabase
        .from('membership_usage_ledger')
        .select('cycle_id, sessions_consumed')
        .in('cycle_id', cycleIds);

      if (usageData) {
        for (const u of usageData) {
          usageByCycle[u.cycle_id] = (usageByCycle[u.cycle_id] || 0) + Number(u.sessions_consumed);
        }
      }
    }

    // Attach derived quota & find active cycle
    const results = rawList.map((m) => {
      const enrichedCycles = (m.cycles || []).map((c) => {
        const used = usageByCycle[c.id] || 0;
        const remaining = Math.max(0, c.session_quota - used);
        return {
          ...c,
          used_quota: used,
          remaining_quota: remaining,
        };
      });

      // Active cycle is the one currently in status 'active'
      const activeCycle = enrichedCycles.find((c) => c.status === 'active') || null;

      return {
        ...m,
        cycles: enrichedCycles,
        active_cycle: activeCycle as MembershipBillingCycleWithQuota | null,
      };
    });

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      return results.filter((m) => {
        const numMatch = m.membership_number.toLowerCase().includes(q);
        const patientName = `${m.patient?.first_name || ''} ${m.patient?.last_name || ''}`.toLowerCase();
        const patientId = m.patient?.patient_identifier.toLowerCase() || '';
        const planName = m.plan?.name.toLowerCase() || '';
        return numMatch || patientName.includes(q) || patientId.includes(q) || planName.includes(q);
      });
    }

    return results;
  },

  /**
   * Retrieves a single membership by ID with full relations and cycles.
   */
  async getMembershipById(
    membershipId: string,
    practiceId?: string
  ): Promise<PatientMembershipWithRelations | null> {
    const list = await this.getMemberships(practiceId);
    return list.find((m) => m.id === membershipId) || null;
  },

  /**
   * Pauses an active membership.
   */
  async pauseMembership(
    payload: PauseMembershipPayload,
    practiceId?: string
  ): Promise<void> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { error } = await supabase.rpc('pause_patient_membership', {
      p_practice_id: activePracticeId,
      p_membership_id: payload.membership_id,
      p_reason: payload.reason.trim(),
    });

    if (error) {
      throw error;
    }
  },

  /**
   * Resumes a paused membership.
   */
  async resumeMembership(
    payload: ResumeMembershipPayload,
    practiceId?: string
  ): Promise<void> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { error } = await supabase.rpc('resume_patient_membership', {
      p_practice_id: activePracticeId,
      p_membership_id: payload.membership_id,
      p_reason: payload.reason?.trim() || null,
    });

    if (error) {
      throw error;
    }
  },

  /**
   * Cancels a membership.
   */
  async cancelMembership(
    payload: CancelMembershipPayload,
    practiceId?: string
  ): Promise<void> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { error } = await supabase.rpc('cancel_patient_membership', {
      p_practice_id: activePracticeId,
      p_membership_id: payload.membership_id,
      p_reason: payload.reason.trim(),
    });

    if (error) {
      throw error;
    }
  },

  // ----------------------------------------------------------------------------
  // 3. BILLING CYCLES & RENEWALS
  // ----------------------------------------------------------------------------

  /**
   * Retrieves billing cycles for a specific membership.
   */
  async getMembershipCycles(
    membershipId: string,
    practiceId?: string
  ): Promise<MembershipBillingCycleWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('membership_billing_cycles')
      .select(`
        *,
        invoice:invoices!fk_cycle_invoice_practice (
          id,
          invoice_number,
          status,
          grand_total,
          amount_paid,
          balance_due
        )
      `)
      .eq('membership_id', membershipId)
      .eq('practice_id', activePracticeId)
      .order('cycle_number', { ascending: false });

    if (error) {
      throw error;
    }

    const cycles = (data || []) as unknown as MembershipBillingCycleWithRelations[];
    const cycleIds = cycles.map((c) => c.id);

    if (cycleIds.length === 0) {
      return [];
    }

    // Get usage entries
    const { data: usageData } = await supabase
      .from('membership_usage_ledger')
      .select(`
        *,
        visit:clinical_visits!fk_usage_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        service:services!fk_usage_service_practice (
          id,
          service_code,
          name
        )
      `)
      .in('cycle_id', cycleIds)
      .order('created_at', { ascending: false });

    const usageByCycle: Record<string, MembershipUsageLedgerEntryWithRelations[]> = {};
    if (usageData) {
      for (const u of usageData as unknown as MembershipUsageLedgerEntryWithRelations[]) {
        if (!usageByCycle[u.cycle_id]) {
          usageByCycle[u.cycle_id] = [];
        }
        usageByCycle[u.cycle_id].push(u);
      }
    }

    return cycles.map((c) => {
      const entries = usageByCycle[c.id] || [];
      const used = entries.reduce((acc, curr) => acc + Number(curr.sessions_consumed), 0);
      const remaining = Math.max(0, c.session_quota - used);

      return {
        ...c,
        usage_entries: entries,
        used_quota: used,
        remaining_quota: remaining,
      };
    });
  },

  /**
   * Generates renewal cycles for all active memberships due for renewal.
   */
  async generateRenewalCycles(practiceId?: string): Promise<{
    success: boolean;
    cycles_generated: number;
    results: any[];
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('generate_membership_renewal_cycles', {
      p_practice_id: activePracticeId,
    });

    if (error) {
      throw error;
    }

    return data as any;
  },

  // ----------------------------------------------------------------------------
  // 4. CLINICAL USAGE & CONSUMPTION
  // ----------------------------------------------------------------------------

  /**
   * Records clinical visit usage against an active membership billing cycle.
   * Atomically acquires pessimistic row lock on the cycle and validates quota.
   */
  async recordVisitUsage(
    payload: RecordMembershipUsagePayload,
    practiceId?: string
  ): Promise<{
    success: boolean;
    ledger_id: string;
    cycle_id: string;
    membership_number: string;
    clinical_visit_id: string;
    sessions_consumed: number;
    remaining_sessions: number;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('record_membership_visit_usage', {
      p_practice_id: activePracticeId,
      p_cycle_id: payload.cycle_id,
      p_clinical_visit_id: payload.clinical_visit_id,
      p_notes: payload.notes?.trim() || null,
    });

    if (error) {
      throw error;
    }

    return data as any;
  },

  /**
   * Retrieves usage history for a billing cycle.
   */
  async getMembershipUsage(
    cycleId: string,
    practiceId?: string
  ): Promise<MembershipUsageLedgerEntryWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('membership_usage_ledger')
      .select(`
        *,
        visit:clinical_visits!fk_usage_visit_patient_practice (
          id,
          visit_identifier,
          status,
          actual_start,
          actual_end
        ),
        service:services!fk_usage_service_practice (
          id,
          service_code,
          name
        )
      `)
      .eq('cycle_id', cycleId)
      .eq('practice_id', activePracticeId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as unknown as MembershipUsageLedgerEntryWithRelations[];
  },
};
