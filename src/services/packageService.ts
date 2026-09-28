// ==============================================================================
// PHYSENRA PACKAGES FOUNDATION V1 SERVICE LAYER
// File: src/services/packageService.ts
//
// Governs:
// 1. Authoritative Package Catalog Definitions management
// 2. Authoritative Package Purchase via Billing Invoicing Integration
// 3. Package Entitlement retrieval & lifecycle tracking
// 4. Atomic Session Consumption RPC invocation (consume_package_session)
// 5. Package Validity Extension RPC (extend_package_validity)
// 6. Package Cancellation RPC (cancel_package)
// 7. Explicit PostgREST constraint hint disambiguation
// 8. Absolute domain firewall: Zero memberships, wallets, gateways, refunds
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  PackageDefinition,
  PackageDefinitionWithRelations,
  PackageEntitlementWithRelations,
  PackageConsumption,
  CreatePackageDefinitionPayload,
  UpdatePackageDefinitionPayload,
  PurchasePackagePayload,
  ConsumePackageSessionPayload,
  ExtendPackageValidityPayload,
  CancelPackagePayload,
  PackageDefinitionFilters,
  PackageEntitlementFilters,
} from '../types/models';

export const packageService = {
  // ----------------------------------------------------------------------------
  // 1. PACKAGE DEFINITIONS (CATALOG TEMPLATES)
  // ----------------------------------------------------------------------------

  /**
   * Retrieves package definitions for the practice with optional filtering.
   */
  async getPackageDefinitions(
    practiceId?: string,
    filters?: PackageDefinitionFilters
  ): Promise<PackageDefinitionWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('package_definitions')
      .select(`
        *,
        service:services!fk_package_definitions_service_practice (
          id,
          code,
          name,
          category
        )
      `)
      .eq('practice_id', activePracticeId)
      .order('name', { ascending: true });

    if (filters?.serviceId) {
      query = query.eq('service_id', filters.serviceId);
    }

    if (filters?.isActive !== undefined && filters.isActive !== 'all') {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    let results = (data || []) as unknown as PackageDefinitionWithRelations[];

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((def) => {
        const nameMatch = def.name.toLowerCase().includes(q);
        const codeMatch = def.code.toLowerCase().includes(q);
        const serviceMatch = def.service?.name.toLowerCase().includes(q) || false;
        return nameMatch || codeMatch || serviceMatch;
      });
    }

    return results;
  },

  /**
   * Retrieves a single package definition by ID with linked service.
   */
  async getPackageDefinitionById(
    id: string,
    practiceId?: string
  ): Promise<PackageDefinitionWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('package_definitions')
      .select(`
        *,
        service:services!fk_package_definitions_service_practice (
          id,
          code,
          name,
          category
        )
      `)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as PackageDefinitionWithRelations;
  },

  /**
   * Creates a new package definition offering for the practice.
   */
  async createPackageDefinition(
    payload: CreatePackageDefinitionPayload,
    practiceId?: string
  ): Promise<PackageDefinition> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('Authentication required.');
    }

    const { data, error } = await supabase
      .from('package_definitions')
      .insert({
        practice_id: activePracticeId,
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        service_id: payload.service_id,
        total_sessions: payload.total_sessions,
        validity_days: payload.validity_days,
        package_price: payload.package_price,
        currency: payload.currency || 'NGN',
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as PackageDefinition;
  },

  /**
   * Updates an existing package definition.
   */
  async updatePackageDefinition(
    id: string,
    payload: UpdatePackageDefinitionPayload,
    practiceId?: string
  ): Promise<PackageDefinition> {
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
    if (payload.total_sessions !== undefined) updatePayload.total_sessions = payload.total_sessions;
    if (payload.validity_days !== undefined) updatePayload.validity_days = payload.validity_days;
    if (payload.package_price !== undefined) updatePayload.package_price = payload.package_price;
    if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;

    const { data, error } = await supabase
      .from('package_definitions')
      .update(updatePayload as any)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as PackageDefinition;
  },

  // ----------------------------------------------------------------------------
  // 2. PACKAGE ENTITLEMENTS (PATIENT QUOTAS & CONSUMPTION)
  // ----------------------------------------------------------------------------

  /**
   * Retrieves package entitlements for the practice with derived session balances.
   */
  async getPackageEntitlements(
    practiceId?: string,
    filters?: PackageEntitlementFilters
  ): Promise<PackageEntitlementWithRelations[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('package_entitlements')
      .select(`
        *,
        patient:patients!fk_entitlements_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          date_of_birth,
          gender
        ),
        definition:package_definitions!fk_entitlements_definition_practice (
          id,
          code,
          name,
          service_id,
          total_sessions,
          validity_days,
          package_price,
          currency,
          service:services!fk_package_definitions_service_practice (
            id,
            code,
            name
          )
        ),
        invoice:invoices!fk_entitlements_invoice_practice (
          id,
          invoice_number,
          status,
          grand_total,
          amount_paid,
          balance_due
        ),
        consumptions:package_consumption_ledger!fk_consumption_entitlement_practice (
          id,
          clinical_visit_id,
          patient_id,
          consumed_at,
          notes
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

    if (filters?.definitionId) {
      query = query.eq('package_definition_id', filters.definitionId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const rawList = (data || []) as unknown as PackageEntitlementWithRelations[];

    // Calculate derived balances
    let results = rawList.map((ent) => {
      const consumed = ent.consumptions?.length || 0;
      const remaining = Math.max(0, ent.total_sessions - consumed);
      return {
        ...ent,
        consumed_sessions: consumed,
        remaining_sessions: remaining,
      };
    });

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((ent) => {
        const numMatch = ent.package_number.toLowerCase().includes(q);
        const invMatch = ent.invoice?.invoice_number?.toLowerCase().includes(q) || false;
        const defMatch = ent.definition?.name?.toLowerCase().includes(q) || false;
        const patientName = `${ent.patient?.first_name || ''} ${ent.patient?.last_name || ''}`.toLowerCase();
        const patId = ent.patient?.patient_identifier?.toLowerCase() || '';
        return numMatch || invMatch || defMatch || patientName.includes(q) || patId.includes(q);
      });
    }

    return results;
  },

  /**
   * Retrieves a single package entitlement by ID with all relations and derived balance.
   */
  async getPackageEntitlementById(
    id: string,
    practiceId?: string
  ): Promise<PackageEntitlementWithRelations> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('package_entitlements')
      .select(`
        *,
        patient:patients!fk_entitlements_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name,
          date_of_birth,
          gender
        ),
        definition:package_definitions!fk_entitlements_definition_practice (
          id,
          code,
          name,
          service_id,
          total_sessions,
          validity_days,
          package_price,
          currency,
          service:services!fk_package_definitions_service_practice (
            id,
            code,
            name
          )
        ),
        invoice:invoices!fk_entitlements_invoice_practice (
          id,
          invoice_number,
          status,
          grand_total,
          amount_paid,
          balance_due
        ),
        consumptions:package_consumption_ledger!fk_consumption_entitlement_practice (
          id,
          clinical_visit_id,
          patient_id,
          consumed_at,
          notes
        )
      `)
      .eq('id', id)
      .eq('practice_id', activePracticeId)
      .single();

    if (error) {
      throw error;
    }

    const raw = data as unknown as PackageEntitlementWithRelations;
    const consumed = raw.consumptions?.length || 0;
    const remaining = Math.max(0, raw.total_sessions - consumed);

    return {
      ...raw,
      consumed_sessions: consumed,
      remaining_sessions: remaining,
    };
  },

  /**
   * Retrieves consumption history rows for a specific package entitlement.
   */
  async getConsumptionHistory(
    entitlementId: string,
    practiceId?: string
  ): Promise<Array<PackageConsumption & {
    patient?: { id: string; patient_identifier: string; first_name: string; last_name: string };
    visit?: { id: string; visit_identifier: string; visit_date: string; status: string };
  }>> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('package_consumption_ledger')
      .select(`
        *,
        patient:patients!fk_consumption_patient_practice (
          id,
          patient_identifier,
          first_name,
          last_name
        ),
        visit:clinical_visits!fk_consumption_visit_patient_practice (
          id,
          visit_identifier,
          visit_date,
          status
        )
      `)
      .eq('entitlement_id', entitlementId)
      .eq('practice_id', activePracticeId)
      .order('consumed_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []) as unknown as Array<PackageConsumption & {
      patient?: { id: string; patient_identifier: string; first_name: string; last_name: string };
      visit?: { id: string; visit_identifier: string; visit_date: string; status: string };
    }>;
  },

  // ----------------------------------------------------------------------------
  // 3. ATOMIC MUTATION RPCS
  // ----------------------------------------------------------------------------

  /**
   * Purchases a package: creates an authoritative debtor invoice and pending entitlement.
   */
  async purchasePackage(
    payload: PurchasePackagePayload,
    practiceId?: string
  ): Promise<{
    success: boolean;
    package_id: string;
    package_number: string;
    invoice_id: string;
    invoice_number: string;
    patient_id: string;
    total_sessions: number;
    validity_days: number;
    package_price: number;
    currency: string;
    status: string;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!payload.patient_id) {
      throw new Error('Validation failure: Patient is required for package purchase.');
    }

    if (!payload.package_definition_id) {
      throw new Error('Validation failure: Package definition is required.');
    }

    const { data, error } = await supabase.rpc('purchase_package', {
      p_practice_id: activePracticeId,
      p_patient_id: payload.patient_id,
      p_package_definition_id: payload.package_definition_id,
      p_notes: payload.notes || null,
    });

    if (error) {
      throw error;
    }

    return data as unknown as {
      success: boolean;
      package_id: string;
      package_number: string;
      invoice_id: string;
      invoice_number: string;
      patient_id: string;
      total_sessions: number;
      validity_days: number;
      package_price: number;
      currency: string;
      status: string;
    };
  },

  /**
   * Activates an entitlement once linked invoice is fully paid.
   */
  async activatePackage(
    entitlementId: string,
    practiceId?: string
  ): Promise<{
    success: boolean;
    package_id: string;
    package_number: string;
    status: string;
    activated_at: string;
    expires_at: string;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('activate_package', {
      p_practice_id: activePracticeId,
      p_entitlement_id: entitlementId,
    });

    if (error) {
      throw error;
    }

    return data as unknown as {
      success: boolean;
      package_id: string;
      package_number: string;
      status: string;
      activated_at: string;
      expires_at: string;
    };
  },

  /**
   * Consumes one package session upon completion of a clinical visit.
   */
  async consumePackageSession(
    payload: ConsumePackageSessionPayload,
    practiceId?: string
  ): Promise<{
    success: boolean;
    consumption_id: string;
    entitlement_id: string;
    package_number: string;
    clinical_visit_id: string;
    patient_id: string;
    total_sessions: number;
    consumed_sessions: number;
    remaining_sessions: number;
    status: string;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!payload.entitlement_id) {
      throw new Error('Validation failure: Package entitlement ID is required.');
    }

    if (!payload.clinical_visit_id) {
      throw new Error('Validation failure: Completed clinical visit ID is required.');
    }

    const { data, error } = await supabase.rpc('consume_package_session', {
      p_practice_id: activePracticeId,
      p_entitlement_id: payload.entitlement_id,
      p_clinical_visit_id: payload.clinical_visit_id,
      p_notes: payload.notes || null,
    });

    if (error) {
      throw error;
    }

    return data as unknown as {
      success: boolean;
      consumption_id: string;
      entitlement_id: string;
      package_number: string;
      clinical_visit_id: string;
      patient_id: string;
      total_sessions: number;
      consumed_sessions: number;
      remaining_sessions: number;
      status: string;
    };
  },

  /**
   * Extends the validity window of an active or expired package.
   */
  async extendPackageValidity(
    payload: ExtendPackageValidityPayload,
    practiceId?: string
  ): Promise<{
    success: boolean;
    package_id: string;
    package_number: string;
    old_expires_at: string;
    new_expires_at: string;
    reason: string;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!payload.entitlement_id) {
      throw new Error('Validation failure: Package entitlement ID is required.');
    }

    if (!payload.new_expires_at) {
      throw new Error('Validation failure: New expiration date is required.');
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      throw new Error('Validation failure: Reason must be at least 5 characters.');
    }

    const { data, error } = await supabase.rpc('extend_package_validity', {
      p_practice_id: activePracticeId,
      p_entitlement_id: payload.entitlement_id,
      p_new_expires_at: payload.new_expires_at,
      p_reason: payload.reason.trim(),
    });

    if (error) {
      throw error;
    }

    return data as unknown as {
      success: boolean;
      package_id: string;
      package_number: string;
      old_expires_at: string;
      new_expires_at: string;
      reason: string;
    };
  },

  /**
   * Administratively cancels a package entitlement, forfeiting remaining sessions.
   */
  async cancelPackage(
    payload: CancelPackagePayload,
    practiceId?: string
  ): Promise<{
    success: boolean;
    package_id: string;
    package_number: string;
    status: string;
    consumed_sessions: number;
    forfeited_sessions: number;
    reason: string;
  }> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!payload.entitlement_id) {
      throw new Error('Validation failure: Package entitlement ID is required.');
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      throw new Error('Validation failure: Cancellation reason must be at least 5 characters.');
    }

    const { data, error } = await supabase.rpc('cancel_package', {
      p_practice_id: activePracticeId,
      p_entitlement_id: payload.entitlement_id,
      p_reason: payload.reason.trim(),
    });

    if (error) {
      throw error;
    }

    return data as unknown as {
      success: boolean;
      package_id: string;
      package_number: string;
      status: string;
      consumed_sessions: number;
      forfeited_sessions: number;
      reason: string;
    };
  },
};
