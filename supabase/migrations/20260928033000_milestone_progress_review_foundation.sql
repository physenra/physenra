-- ==============================================================================
-- PHYSENRA MILESTONE & PROGRESS REVIEW FOUNDATION V1
-- ==============================================================================
-- Controlled Migration: Milestone & Progress Review Foundation
-- Clinical Hierarchy: Patient -> Episode of Care -> Treatment Plan -> Clinical Goals -> Progress Review
-- Architectural Isolation:
--   Patient != Episode != Appointment != Visit != Note != Outcome Measure != HEP != Treatment Plan != Progress Review != Discharge Summary
--   Progress Review != Billing != Invoices != Payments != Packages != Wallets != Insurance
--   Progress Review != AI != WhatsApp != Email Automation
-- ==============================================================================

-- 1. ENUMS & DOMAIN TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.progress_review_status AS ENUM (
        'draft',
        'finalized',
        'amended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.overall_progress_rating AS ENUM (
        'significant_improvement',
        'progressing',
        'slow_progress',
        'plateaued',
        'regressed',
        'goals_met'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.progress_review_plan_recommendation AS ENUM (
        'continue_current_plan',
        'modify_goals',
        'advance_interventions',
        'reduce_frequency',
        'prepare_discharge'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.goal_progress_status AS ENUM (
        'in_progress',
        'achieved',
        'partially_achieved',
        'not_achieved',
        'regressed',
        'discontinued'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PRACTICE PROGRESS REVIEW COUNTERS (ATOMIC SEQUENTIAL NUMBERING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_progress_review_counters (
    practice_id UUID PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-level security for counters
ALTER TABLE public.practice_progress_review_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_counters_isolation" ON public.practice_progress_review_counters;
CREATE POLICY "practice_counters_isolation"
    ON public.practice_progress_review_counters
    FOR ALL
    USING (practice_id = public.current_practice_id())
    WITH CHECK (practice_id = public.current_practice_id());

-- Sequence Generator Function: PRG-000001
CREATE OR REPLACE FUNCTION public.generate_next_progress_review_identifier(p_practice_id UUID)
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
        RAISE EXCEPTION 'Operation not permitted: Insufficient clinical privileges to generate progress review identifier.';
    END IF;

    -- Atomically increment counter
    INSERT INTO public.practice_progress_review_counters (practice_id, last_number, updated_at)
    VALUES (p_practice_id, 1, now())
    ON CONFLICT (practice_id) DO UPDATE
        SET last_number = public.practice_progress_review_counters.last_number + 1,
            updated_at = now()
    RETURNING last_number INTO v_next_val;

    RETURN 'PRG-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_next_progress_review_identifier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_next_progress_review_identifier(UUID) TO authenticated;

-- Ensure parent tables have multi-tenant composite keys for Progress Review FKs
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_treatment_plans_id_patient_episode_practice'
    ) THEN
        ALTER TABLE public.treatment_plans
        ADD CONSTRAINT uq_treatment_plans_id_patient_episode_practice
        UNIQUE (id, patient_id, episode_id, practice_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_treatment_plan_goals_id_practice'
    ) THEN
        ALTER TABLE public.treatment_plan_goals
        ADD CONSTRAINT uq_treatment_plan_goals_id_practice
        UNIQUE (id, practice_id);
    END IF;
END $$;

-- 3. PROGRESS REVIEWS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    episode_id UUID NOT NULL REFERENCES public.episodes_of_care(id) ON DELETE RESTRICT,
    treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE RESTRICT,
    originating_clinical_visit_id UUID NULL REFERENCES public.clinical_visits(id) ON DELETE SET NULL,
    reviewing_clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    review_identifier TEXT NOT NULL,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_start_date DATE NULL,
    period_end_date DATE NULL CHECK (period_end_date IS NULL OR period_start_date IS NULL OR period_end_date >= period_start_date),
    overall_status public.progress_review_status NOT NULL DEFAULT 'draft',
    overall_progress_assessment public.overall_progress_rating NOT NULL DEFAULT 'progressing',
    clinical_summary TEXT NOT NULL,
    barriers_identified TEXT NULL,
    treatment_modifications TEXT NULL,
    plan_recommendation public.progress_review_plan_recommendation NOT NULL DEFAULT 'continue_current_plan',
    next_review_due_date DATE NULL CHECK (next_review_due_date IS NULL OR next_review_due_date >= review_date),
    finalized_at TIMESTAMPTZ NULL,
    finalized_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    amendment_reason TEXT NULL,
    amended_at TIMESTAMPTZ NULL,
    amended_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique Constraints
    CONSTRAINT uq_progress_review_practice_identifier UNIQUE (practice_id, review_identifier),
    CONSTRAINT uq_progress_review_id_practice UNIQUE (id, practice_id),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_progress_reviews_patient_practice
        FOREIGN KEY (patient_id, practice_id)
        REFERENCES public.patients(id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_progress_reviews_episode_patient_practice
        FOREIGN KEY (episode_id, patient_id, practice_id)
        REFERENCES public.episodes_of_care(id, patient_id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_progress_reviews_plan_patient_episode_practice
        FOREIGN KEY (treatment_plan_id, patient_id, episode_id, practice_id)
        REFERENCES public.treatment_plans(id, patient_id, episode_id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_progress_reviews_visit_patient_practice
        FOREIGN KEY (originating_clinical_visit_id, patient_id, practice_id)
        REFERENCES public.clinical_visits(id, patient_id, practice_id)
        ON DELETE SET NULL
);

-- 4. PROGRESS REVIEW GOALS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_review_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    progress_review_id UUID NOT NULL,
    treatment_plan_goal_id UUID NOT NULL,
    status_at_review public.goal_progress_status NOT NULL DEFAULT 'in_progress',
    current_value TEXT NULL,
    measurement_method TEXT NULL,
    clinician_assessment TEXT NOT NULL,
    progress_notes TEXT NULL,
    linked_outcome_assessment_id UUID NULL REFERENCES public.outcome_measure_assessments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT uq_prg_goals_review_goal UNIQUE (progress_review_id, treatment_plan_goal_id),
    CONSTRAINT uq_prg_goals_id_practice UNIQUE (id, practice_id),

    -- Multi-tenant Composite Foreign Keys
    CONSTRAINT fk_prg_goals_review_practice
        FOREIGN KEY (progress_review_id, practice_id)
        REFERENCES public.progress_reviews(id, practice_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_prg_goals_goal_practice
        FOREIGN KEY (treatment_plan_goal_id, practice_id)
        REFERENCES public.treatment_plan_goals(id, practice_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_prg_goals_outcome_assessment
        FOREIGN KEY (linked_outcome_assessment_id)
        REFERENCES public.outcome_measure_assessments(id)
        ON DELETE SET NULL
);

-- 5. TRIGGERS & VALIDATION FUNCTIONS
-- ------------------------------------------------------------------------------

-- set_updated_at triggers
DROP TRIGGER IF EXISTS trg_progress_reviews_updated_at ON public.progress_reviews;
CREATE TRIGGER trg_progress_reviews_updated_at
    BEFORE UPDATE ON public.progress_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_progress_review_goals_updated_at ON public.progress_review_goals;
CREATE TRIGGER trg_progress_review_goals_updated_at
    BEFORE UPDATE ON public.progress_review_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Validate reviewing clinician membership & clinical role
CREATE OR REPLACE FUNCTION public.validate_progress_review_clinician()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.practice_memberships
        WHERE practice_id = NEW.practice_id
          AND user_id = NEW.reviewing_clinician_id
          AND status = 'active'
          AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
    ) THEN
        RAISE EXCEPTION 'Invalid reviewing clinician: Must have active clinical membership in practice.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_progress_review_clinician ON public.progress_reviews;
CREATE TRIGGER trg_validate_progress_review_clinician
    BEFORE INSERT OR UPDATE OF reviewing_clinician_id, practice_id ON public.progress_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_progress_review_clinician();

-- Validate that reviewed goal belongs to the parent review's treatment plan
CREATE OR REPLACE FUNCTION public.validate_progress_review_goal_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_parent_plan_id UUID;
    v_goal_plan_id UUID;
BEGIN
    SELECT treatment_plan_id INTO v_parent_plan_id
    FROM public.progress_reviews
    WHERE id = NEW.progress_review_id AND practice_id = NEW.practice_id;

    IF v_parent_plan_id IS NULL THEN
        RAISE EXCEPTION 'Invalid progress review reference: Parent review does not exist.';
    END IF;

    SELECT treatment_plan_id INTO v_goal_plan_id
    FROM public.treatment_plan_goals
    WHERE id = NEW.treatment_plan_goal_id AND practice_id = NEW.practice_id;

    IF v_goal_plan_id IS NULL THEN
        RAISE EXCEPTION 'Invalid goal reference: Treatment plan goal does not exist in practice.';
    END IF;

    IF v_parent_plan_id <> v_goal_plan_id THEN
        RAISE EXCEPTION 'Goal mismatch: Evaluated goal does not belong to the Treatment Plan being reviewed.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_progress_review_goal_link ON public.progress_review_goals;
CREATE TRIGGER trg_validate_progress_review_goal_link
    BEFORE INSERT OR UPDATE OF treatment_plan_goal_id, progress_review_id, practice_id ON public.progress_review_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_progress_review_goal_link();

-- Immutability and State Machine Protection Trigger for Progress Reviews
CREATE OR REPLACE FUNCTION public.protect_progress_review_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Prevent altering tenant or core foreign keys
    IF OLD.practice_id <> NEW.practice_id THEN
        RAISE EXCEPTION 'Illegal operation: practice_id cannot be changed.';
    END IF;

    IF OLD.patient_id <> NEW.patient_id THEN
        RAISE EXCEPTION 'Illegal operation: patient_id cannot be changed.';
    END IF;

    IF OLD.episode_id <> NEW.episode_id THEN
        RAISE EXCEPTION 'Illegal operation: episode_id cannot be changed.';
    END IF;

    IF OLD.treatment_plan_id <> NEW.treatment_plan_id THEN
        RAISE EXCEPTION 'Illegal operation: treatment_plan_id cannot be changed.';
    END IF;

    IF OLD.review_identifier <> NEW.review_identifier THEN
        RAISE EXCEPTION 'Illegal operation: review_identifier is immutable.';
    END IF;

    -- State machine enforcement
    IF OLD.overall_status = 'finalized' THEN
        -- Only transition to 'amended' is permitted
        IF NEW.overall_status = 'draft' THEN
            RAISE EXCEPTION 'Illegal transition: Finalized progress review cannot be reverted to draft.';
        END IF;

        IF NEW.overall_status = 'finalized' THEN
            -- In-place modification of finalized review is forbidden
            IF OLD.clinical_summary <> NEW.clinical_summary OR
               OLD.overall_progress_assessment <> NEW.overall_progress_assessment OR
               OLD.plan_recommendation <> NEW.plan_recommendation OR
               OLD.reviewing_clinician_id <> NEW.reviewing_clinician_id OR
               OLD.review_date <> NEW.review_date THEN
                RAISE EXCEPTION 'Finalized progress reviews are immutable. Formal amendment required.';
            END IF;
        END IF;

        IF NEW.overall_status = 'amended' THEN
            -- Amendment requires reason and stamping
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
    ELSIF OLD.overall_status = 'amended' THEN
        -- Amended reviews cannot revert to draft or finalized
        IF NEW.overall_status <> 'amended' THEN
            RAISE EXCEPTION 'Illegal transition: Amended progress review cannot be reverted to %.', NEW.overall_status;
        END IF;
    ELSIF OLD.overall_status = 'draft' THEN
        IF NEW.overall_status = 'amended' THEN
            RAISE EXCEPTION 'Illegal transition: Draft progress review cannot jump directly to amended.';
        END IF;

        IF NEW.overall_status = 'finalized' THEN
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

DROP TRIGGER IF EXISTS trg_protect_progress_review_immutability ON public.progress_reviews;
CREATE TRIGGER trg_protect_progress_review_immutability
    BEFORE UPDATE ON public.progress_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_progress_review_immutability();

-- Goals lifecycle protection trigger (denies modification on finalized review unless amending)
CREATE OR REPLACE FUNCTION public.protect_progress_review_goals_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_review_status public.progress_review_status;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT overall_status INTO v_review_status
        FROM public.progress_reviews
        WHERE id = OLD.progress_review_id AND practice_id = OLD.practice_id;

        IF v_review_status IN ('finalized', 'amended') THEN
            RAISE EXCEPTION 'Cannot delete goal reviews from finalized or amended progress reviews.';
        END IF;

        RETURN OLD;
    ELSE
        SELECT overall_status INTO v_review_status
        FROM public.progress_reviews
        WHERE id = NEW.progress_review_id AND practice_id = NEW.practice_id;

        IF v_review_status = 'finalized' THEN
            RAISE EXCEPTION 'Cannot modify goal evaluations on finalized progress reviews. Formal review amendment required.';
        END IF;

        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_progress_review_goals_lifecycle ON public.progress_review_goals;
CREATE TRIGGER trg_protect_progress_review_goals_lifecycle
    BEFORE INSERT OR UPDATE OR DELETE ON public.progress_review_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_progress_review_goals_lifecycle();

-- Hard Delete Deny Trigger for Progress Reviews
CREATE OR REPLACE FUNCTION public.deny_progress_review_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.overall_status IN ('finalized', 'amended') THEN
        RAISE EXCEPTION 'Cannot hard delete finalized or amended progress reviews. Medical records are immutable.';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_deny_progress_review_hard_delete ON public.progress_reviews;
CREATE TRIGGER trg_deny_progress_review_hard_delete
    BEFORE DELETE ON public.progress_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.deny_progress_review_hard_delete();

-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.progress_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_review_goals ENABLE ROW LEVEL SECURITY;

-- Progress Reviews Policies
DROP POLICY IF EXISTS "progress_reviews_select_policy" ON public.progress_reviews;
CREATE POLICY "progress_reviews_select_policy"
    ON public.progress_reviews
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller'])
    );

DROP POLICY IF EXISTS "progress_reviews_insert_policy" ON public.progress_reviews;
CREATE POLICY "progress_reviews_insert_policy"
    ON public.progress_reviews
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

DROP POLICY IF EXISTS "progress_reviews_update_policy" ON public.progress_reviews;
CREATE POLICY "progress_reviews_update_policy"
    ON public.progress_reviews
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

DROP POLICY IF EXISTS "progress_reviews_delete_policy" ON public.progress_reviews;
CREATE POLICY "progress_reviews_delete_policy"
    ON public.progress_reviews
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND overall_status = 'draft'
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

-- Progress Review Goals Policies
DROP POLICY IF EXISTS "prg_goals_select_policy" ON public.progress_review_goals;
CREATE POLICY "prg_goals_select_policy"
    ON public.progress_review_goals
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'biller'])
    );

DROP POLICY IF EXISTS "prg_goals_insert_policy" ON public.progress_review_goals;
CREATE POLICY "prg_goals_insert_policy"
    ON public.progress_review_goals
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

DROP POLICY IF EXISTS "prg_goals_update_policy" ON public.progress_review_goals;
CREATE POLICY "prg_goals_update_policy"
    ON public.progress_review_goals
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

DROP POLICY IF EXISTS "prg_goals_delete_policy" ON public.progress_review_goals;
CREATE POLICY "prg_goals_delete_policy"
    ON public.progress_review_goals
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'physiotherapist'])
    );

-- 7. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_progress_reviews_practice_id ON public.progress_reviews(practice_id);
CREATE INDEX IF NOT EXISTS idx_progress_reviews_patient_id ON public.progress_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_progress_reviews_episode_id ON public.progress_reviews(episode_id);
CREATE INDEX IF NOT EXISTS idx_progress_reviews_treatment_plan_id ON public.progress_reviews(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_progress_reviews_visit_id ON public.progress_reviews(originating_clinical_visit_id);
CREATE INDEX IF NOT EXISTS idx_progress_reviews_clinician_id ON public.progress_reviews(reviewing_clinician_id);
CREATE INDEX IF NOT EXISTS idx_progress_reviews_status ON public.progress_reviews(overall_status);
CREATE INDEX IF NOT EXISTS idx_progress_reviews_review_date ON public.progress_reviews(review_date);
CREATE INDEX IF NOT EXISTS idx_progress_reviews_next_due ON public.progress_reviews(next_review_due_date);

CREATE INDEX IF NOT EXISTS idx_prg_goals_review_id ON public.progress_review_goals(progress_review_id);
CREATE INDEX IF NOT EXISTS idx_prg_goals_goal_id ON public.progress_review_goals(treatment_plan_goal_id);
CREATE INDEX IF NOT EXISTS idx_prg_goals_practice_id ON public.progress_review_goals(practice_id);
CREATE INDEX IF NOT EXISTS idx_prg_goals_outcome_assessment_id ON public.progress_review_goals(linked_outcome_assessment_id);
