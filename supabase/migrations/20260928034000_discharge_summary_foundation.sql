-- ==============================================================================
-- PHYSENRA DISCHARGE SUMMARY FOUNDATION V1
-- ==============================================================================
-- Controlled Migration: Discharge Summary Foundation
-- Clinical Continuum: Patient -> Episode of Care -> Treatment Plan -> Clinical Goals -> Progress Review -> Discharge Summary
-- Architectural Isolation:
--   Patient != Episode != Appointment != Visit != Note != Outcome Measure != HEP != Treatment Plan != Progress Review != Discharge Summary
--   Discharge Summary != Billing != Invoices != Payments != Packages != Wallets != Insurance
--   Discharge Summary != AI != WhatsApp != Email Automation
-- ==============================================================================

-- 1. ENUMS & DOMAIN TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.discharge_summary_status AS ENUM (
        'draft',
        'finalized',
        'amended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.discharge_reason AS ENUM (
        'goals_achieved',
        'goals_partially_achieved',
        'patient_independent',
        'plateau',
        'patient_choice',
        'transfer_of_care',
        'referred_elsewhere',
        'lost_to_follow_up',
        'financial_administrative',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.discharge_disposition AS ENUM (
        'discharged_to_self_management',
        'discharged_with_home_program',
        'follow_up_with_referrer',
        'transferred_to_other_provider',
        'continued_care_elsewhere',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PRACTICE DISCHARGE SUMMARY COUNTERS (ATOMIC SEQUENTIAL NUMBERING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_discharge_summary_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-level security for counters
ALTER TABLE public.practice_discharge_summary_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_ds_counters_isolation" ON public.practice_discharge_summary_counters;
CREATE POLICY "practice_ds_counters_isolation"
    ON public.practice_discharge_summary_counters
    FOR ALL
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

-- Sequence Generator Function: DS-000001
CREATE OR REPLACE FUNCTION public.generate_next_discharge_summary_identifier(p_practice_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_next_val INTEGER;
BEGIN
    -- Verify practice context match
    IF p_practice_id IS NULL OR p_practice_id <> public.current_practice_id() THEN
        RAISE EXCEPTION 'Operation not permitted: Tenant context mismatch.';
    END IF;

    -- Verify caller authorized clinical/management role
    IF NOT public.user_has_practice_role(p_practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist']) THEN
        RAISE EXCEPTION 'Operation not permitted: Insufficient clinical privileges to generate discharge summary identifier.';
    END IF;

    -- Atomically increment counter
    INSERT INTO public.practice_discharge_summary_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_discharge_summary_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'DS-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_next_discharge_summary_identifier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_discharge_summary_identifier(UUID) TO authenticated;

-- Ensure progress_reviews has composite unique constraint for multi-tenant FK
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_progress_reviews_id_patient_episode_practice'
    ) THEN
        ALTER TABLE public.progress_reviews
        ADD CONSTRAINT uq_progress_reviews_id_patient_episode_practice
        UNIQUE (id, patient_id, episode_id, practice_id);
    END IF;
END $$;

-- 3. DISCHARGE SUMMARIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discharge_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    episode_id UUID NOT NULL REFERENCES public.episodes_of_care(id) ON DELETE RESTRICT,
    treatment_plan_id UUID NULL REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
    originating_clinical_visit_id UUID NULL REFERENCES public.clinical_visits(id) ON DELETE SET NULL,
    final_progress_review_id UUID NULL REFERENCES public.progress_reviews(id) ON DELETE SET NULL,
    discharging_clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    summary_identifier TEXT NOT NULL,
    discharge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    discharge_reason public.discharge_reason NOT NULL DEFAULT 'goals_achieved',
    discharge_disposition public.discharge_disposition NOT NULL DEFAULT 'discharged_to_self_management',
    status public.discharge_summary_status NOT NULL DEFAULT 'draft',
    clinical_summary TEXT NOT NULL,
    functional_status_at_discharge TEXT NOT NULL,
    goal_attainment_summary TEXT NOT NULL,
    outcome_measure_summary TEXT NULL,
    treatment_summary TEXT NULL,
    hep_transition_summary TEXT NULL,
    recommendations TEXT NULL,
    follow_up_recommendations TEXT NULL,
    finalized_at TIMESTAMPTZ NULL,
    finalized_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    amendment_reason TEXT NULL,
    amended_at TIMESTAMPTZ NULL,
    amended_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_discharge_summary_practice_identifier UNIQUE (practice_id, summary_identifier),
    CONSTRAINT uq_discharge_summary_id_practice UNIQUE (id, practice_id),
    CONSTRAINT uq_discharge_summary_episode UNIQUE (episode_id),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_discharge_summaries_patient_practice
        FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_discharge_summaries_episode_patient_practice
        FOREIGN KEY (episode_id, patient_id, practice_id)
        REFERENCES public.episodes_of_care(id, patient_id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_discharge_summaries_plan_patient_episode_practice
        FOREIGN KEY (treatment_plan_id, patient_id, episode_id, practice_id)
        REFERENCES public.treatment_plans(id, patient_id, episode_id, practice_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_discharge_summaries_visit_patient_practice
        FOREIGN KEY (originating_clinical_visit_id, patient_id, practice_id)
        REFERENCES public.clinical_visits(id, patient_id, practice_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_discharge_summaries_review_patient_episode_practice
        FOREIGN KEY (final_progress_review_id, patient_id, episode_id, practice_id)
        REFERENCES public.progress_reviews(id, patient_id, episode_id, practice_id)
        ON DELETE SET NULL
);

-- 4. TRIGGERS & VALIDATION FUNCTIONS
-- ------------------------------------------------------------------------------

-- set_updated_at trigger
DROP TRIGGER IF EXISTS trg_discharge_summaries_updated_at ON public.discharge_summaries;
CREATE TRIGGER trg_discharge_summaries_updated_at
    BEFORE UPDATE ON public.discharge_summaries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Validate discharging clinician membership & clinical role
CREATE OR REPLACE FUNCTION public.validate_discharge_summary_clinician()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.practice_memberships
        WHERE practice_id = NEW.practice_id
          AND user_id = NEW.discharging_clinician_id
          AND status = 'active'
          AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
    ) THEN
        RAISE EXCEPTION 'Invalid discharging clinician: Must have active clinical membership in practice.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_discharge_summary_clinician ON public.discharge_summaries;
CREATE TRIGGER trg_validate_discharge_summary_clinician
    BEFORE INSERT OR UPDATE OF discharging_clinician_id, practice_id ON public.discharge_summaries
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_discharge_summary_clinician();

-- Immutability and State Machine Protection Trigger for Discharge Summaries
CREATE OR REPLACE FUNCTION public.protect_discharge_summary_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Prevent altering tenant or core relational foreign keys
    IF OLD.practice_id <> NEW.practice_id THEN
        RAISE EXCEPTION 'Illegal operation: practice_id cannot be changed.';
    END IF;

    IF OLD.patient_id <> NEW.patient_id THEN
        RAISE EXCEPTION 'Illegal operation: patient_id cannot be changed.';
    END IF;

    IF OLD.episode_id <> NEW.episode_id THEN
        RAISE EXCEPTION 'Illegal operation: episode_id cannot be changed.';
    END IF;

    IF OLD.summary_identifier <> NEW.summary_identifier THEN
        RAISE EXCEPTION 'Illegal operation: summary_identifier is immutable.';
    END IF;

    -- State machine enforcement
    IF OLD.status = 'finalized' THEN
        -- Only transition to 'amended' is permitted
        IF NEW.status = 'draft' THEN
            RAISE EXCEPTION 'Illegal transition: Finalized discharge summary cannot be reverted to draft.';
        END IF;

        IF NEW.status = 'finalized' THEN
            -- In-place modification of finalized summary is forbidden
            IF OLD.clinical_summary <> NEW.clinical_summary OR
               OLD.functional_status_at_discharge <> NEW.functional_status_at_discharge OR
               OLD.goal_attainment_summary <> NEW.goal_attainment_summary OR
               OLD.discharge_reason <> NEW.discharge_reason OR
               OLD.discharge_disposition <> NEW.discharge_disposition OR
               OLD.discharging_clinician_id <> NEW.discharging_clinician_id OR
               OLD.discharge_date <> NEW.discharge_date THEN
                RAISE EXCEPTION 'Finalized discharge summaries are immutable. Formal amendment required.';
            END IF;
        END IF;

        IF NEW.status = 'amended' THEN
            -- Amendment requires non-empty reason
            IF NEW.amendment_reason IS NULL OR trim(NEW.amendment_reason) = '' THEN
                RAISE EXCEPTION 'Amendment requires a non-empty amendment_reason.';
            END IF;

            -- Preserve original finalization provenance
            NEW.finalized_at := OLD.finalized_at;
            NEW.finalized_by := OLD.finalized_by;

            -- Set amendment stamping
            IF NEW.amended_at IS NULL THEN
                NEW.amended_at := now();
            END IF;
            IF NEW.amended_by IS NULL THEN
                NEW.amended_by := auth.uid();
            END IF;
        END IF;
    ELSIF OLD.status = 'amended' THEN
        -- Amended summaries cannot revert to draft or finalized
        IF NEW.status <> 'amended' THEN
            RAISE EXCEPTION 'Illegal transition: Amended discharge summary cannot be reverted to %.', NEW.status;
        END IF;
    ELSIF OLD.status = 'draft' THEN
        IF NEW.status = 'amended' THEN
            RAISE EXCEPTION 'Illegal transition: Draft discharge summary cannot jump directly to amended.';
        END IF;

        IF NEW.status = 'finalized' THEN
            -- Set finalization stamping
            IF NEW.finalized_at IS NULL THEN
                NEW.finalized_at := now();
            END IF;
            IF NEW.finalized_by IS NULL THEN
                NEW.finalized_by := auth.uid();
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_discharge_summary_immutability ON public.discharge_summaries;
CREATE TRIGGER trg_protect_discharge_summary_immutability
    BEFORE UPDATE ON public.discharge_summaries
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_discharge_summary_immutability();

-- Atomic Episode Closure Trigger on Discharge Summary Finalization
CREATE OR REPLACE FUNCTION public.discharge_summary_close_episode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_episode_status TEXT;
BEGIN
    -- Only act when summary enters finalized state
    IF (TG_OP = 'INSERT' AND NEW.status = 'finalized') OR
       (TG_OP = 'UPDATE' AND OLD.status = 'draft' AND NEW.status = 'finalized') THEN

        SELECT status INTO v_episode_status
        FROM public.episodes_of_care
        WHERE id = NEW.episode_id AND practice_id = NEW.practice_id;

        IF v_episode_status = 'archived' THEN
            RAISE EXCEPTION 'Operation rejected: Cannot finalize discharge against an archived episode of care.';
        END IF;

        -- Atomically complete the episode of care
        UPDATE public.episodes_of_care
        SET status = 'completed',
            closed_at = COALESCE(closed_at, now()),
            closed_by = COALESCE(closed_by, auth.uid()),
            end_date = COALESCE(end_date, NEW.discharge_date),
            updated_at = now()
        WHERE id = NEW.episode_id AND practice_id = NEW.practice_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discharge_summary_close_episode ON public.discharge_summaries;
CREATE TRIGGER trg_discharge_summary_close_episode
    AFTER INSERT OR UPDATE OF status ON public.discharge_summaries
    FOR EACH ROW
    EXECUTE FUNCTION public.discharge_summary_close_episode();

-- Hard Delete Deny Trigger for Discharge Summaries
CREATE OR REPLACE FUNCTION public.deny_discharge_summary_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status IN ('finalized', 'amended') THEN
        RAISE EXCEPTION 'Cannot hard delete finalized or amended discharge summaries. Medical records are immutable.';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_deny_discharge_summary_hard_delete ON public.discharge_summaries;
CREATE TRIGGER trg_deny_discharge_summary_hard_delete
    BEFORE DELETE ON public.discharge_summaries
    FOR EACH ROW
    EXECUTE FUNCTION public.deny_discharge_summary_hard_delete();

-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.discharge_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discharge_summaries_select_policy" ON public.discharge_summaries;
CREATE POLICY "discharge_summaries_select_policy"
    ON public.discharge_summaries
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller'])
    );

DROP POLICY IF EXISTS "discharge_summaries_insert_policy" ON public.discharge_summaries;
CREATE POLICY "discharge_summaries_insert_policy"
    ON public.discharge_summaries
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

DROP POLICY IF EXISTS "discharge_summaries_update_policy" ON public.discharge_summaries;
CREATE POLICY "discharge_summaries_update_policy"
    ON public.discharge_summaries
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

DROP POLICY IF EXISTS "discharge_summaries_delete_policy" ON public.discharge_summaries;
CREATE POLICY "discharge_summaries_delete_policy"
    ON public.discharge_summaries
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND status = 'draft'
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

-- 6. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_practice_id ON public.discharge_summaries(practice_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_patient_id ON public.discharge_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_episode_id ON public.discharge_summaries(episode_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_treatment_plan_id ON public.discharge_summaries(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_visit_id ON public.discharge_summaries(originating_clinical_visit_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_review_id ON public.discharge_summaries(final_progress_review_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_clinician_id ON public.discharge_summaries(discharging_clinician_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_status ON public.discharge_summaries(status);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_date ON public.discharge_summaries(discharge_date);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_reason ON public.discharge_summaries(discharge_reason);
