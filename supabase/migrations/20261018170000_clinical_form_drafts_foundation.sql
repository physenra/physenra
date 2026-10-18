-- ==============================================================================
-- PHYSENRA CLINICAL — AUTHORIZED SERVER-SIDE CLINICAL FORM DRAFT FOUNDATION
-- Migration: 20261018170000_clinical_form_drafts_foundation.sql
--
-- Governs:
-- 1. Server-side persistence of in-progress clinical form drafts (HEP, SOAP notes,
--    treatment plans, outcome assessments, discharge summaries, progress reviews).
-- 2. Strict multi-tenant and user scoping: practice_id + user_id + form_id.
-- 3. Elimination of patient health information (PHI) from browser localStorage.
-- 4. Automatic draft TTL expiration (default 24 hours).
-- 5. Strict Row-Level Security (RLS) preventing cross-tenant or cross-user access.
-- 6. Draft safety invariant: Drafts can NEVER be auto-finalized, auto-signed, or
--    auto-activated; final submission requires explicit user action.
-- ==============================================================================

-- 1. CLINICAL FORM DRAFTS TABLE
CREATE TABLE IF NOT EXISTS public.clinical_form_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    form_id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_clinical_form_draft UNIQUE (practice_id, user_id, form_id)
);

-- Index for high-performance scoped lookups and TTL pruning
CREATE INDEX IF NOT EXISTS idx_clinical_form_drafts_lookup
    ON public.clinical_form_drafts (practice_id, user_id, form_id);

CREATE INDEX IF NOT EXISTS idx_clinical_form_drafts_expiry
    ON public.clinical_form_drafts (expires_at);

-- 2. ENABLE ROW-LEVEL SECURITY
ALTER TABLE public.clinical_form_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Select draft (User can only read own draft in active practice)
CREATE POLICY "clinical_form_drafts_select"
    ON public.clinical_form_drafts
    FOR SELECT
    USING (
        practice_id = public.current_practice_id()
        AND user_id = auth.uid()
        AND expires_at > now()
    );

-- Policy: Insert draft (User can only insert draft in active practice)
CREATE POLICY "clinical_form_drafts_insert"
    ON public.clinical_form_drafts
    FOR INSERT
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND user_id = auth.uid()
    );

-- Policy: Update draft (User can only update own draft in active practice)
CREATE POLICY "clinical_form_drafts_update"
    ON public.clinical_form_drafts
    FOR UPDATE
    USING (
        practice_id = public.current_practice_id()
        AND user_id = auth.uid()
    )
    WITH CHECK (
        practice_id = public.current_practice_id()
        AND user_id = auth.uid()
    );

-- Policy: Delete draft (User can only delete own draft in active practice)
CREATE POLICY "clinical_form_drafts_delete"
    ON public.clinical_form_drafts
    FOR DELETE
    USING (
        practice_id = public.current_practice_id()
        AND user_id = auth.uid()
    );

-- 3. TTL CLEANUP FUNCTION
CREATE OR REPLACE FUNCTION public.prune_expired_clinical_form_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.clinical_form_drafts
    WHERE expires_at <= now();
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;
