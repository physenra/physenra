const fs = require('fs');
const path = require('path');
const { SYSTEM_EXERCISES_CATALOGUE } = require('../src/services/hepCatalogueData.ts');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20261018180000_canonical_system_exercises_and_atomic_hep.sql'
);

function sqlEscape(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'` + str.replace(/'/g, "''") + `'`;
}

const exerciseRows = SYSTEM_EXERCISES_CATALOGUE.map((ex) => {
  return `(
  ${sqlEscape(ex.id)}::uuid,
  NULL,
  true,
  ${sqlEscape(ex.name)},
  ${sqlEscape(ex.category)}::public.exercise_category,
  ${sqlEscape(ex.body_region)}::public.exercise_body_region,
  ${sqlEscape(ex.default_laterality)}::public.exercise_laterality,
  ${sqlEscape(ex.equipment)},
  ${sqlEscape(ex.description)},
  ${sqlEscape(ex.instructions)},
  ${sqlEscape(ex.precautions)},
  true
)`;
});

const sqlContent = `-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: CANONICAL SYSTEM EXERCISES & ATOMIC HEP RPC
-- Timestamp: 20261018180000_canonical_system_exercises_and_atomic_hep.sql
--
-- Domains:
-- 1. Canonical Evidence-Based System Exercises (public.exercises)
--    - Ensures all 59 standardized system exercises are seeded with stable canonical UUIDs
--    - Idempotent upsert matching on lower(trim(name)) and primary key id
-- 2. Atomic Home Exercise Program Creation RPC (public.create_home_exercise_program_atomic)
--    - Encapsulates program header and prescribed items in a single atomic transaction
--    - Eliminates foreign key race conditions and orphan draft programs
--    - Tenant-isolated and protected by clinician role validation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CANONICAL SYSTEM EXERCISES SEEDING (ALL 59 EXERCISES)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  -- Insert or update each canonical system exercise safely
  FOR v_rec IN (
    SELECT * FROM (
      VALUES
${exerciseRows.join(',\n')}
    ) AS t(id, practice_id, is_system, name, category, body_region, default_laterality, equipment, description, instructions, precautions, is_active)
  ) LOOP
    -- If row exists with this exact canonical ID, update definition
    IF EXISTS (SELECT 1 FROM public.exercises WHERE id = v_rec.id) THEN
      UPDATE public.exercises
      SET
        name = v_rec.name,
        category = v_rec.category,
        body_region = v_rec.body_region,
        default_laterality = v_rec.default_laterality,
        equipment = v_rec.equipment,
        description = v_rec.description,
        instructions = v_rec.instructions,
        precautions = v_rec.precautions,
        is_active = v_rec.is_active,
        updated_at = now()
      WHERE id = v_rec.id;
    -- Else if row exists with same system name under a different UUID, retain or align safely
    ELSIF EXISTS (SELECT 1 FROM public.exercises WHERE practice_id IS NULL AND lower(trim(name)) = lower(trim(v_rec.name))) THEN
      UPDATE public.exercises
      SET
        category = v_rec.category,
        body_region = v_rec.body_region,
        default_laterality = v_rec.default_laterality,
        equipment = v_rec.equipment,
        description = v_rec.description,
        instructions = v_rec.instructions,
        precautions = v_rec.precautions,
        is_active = v_rec.is_active,
        updated_at = now()
      WHERE practice_id IS NULL AND lower(trim(name)) = lower(trim(v_rec.name));
    ELSE
      -- Insert canonical exercise
      INSERT INTO public.exercises (
        id,
        practice_id,
        is_system,
        name,
        category,
        body_region,
        default_laterality,
        equipment,
        description,
        instructions,
        precautions,
        is_active
      ) VALUES (
        v_rec.id,
        NULL,
        true,
        v_rec.name,
        v_rec.category,
        v_rec.body_region,
        v_rec.default_laterality,
        v_rec.equipment,
        v_rec.description,
        v_rec.instructions,
        v_rec.precautions,
        v_rec.is_active
      );
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ATOMIC HOME EXERCISE PROGRAM CREATION RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_home_exercise_program_atomic(
  p_program jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_practice_id uuid;
  v_patient_id uuid;
  v_episode_id uuid;
  v_clinical_visit_id uuid;
  v_prescribing_clinician_id uuid;
  v_title text;
  v_instructions text;
  v_start_date date;
  v_review_date date;
  v_status public.hep_status;
  v_program_identifier text;
  v_program_id uuid;
  v_item jsonb;
  v_item_idx integer;
  v_raw_exercise_id uuid;
  v_resolved_exercise_id uuid;
  v_current_practice uuid;
  v_result jsonb;
BEGIN
  v_practice_id := (p_program->>'practice_id')::uuid;
  v_current_practice := public.current_practice_id();

  IF v_current_practice IS NOT NULL AND v_current_practice <> v_practice_id THEN
    RAISE EXCEPTION 'Access denied: Tenant practice mismatch.';
  END IF;

  -- Verify active clinician membership
  IF NOT EXISTS (
    SELECT 1 FROM public.practice_memberships
    WHERE practice_id = v_practice_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('practice_owner', 'practice_manager', 'physiotherapist')
  ) THEN
    RAISE EXCEPTION 'Access denied: Insufficient privileges to create Home Exercise Program.';
  END IF;

  v_patient_id := (p_program->>'patient_id')::uuid;
  v_episode_id := NULLIF(p_program->>'episode_id', '')::uuid;
  v_clinical_visit_id := NULLIF(p_program->>'clinical_visit_id', '')::uuid;
  v_prescribing_clinician_id := (p_program->>'prescribing_clinician_id')::uuid;
  v_title := trim(COALESCE(p_program->>'title', ''));
  v_instructions := NULLIF(trim(p_program->>'instructions'), '');
  v_start_date := COALESCE(NULLIF(p_program->>'start_date', '')::date, CURRENT_DATE);
  v_review_date := NULLIF(p_program->>'review_date', '')::date;
  v_status := COALESCE((p_program->>'status')::public.hep_status, 'draft'::public.hep_status);

  IF v_title = '' THEN
    RAISE EXCEPTION 'Program title is required.';
  END IF;

  -- Generate atomic sequential identifier
  v_program_identifier := public.generate_next_hep_identifier(v_practice_id);

  -- Insert program header
  INSERT INTO public.home_exercise_programs (
    practice_id,
    patient_id,
    episode_id,
    clinical_visit_id,
    prescribing_clinician_id,
    program_identifier,
    title,
    instructions,
    start_date,
    review_date,
    status
  ) VALUES (
    v_practice_id,
    v_patient_id,
    v_episode_id,
    v_clinical_visit_id,
    v_prescribing_clinician_id,
    v_program_identifier,
    v_title,
    v_instructions,
    v_start_date,
    v_review_date,
    v_status
  )
  RETURNING id INTO v_program_id;

  -- Insert prescribed items with canonical resolution
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    v_item_idx := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_item_idx := v_item_idx + 1;
      v_raw_exercise_id := (v_item->>'exercise_id')::uuid;

      -- 1. Check if exercise exists by exact UUID
      SELECT id INTO v_resolved_exercise_id
      FROM public.exercises
      WHERE id = v_raw_exercise_id;

      -- 2. If not found by UUID, resolve by exercise name
      IF v_resolved_exercise_id IS NULL AND v_item->>'exercise_name' IS NOT NULL THEN
        SELECT id INTO v_resolved_exercise_id
        FROM public.exercises
        WHERE is_system = true
          AND (
            lower(trim(name)) = lower(trim(v_item->>'exercise_name'))
            OR lower(name) LIKE '%' || lower(trim(split_part(v_item->>'exercise_name', '(', 1))) || '%'
          )
        ORDER BY is_system DESC
        LIMIT 1;
      END IF;

      -- 3. If still not found, fail transaction atomically
      IF v_resolved_exercise_id IS NULL THEN
        RAISE EXCEPTION 'Prescribed exercise with ID % could not be resolved in the exercises library.', v_raw_exercise_id;
      END IF;

      INSERT INTO public.home_exercise_program_items (
        practice_id,
        program_id,
        exercise_id,
        order_index,
        sets,
        repetitions,
        hold_seconds,
        duration_minutes,
        rest_seconds,
        frequency,
        intensity_load,
        laterality,
        instructions,
        precautions,
        notes
      ) VALUES (
        v_practice_id,
        v_program_id,
        v_resolved_exercise_id,
        COALESCE((v_item->>'order_index')::integer, v_item_idx),
        NULLIF(v_item->>'sets', '')::integer,
        NULLIF(v_item->>'repetitions', '')::integer,
        NULLIF(v_item->>'hold_seconds', '')::integer,
        NULLIF(v_item->>'duration_minutes', '')::integer,
        NULLIF(v_item->>'rest_seconds', '')::integer,
        NULLIF(trim(v_item->>'frequency'), ''),
        NULLIF(trim(v_item->>'intensity_load'), ''),
        COALESCE((v_item->>'laterality')::public.exercise_laterality, 'na'::public.exercise_laterality),
        NULLIF(trim(v_item->>'instructions'), ''),
        NULLIF(trim(v_item->>'precautions'), ''),
        NULLIF(trim(v_item->>'notes'), '')
      );
    END LOOP;
  END IF;

  -- Log audit event
  PERFORM public.log_audit_event(
    p_action := 'hep.created',
    p_entity_type := 'home_exercise_program',
    p_entity_id := v_program_id,
    p_metadata := jsonb_build_object(
      'program_identifier', v_program_identifier,
      'patient_id', v_patient_id,
      'episode_id', v_episode_id,
      'prescribing_clinician_id', v_prescribing_clinician_id,
      'status', v_status,
      'item_count', COALESCE(jsonb_array_length(p_items), 0)
    ),
    p_source := 'create_home_exercise_program_atomic'
  );

  SELECT to_jsonb(p) INTO v_result
  FROM public.home_exercise_programs p
  WHERE p.id = v_program_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_home_exercise_program_atomic(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_home_exercise_program_atomic(jsonb, jsonb) TO authenticated;
`;

fs.writeFileSync(migrationPath, sqlContent, 'utf8');
console.log('Successfully generated migration file: ' + migrationPath);
