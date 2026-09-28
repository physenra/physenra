-- ==============================================================================
-- PHYSENRA TREATMENT PLAN & CLINICAL GOALS FOUNDATION V1
-- ==============================================================================
-- Controlled Migration: Treatment Plan & Clinical Goals Foundation
-- Domain Hierarchy: Patient -> Episode of Care -> Treatment Plan -> Goals
-- Architectural Isolation:
--   Patient != Episode != Appointment != Visit != Note != Outcome Measure != HEP != Treatment Plan
--   Treatment Plan != Billing != Invoices != Payments != Packages != Wallets != Insurance
-- ==============================================================================

-- 1. ENUMS & DOMAIN TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.treatment_plan_status AS ENUM (
        'draft',
        'active',
        'paused',
        'completed',
        'discontinued'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.treatment_goal_category AS ENUM (
        'range_of_motion',
        'strength',
        'pain_reduction',
        'functional',
        'balance',
        'mobility',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.treatment_goal_priority AS ENUM (
        'low',
        'medium',
        'high'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.treatment_goal_status AS ENUM (
        'draft',
        'active',
        'achieved',
        'partially_achieved',
        'not_achieved',
        'discontinued'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PRACTICE TREATMENT PLAN COUNTERS (ATOMIC SEQUENTIAL NUMBERING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_treatment_plan_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_treatment_plan_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY tp_counters_select_policy ON public.practice_treatment_plan_counters
    FOR SELECT TO authenticated
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

-- Identifier Generator Function (SECURITY DEFINER, race-safe, atomic)
CREATE OR REPLACE FUNCTION public.generate_next_treatment_plan_identifier(p_practice_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_next_val INTEGER;
    v_caller_role TEXT;
BEGIN
    -- Verify practice context match
    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    -- Verify caller authorized clinical/management role
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient clinical privileges to generate treatment plan identifier.';
    END IF;

    -- Atomically increment counter
    INSERT INTO public.practice_treatment_plan_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_treatment_plan_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'TPL-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_next_treatment_plan_identifier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_treatment_plan_identifier(UUID) TO authenticated;

-- 3. TREATMENT PLANS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    episode_id UUID NOT NULL REFERENCES public.episodes_of_care(id) ON DELETE RESTRICT,
    originating_clinical_visit_id UUID NULL REFERENCES public.clinical_visits(id) ON DELETE SET NULL,
    prescribing_clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    plan_identifier TEXT NOT NULL,
    title TEXT NOT NULL,
    diagnosis_summary TEXT NULL,
    clinical_rationale TEXT NULL,
    overall_goals_summary TEXT NULL,
    treatment_frequency TEXT NULL,
    expected_duration_weeks INTEGER NULL CHECK (expected_duration_weeks IS NULL OR expected_duration_weeks > 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_review_date DATE NULL CHECK (target_review_date IS NULL OR target_review_date >= start_date),
    status public.treatment_plan_status NOT NULL DEFAULT 'draft',
    finalized_at TIMESTAMPTZ NULL,
    finalized_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    discontinued_reason TEXT NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_treatment_plan_practice_identifier UNIQUE (practice_id, plan_identifier),
    CONSTRAINT uq_treatment_plan_id_practice UNIQUE (id, practice_id),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_treatment_plans_patient_practice
        FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_treatment_plans_episode_patient_practice
        FOREIGN KEY (episode_id, patient_id, practice_id)
        REFERENCES public.episodes_of_care(id, patient_id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_treatment_plans_visit_patient_practice
        FOREIGN KEY (originating_clinical_visit_id, patient_id, practice_id)
        REFERENCES public.clinical_visits(id, patient_id, practice_id)
        ON DELETE SET NULL
);

-- 4. TREATMENT PLAN GOALS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatment_plan_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    treatment_plan_id UUID NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    goal_statement TEXT NOT NULL,
    category public.treatment_goal_category NOT NULL DEFAULT 'functional',
    baseline_description TEXT NULL,
    target_description TEXT NULL,
    measurement_method TEXT NULL,
    target_timeframe_weeks INTEGER NULL CHECK (target_timeframe_weeks IS NULL OR target_timeframe_weeks > 0),
    priority public.treatment_goal_priority NOT NULL DEFAULT 'medium',
    status public.treatment_goal_status NOT NULL DEFAULT 'draft',
    review_date DATE NULL,
    achieved_date DATE NULL,
    notes TEXT NULL,
    baseline_outcome_assessment_id UUID NULL,
    target_outcome_assessment_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Multi-tenant Composite Foreign Key to Plan
    CONSTRAINT fk_tp_goals_plan_practice
        FOREIGN KEY (treatment_plan_id, practice_id)
        REFERENCES public.treatment_plans(id, practice_id)
        ON DELETE CASCADE,

    -- Outcome Measure References
    CONSTRAINT fk_tp_goals_baseline_oa
        FOREIGN KEY (baseline_outcome_assessment_id)
        REFERENCES public.outcome_measure_assessments(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_tp_goals_target_oa
        FOREIGN KEY (target_outcome_assessment_id)
        REFERENCES public.outcome_measure_assessments(id)
        ON DELETE SET NULL
);

-- 5. TRIGGERS & VALIDATION FUNCTIONS
-- ------------------------------------------------------------------------------

-- set_updated_at triggers
DROP TRIGGER IF EXISTS trg_treatment_plans_updated_at ON public.treatment_plans;
CREATE TRIGGER trg_treatment_plans_updated_at
    BEFORE UPDATE ON public.treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_treatment_plan_goals_updated_at ON public.treatment_plan_goals;
CREATE TRIGGER trg_treatment_plan_goals_updated_at
    BEFORE UPDATE ON public.treatment_plan_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Validate prescribing clinician membership & clinical role
CREATE OR REPLACE FUNCTION public.validate_treatment_plan_clinician()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.practice_memberships
        WHERE practice_id = NEW.practice_id
          AND user_id = NEW.prescribing_clinician_id
          AND status = 'active'
          AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
    ) THEN
        RAISE EXCEPTION 'Integrity error: Prescribing clinician must be an active physiotherapist or clinical manager in the practice.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_treatment_plan_clinician ON public.treatment_plans;
CREATE TRIGGER trg_validate_treatment_plan_clinician
    BEFORE INSERT OR UPDATE OF prescribing_clinician_id, practice_id ON public.treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_treatment_plan_clinician();

-- Protect treatment plan immutability & enforce state machine
CREATE OR REPLACE FUNCTION public.protect_treatment_plan_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Prevent changing identity/tenancy columns
    IF OLD.id <> NEW.id OR OLD.practice_id <> NEW.practice_id OR OLD.patient_id <> NEW.patient_id OR OLD.episode_id <> NEW.episode_id OR OLD.plan_identifier <> NEW.plan_identifier THEN
        RAISE EXCEPTION 'Integrity violation: Core identity, patient, episode, and identifier of a Treatment Plan are strictly immutable.';
    END IF;

    -- Validate state transitions
    IF OLD.status <> NEW.status THEN
        IF OLD.status = 'completed' THEN
            RAISE EXCEPTION 'Invalid transition: Completed treatment plans are in a terminal state.';
        END IF;

        IF OLD.status = 'discontinued' THEN
            RAISE EXCEPTION 'Invalid transition: Discontinued treatment plans are in a terminal state.';
        END IF;

        IF OLD.status = 'draft' AND NEW.status NOT IN ('active', 'discontinued') THEN
            RAISE EXCEPTION 'Invalid transition: Draft plans can only transition to active or discontinued.';
        END IF;

        IF OLD.status = 'active' AND NEW.status NOT IN ('paused', 'completed', 'discontinued') THEN
            RAISE EXCEPTION 'Invalid transition: Active plans can only transition to paused, completed, or discontinued.';
        END IF;

        IF OLD.status = 'paused' AND NEW.status NOT IN ('active', 'discontinued') THEN
            RAISE EXCEPTION 'Invalid transition: Paused plans can only transition to active or discontinued.';
        END IF;

        -- Require reason on discontinuation
        IF NEW.status = 'discontinued' AND (NEW.discontinued_reason IS NULL OR trim(NEW.discontinued_reason) = '') THEN
            RAISE EXCEPTION 'A clinical justification reason is strictly required when discontinuing a Treatment Plan.';
        END IF;

        -- On activation, set finalized_at
        IF OLD.status = 'draft' AND NEW.status = 'active' THEN
            NEW.finalized_at := now();
            IF NEW.finalized_by IS NULL THEN
                NEW.finalized_by := auth.uid();
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_treatment_plan_immutability ON public.treatment_plans;
CREATE TRIGGER trg_protect_treatment_plan_immutability
    BEFORE UPDATE ON public.treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_treatment_plan_immutability();

-- Protect treatment plan goals when plan is finalized/terminal
CREATE OR REPLACE FUNCTION public.protect_treatment_plan_goals_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_plan_status public.treatment_plan_status;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT status INTO v_plan_status FROM public.treatment_plans WHERE id = OLD.treatment_plan_id;
        IF v_plan_status IN ('active', 'paused', 'completed', 'discontinued') THEN
            RAISE EXCEPTION 'Integrity violation: Cannot delete clinical goals from an active, paused, or terminal treatment plan.';
        END IF;
        RETURN OLD;
    ELSE
        SELECT status INTO v_plan_status FROM public.treatment_plans WHERE id = NEW.treatment_plan_id;
        IF v_plan_status IN ('completed', 'discontinued') THEN
            RAISE EXCEPTION 'Integrity violation: Cannot modify clinical goals on a completed or discontinued treatment plan.';
        END IF;
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_treatment_plan_goals_lifecycle ON public.treatment_plan_goals;
CREATE TRIGGER trg_protect_treatment_plan_goals_lifecycle
    BEFORE INSERT OR UPDATE OR DELETE ON public.treatment_plan_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_treatment_plan_goals_lifecycle();

-- Strictly deny hard deletion of treatment plans
CREATE OR REPLACE FUNCTION public.deny_treatment_plan_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Medical Record Protection: Hard deletion of Treatment Plans is strictly prohibited. Discontinue the plan instead.';
END;
$$;

DROP TRIGGER IF EXISTS trg_deny_treatment_plan_hard_delete ON public.treatment_plans;
CREATE TRIGGER trg_deny_treatment_plan_hard_delete
    BEFORE DELETE ON public.treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.deny_treatment_plan_hard_delete();

-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_goals ENABLE ROW LEVEL SECURITY;

-- treatment_plans policies
CREATE POLICY treatment_plans_select_policy ON public.treatment_plans
    FOR SELECT TO authenticated
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant'])
    );

CREATE POLICY treatment_plans_insert_policy ON public.treatment_plans
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

CREATE POLICY treatment_plans_update_policy ON public.treatment_plans
    FOR UPDATE TO authenticated
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

CREATE POLICY treatment_plans_deny_delete ON public.treatment_plans
    FOR DELETE TO authenticated
    USING (false);

-- treatment_plan_goals policies
CREATE POLICY tp_goals_select_policy ON public.treatment_plan_goals
    FOR SELECT TO authenticated
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant'])
    );

CREATE POLICY tp_goals_insert_policy ON public.treatment_plan_goals
    FOR INSERT TO authenticated
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

CREATE POLICY tp_goals_update_policy ON public.treatment_plan_goals
    FOR UPDATE TO authenticated
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

CREATE POLICY tp_goals_delete_policy ON public.treatment_plan_goals
    FOR DELETE TO authenticated
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

-- 7. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_treatment_plans_practice_patient
    ON public.treatment_plans (practice_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_practice_episode
    ON public.treatment_plans (practice_id, episode_id);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_practice_visit
    ON public.treatment_plans (practice_id, originating_clinical_visit_id);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_practice_clinician
    ON public.treatment_plans (practice_id, prescribing_clinician_id);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_practice_status
    ON public.treatment_plans (practice_id, status);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_dates
    ON public.treatment_plans (practice_id, start_date, target_review_date);

CREATE INDEX IF NOT EXISTS idx_tp_goals_plan
    ON public.treatment_plan_goals (treatment_plan_id, order_index);

CREATE INDEX IF NOT EXISTS idx_tp_goals_practice_status
    ON public.treatment_plan_goals (practice_id, status);
