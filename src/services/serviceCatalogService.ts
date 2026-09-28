// ==============================================================================
// PHYSENRA SERVICE CATALOG & FEE SCHEDULE FOUNDATION V1 SERVICE LAYER
// File: src/services/serviceCatalogService.ts
//
// Governs:
// 1. Service Catalog CRUD & practice-scoped unique codes
// 2. Fee Schedule lifecycle (draft -> active -> archived)
// 3. Fee Schedule Items with strict monetary precision & currency validation
// 4. PostgREST constraint disambiguation (explicit hints)
// 5. Audit logging integration via public.log_audit_event
// 6. Absolute boundary firewall: Zero invoices, payments, packages, wallets
// ==============================================================================

import { supabase, getActivePracticeHeader } from '../lib/supabase';
import type {
  Service,
  ServiceInsert,
  ServiceUpdate,
  FeeSchedule,
  FeeScheduleInsert,
  FeeScheduleUpdate,
  FeeScheduleItem,
  FeeScheduleItemInsert,
  FeeScheduleWithItems,
  ServiceCategory,
  FeeScheduleStatus,
  ServiceFilters,
  FeeScheduleFilters,
} from '../types/models';

/**
 * Valid allowed state transitions for Fee Schedule V1.
 */
export const ALLOWED_FEE_SCHEDULE_TRANSITIONS: Record<
  FeeScheduleStatus,
  FeeScheduleStatus[]
> = {
  draft: ['active', 'archived'],
  active: ['archived'],
  archived: [], // Terminal, immutable state
};

export const serviceCatalogService = {
  // ----------------------------------------------------------------------------
  // SERVICE CATALOG METHODS
  // ----------------------------------------------------------------------------

  /**
   * Retrieves all services for the practice matching optional filters.
   */
  async getServices(
    practiceId?: string,
    filters?: ServiceFilters
  ): Promise<Service[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('services')
      .select('*')
      .eq('practice_id', activePracticeId)
      .order('service_code', { ascending: true });

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.deliveryMode && filters.deliveryMode !== 'all') {
      query = query.or(`delivery_mode.eq.${filters.deliveryMode},delivery_mode.eq.all`);
    }

    if (filters?.isActive !== undefined && filters.isActive !== 'all') {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const term = `%${filters.searchQuery.trim()}%`;
      query = query.or(`name.ilike.${term},service_code.ilike.${term},description.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[serviceCatalogService.getServices] Error fetching services:', error);
      throw error;
    }

    return (data || []) as Service[];
  },

  /**
   * Retrieves a specific service by ID within tenant context.
   */
  async getServiceById(
    serviceId: string,
    practiceId?: string
  ): Promise<Service | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      console.error('[serviceCatalogService.getServiceById] Error fetching service:', error);
      throw error;
    }

    return data as Service | null;
  },

  /**
   * Generates next practice-scoped service code.
   */
  async generateNextServiceCode(practiceId?: string): Promise<string> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('generate_next_service_code', {
      p_practice_id: activePracticeId,
    });

    if (error) {
      console.error('[serviceCatalogService.generateNextServiceCode] Error:', error);
      throw error;
    }

    return data as string;
  },

  /**
   * Creates a new service in the practice catalog.
   */
  async createService(
    input: {
      name: string;
      category: ServiceCategory;
      description?: string | null;
      standard_duration_minutes?: number;
      delivery_mode?: string;
      is_active?: boolean;
      service_code?: string;
    },
    practiceId?: string
  ): Promise<Service> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!input.name || !input.name.trim()) {
      throw new Error('Service name is required.');
    }

    if (!input.category) {
      throw new Error('Service category is required.');
    }

    // Determine or generate service code
    let serviceCode = input.service_code?.trim();
    if (!serviceCode) {
      serviceCode = await this.generateNextServiceCode(activePracticeId);
    }

    const { data: { user } } = await supabase.auth.getUser();

    const insertPayload: ServiceInsert = {
      practice_id: activePracticeId,
      service_code: serviceCode,
      name: input.name.trim(),
      category: input.category,
      description: input.description?.trim() || null,
      standard_duration_minutes: input.standard_duration_minutes && input.standard_duration_minutes > 0 ? input.standard_duration_minutes : 30,
      delivery_mode: input.delivery_mode || 'all',
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_by: user?.id || null,
      updated_by: user?.id || null,
    };

    const { data, error } = await supabase
      .from('services')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[serviceCatalogService.createService] Error creating service:', error);
      throw error;
    }

    const createdService = data as Service;

    // Log Audit Event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'service.created',
        p_entity_type: 'service',
        p_entity_id: createdService.id,
        p_metadata: {
          service_code: createdService.service_code,
          name: createdService.name,
          category: createdService.category,
          standard_duration_minutes: createdService.standard_duration_minutes,
        },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('[serviceCatalogService.createService] Audit logging failed non-fatally:', auditErr);
    }

    return createdService;
  },

  /**
   * Updates an existing service catalog entry.
   */
  async updateService(
    serviceId: string,
    input: Partial<Pick<Service, 'name' | 'category' | 'description' | 'standard_duration_minutes' | 'delivery_mode' | 'is_active'>>,
    practiceId?: string
  ): Promise<Service> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data: { user } } = await supabase.auth.getUser();

    const updatePayload: ServiceUpdate = {
      ...input,
      updated_by: user?.id || null,
    };

    const { data, error } = await supabase
      .from('services')
      .update(updatePayload)
      .eq('id', serviceId)
      .eq('practice_id', activePracticeId)
      .select('*')
      .single();

    if (error) {
      console.error('[serviceCatalogService.updateService] Error updating service:', error);
      throw error;
    }

    const updatedService = data as Service;

    // Log Audit Event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'service.updated',
        p_entity_type: 'service',
        p_entity_id: updatedService.id,
        p_metadata: {
          service_code: updatedService.service_code,
          updated_fields: Object.keys(input),
        },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('[serviceCatalogService.updateService] Audit logging failed non-fatally:', auditErr);
    }

    return updatedService;
  },

  /**
   * Activates or deactivates a service.
   */
  async toggleServiceStatus(
    serviceId: string,
    isActive: boolean,
    practiceId?: string
  ): Promise<Service> {
    const result = await this.updateService(serviceId, { is_active: isActive }, practiceId);
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'service.status_changed',
        p_entity_type: 'service',
        p_entity_id: serviceId,
        p_metadata: { is_active: isActive },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('[serviceCatalogService.toggleServiceStatus] Audit logging failed non-fatally:', auditErr);
    }
    return result;
  },

  // ----------------------------------------------------------------------------
  // FEE SCHEDULE METHODS
  // ----------------------------------------------------------------------------

  /**
   * Retrieves all fee schedules for the practice with items and service details.
   * Uses explicit PostgREST constraint hints to prevent PGRST201 ambiguity.
   */
  async getFeeSchedules(
    practiceId?: string,
    filters?: FeeScheduleFilters
  ): Promise<FeeScheduleWithItems[]> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    let query = supabase
      .from('fee_schedules')
      .select(`
        *,
        items:fee_schedule_items!fk_fee_schedule_items_schedule_practice (
          *,
          service:services!fk_fee_schedule_items_service_practice (
            id,
            service_code,
            name,
            category,
            standard_duration_minutes,
            delivery_mode,
            is_active
          )
        )
      `)
      .eq('practice_id', activePracticeId)
      .order('effective_from', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.isDefault !== undefined) {
      query = query.eq('is_default', filters.isDefault);
    }

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const term = `%${filters.searchQuery.trim()}%`;
      query = query.or(`name.ilike.${term},schedule_identifier.ilike.${term},description.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[serviceCatalogService.getFeeSchedules] Error fetching fee schedules:', error);
      throw error;
    }

    return (data || []) as unknown as FeeScheduleWithItems[];
  },

  /**
   * Retrieves a single fee schedule with items and services.
   * Uses explicit PostgREST constraint hints.
   */
  async getFeeScheduleById(
    scheduleId: string,
    practiceId?: string
  ): Promise<FeeScheduleWithItems | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('fee_schedules')
      .select(`
        *,
        items:fee_schedule_items!fk_fee_schedule_items_schedule_practice (
          *,
          service:services!fk_fee_schedule_items_service_practice (
            id,
            service_code,
            name,
            category,
            standard_duration_minutes,
            delivery_mode,
            is_active
          )
        )
      `)
      .eq('id', scheduleId)
      .eq('practice_id', activePracticeId)
      .maybeSingle();

    if (error) {
      console.error('[serviceCatalogService.getFeeScheduleById] Error fetching fee schedule:', error);
      throw error;
    }

    return data as unknown as FeeScheduleWithItems | null;
  },

  /**
   * Retrieves the current default active fee schedule for the practice.
   */
  async getDefaultActiveFeeSchedule(
    practiceId?: string
  ): Promise<FeeScheduleWithItems | null> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase
      .from('fee_schedules')
      .select(`
        *,
        items:fee_schedule_items!fk_fee_schedule_items_schedule_practice (
          *,
          service:services!fk_fee_schedule_items_service_practice (
            id,
            service_code,
            name,
            category,
            standard_duration_minutes,
            delivery_mode,
            is_active
          )
        )
      `)
      .eq('practice_id', activePracticeId)
      .eq('status', 'active')
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      console.error('[serviceCatalogService.getDefaultActiveFeeSchedule] Error:', error);
      throw error;
    }

    return data as unknown as FeeScheduleWithItems | null;
  },

  /**
   * Generates next practice-scoped fee schedule identifier (FS-000001).
   */
  async generateNextFeeScheduleIdentifier(practiceId?: string): Promise<string> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const { data, error } = await supabase.rpc('generate_next_fee_schedule_identifier', {
      p_practice_id: activePracticeId,
    });

    if (error) {
      console.error('[serviceCatalogService.generateNextFeeScheduleIdentifier] Error:', error);
      throw error;
    }

    return data as string;
  },

  /**
   * Creates a new fee schedule.
   */
  async createFeeSchedule(
    input: {
      name: string;
      description?: string | null;
      effective_from?: string;
      effective_to?: string | null;
      status?: FeeScheduleStatus;
      is_default?: boolean;
      currency?: string;
    },
    practiceId?: string
  ): Promise<FeeSchedule> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (!input.name || !input.name.trim()) {
      throw new Error('Fee schedule name is required.');
    }

    const scheduleIdentifier = await this.generateNextFeeScheduleIdentifier(activePracticeId);
    const { data: { user } } = await supabase.auth.getUser();

    // If marked default active, deactivate existing defaults
    if (input.is_default && input.status === 'active') {
      await supabase
        .from('fee_schedules')
        .update({ is_default: false })
        .eq('practice_id', activePracticeId)
        .eq('is_default', true);
    }

    const insertPayload: FeeScheduleInsert = {
      practice_id: activePracticeId,
      schedule_identifier: scheduleIdentifier,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      effective_from: input.effective_from || new Date().toISOString().split('T')[0],
      effective_to: input.effective_to || null,
      status: input.status || 'draft',
      is_default: input.is_default || false,
      currency: (input.currency || 'NGN').toUpperCase(),
      created_by: user?.id || null,
      updated_by: user?.id || null,
    };

    const { data, error } = await supabase
      .from('fee_schedules')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('[serviceCatalogService.createFeeSchedule] Error creating fee schedule:', error);
      throw error;
    }

    const createdSchedule = data as FeeSchedule;

    // Log Audit Event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'fee_schedule.created',
        p_entity_type: 'fee_schedule',
        p_entity_id: createdSchedule.id,
        p_metadata: {
          schedule_identifier: createdSchedule.schedule_identifier,
          name: createdSchedule.name,
          status: createdSchedule.status,
          currency: createdSchedule.currency,
          effective_from: createdSchedule.effective_from,
        },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('[serviceCatalogService.createFeeSchedule] Audit logging failed non-fatally:', auditErr);
    }

    return createdSchedule;
  },

  /**
   * Updates an existing fee schedule. Enforces state transitions.
   */
  async updateFeeSchedule(
    scheduleId: string,
    input: Partial<Pick<FeeSchedule, 'name' | 'description' | 'effective_from' | 'effective_to' | 'status' | 'is_default' | 'currency'>>,
    practiceId?: string
  ): Promise<FeeSchedule> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    // Verify current state
    const current = await this.getFeeScheduleById(scheduleId, activePracticeId);
    if (!current) {
      throw new Error(`Fee schedule not found: ${scheduleId}`);
    }

    if (current.status === 'archived') {
      throw new Error('Archived fee schedules are permanently locked and cannot be updated.');
    }

    if (input.status && input.status !== current.status) {
      const allowed = ALLOWED_FEE_SCHEDULE_TRANSITIONS[current.status];
      if (!allowed.includes(input.status)) {
        throw new Error(`Invalid fee schedule transition from '${current.status}' to '${input.status}'.`);
      }
    }

    // If making this schedule default active, clear other defaults
    if (input.is_default && (input.status === 'active' || (input.status === undefined && current.status === 'active'))) {
      await supabase
        .from('fee_schedules')
        .update({ is_default: false })
        .eq('practice_id', activePracticeId)
        .neq('id', scheduleId)
        .eq('is_default', true);
    }

    const { data: { user } } = await supabase.auth.getUser();

    const updatePayload: FeeScheduleUpdate = {
      ...input,
      currency: input.currency ? input.currency.toUpperCase() : undefined,
      updated_by: user?.id || null,
    };

    const { data, error } = await supabase
      .from('fee_schedules')
      .update(updatePayload)
      .eq('id', scheduleId)
      .eq('practice_id', activePracticeId)
      .select('*')
      .single();

    if (error) {
      console.error('[serviceCatalogService.updateFeeSchedule] Error updating fee schedule:', error);
      throw error;
    }

    const updatedSchedule = data as FeeSchedule;

    // Log Audit Event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: input.status && input.status !== current.status ? 'fee_schedule.status_changed' : 'fee_schedule.updated',
        p_entity_type: 'fee_schedule',
        p_entity_id: updatedSchedule.id,
        p_metadata: {
          schedule_identifier: updatedSchedule.schedule_identifier,
          updated_fields: Object.keys(input),
          status: updatedSchedule.status,
        },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('[serviceCatalogService.updateFeeSchedule] Audit logging failed non-fatally:', auditErr);
    }

    return updatedSchedule;
  },

  /**
   * Archives a fee schedule, freezing all prices and preventing further edits.
   */
  async archiveFeeSchedule(
    scheduleId: string,
    practiceId?: string
  ): Promise<FeeSchedule> {
    return this.updateFeeSchedule(scheduleId, { status: 'archived', is_default: false }, practiceId);
  },

  // ----------------------------------------------------------------------------
  // FEE SCHEDULE ITEMS METHODS
  // ----------------------------------------------------------------------------

  /**
   * Adds or updates a fee tariff for a service within a fee schedule.
   */
  async upsertFeeScheduleItem(
    input: {
      fee_schedule_id: string;
      service_id: string;
      unit_price: number;
      currency?: string;
      is_taxable?: boolean;
      tax_rate_percent?: number;
      notes?: string | null;
    },
    practiceId?: string
  ): Promise<FeeScheduleItem> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    if (input.unit_price < 0) {
      throw new Error('Unit price cannot be negative.');
    }

    // Verify parent schedule is not archived
    const schedule = await this.getFeeScheduleById(input.fee_schedule_id, activePracticeId);
    if (!schedule) {
      throw new Error('Parent fee schedule not found.');
    }
    if (schedule.status === 'archived') {
      throw new Error('Cannot add or update items on an archived fee schedule.');
    }

    const { data: { user } } = await supabase.auth.getUser();

    const itemPayload: FeeScheduleItemInsert = {
      practice_id: activePracticeId,
      fee_schedule_id: input.fee_schedule_id,
      service_id: input.service_id,
      unit_price: input.unit_price,
      currency: (input.currency || schedule.currency).toUpperCase(),
      is_taxable: input.is_taxable || false,
      tax_rate_percent: input.tax_rate_percent && input.tax_rate_percent >= 0 ? input.tax_rate_percent : 0.00,
      notes: input.notes?.trim() || null,
      created_by: user?.id || null,
      updated_by: user?.id || null,
    };

    const { data, error } = await supabase
      .from('fee_schedule_items')
      .upsert(itemPayload, {
        onConflict: 'fee_schedule_id,service_id',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[serviceCatalogService.upsertFeeScheduleItem] Error upserting item:', error);
      throw error;
    }

    const upsertedItem = data as FeeScheduleItem;

    // Log Audit Event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'fee_schedule.item_upserted',
        p_entity_type: 'fee_schedule_item',
        p_entity_id: upsertedItem.id,
        p_metadata: {
          fee_schedule_id: upsertedItem.fee_schedule_id,
          service_id: upsertedItem.service_id,
          unit_price: upsertedItem.unit_price,
          currency: upsertedItem.currency,
        },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('[serviceCatalogService.upsertFeeScheduleItem] Audit logging failed non-fatally:', auditErr);
    }

    return upsertedItem;
  },

  /**
   * Deletes a fee schedule item from a draft schedule.
   */
  async deleteFeeScheduleItem(
    itemId: string,
    feeScheduleId: string,
    practiceId?: string
  ): Promise<void> {
    const activePracticeId = practiceId || getActivePracticeHeader();
    if (!activePracticeId) {
      throw new Error('Tenant context required: Active practice ID is missing.');
    }

    const schedule = await this.getFeeScheduleById(feeScheduleId, activePracticeId);
    if (!schedule) {
      throw new Error('Parent fee schedule not found.');
    }
    if (schedule.status === 'archived') {
      throw new Error('Cannot delete items from an archived fee schedule.');
    }

    const { error } = await supabase
      .from('fee_schedule_items')
      .delete()
      .eq('id', itemId)
      .eq('practice_id', activePracticeId);

    if (error) {
      console.error('[serviceCatalogService.deleteFeeScheduleItem] Error deleting item:', error);
      throw error;
    }

    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'fee_schedule.item_deleted',
        p_entity_type: 'fee_schedule_item',
        p_entity_id: itemId,
        p_metadata: { fee_schedule_id: feeScheduleId },
        p_source: 'web',
      });
    } catch (auditErr) {
      console.warn('[serviceCatalogService.deleteFeeScheduleItem] Audit logging failed non-fatally:', auditErr);
    }
  },
};
