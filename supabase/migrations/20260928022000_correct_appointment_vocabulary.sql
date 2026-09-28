-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: CORRECT APPOINTMENT VOCABULARY
-- Timestamp: 20260928022000_correct_appointment_vocabulary.sql
--
-- Forward-only migration to align appointment_type and location_mode
-- CHECK constraints and defaults to the canonical specification:
--
-- 1. Canonical Appointment Types:
--    - initial_consultation (mapped from initial_assessment / consultation)
--    - follow_up
--    - reassessment (mapped from review)
--    - home_visit (promoted to appointment type)
--    - other
--
-- 2. Canonical Location / Modes:
--    - clinic (mapped from in_clinic)
--    - home (mapped from home_visit)
--    - telehealth (mapped from online)
--    - other
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DATA MIGRATION: SAFELY MAP EXISTING ROWS (IF ANY)
-- ------------------------------------------------------------------------------
UPDATE public.appointments
SET appointment_type = 'initial_consultation'
WHERE appointment_type IN ('initial_assessment', 'consultation');

UPDATE public.appointments
SET appointment_type = 'reassessment'
WHERE appointment_type = 'review';

UPDATE public.appointments
SET location_mode = 'clinic'
WHERE location_mode = 'in_clinic';

UPDATE public.appointments
SET location_mode = 'home'
WHERE location_mode = 'home_visit';

UPDATE public.appointments
SET location_mode = 'telehealth'
WHERE location_mode = 'online';

-- ------------------------------------------------------------------------------
-- 2. DROP OBSOLETE CHECK CONSTRAINTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_appointment_type_check,
  DROP CONSTRAINT IF EXISTS chk_appointments_type,
  DROP CONSTRAINT IF EXISTS chk_appointments_appointment_type,
  DROP CONSTRAINT IF EXISTS appointments_location_mode_check,
  DROP CONSTRAINT IF EXISTS chk_appointments_location_mode;

-- ------------------------------------------------------------------------------
-- 3. UPDATE DEFAULT ON location_mode
-- ------------------------------------------------------------------------------
ALTER TABLE public.appointments
  ALTER COLUMN location_mode SET DEFAULT 'clinic';

-- ------------------------------------------------------------------------------
-- 4. APPLY CANONICAL CHECK CONSTRAINTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD CONSTRAINT chk_appointments_appointment_type CHECK (
    appointment_type IN (
      'initial_consultation',
      'follow_up',
      'reassessment',
      'home_visit',
      'other'
    )
  ),
  ADD CONSTRAINT chk_appointments_location_mode CHECK (
    location_mode IN (
      'clinic',
      'home',
      'telehealth',
      'other'
    )
  );
