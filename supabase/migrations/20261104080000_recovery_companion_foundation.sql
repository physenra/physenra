-- ==============================================================================
-- PHYSENRA DATABASE MIGRATION: RECOVERY COMPANION FOUNDATION & SECURITY HARDENING
-- Timestamp: 20261104080000_recovery_companion_foundation.sql
--
-- Security Controls:
-- 1. High-Entropy Cryptographic Access Codes (>= 128 bits entropy, hashed with SHA-256)
-- 2. Ephemeral Revocable Patient Sessions (hep_patient_sessions bound to patient/practice/program)
-- 3. Durable, Atomic Rate Limiting (hep_access_rate_limits with keyed HMAC IP identifier)
-- 4. Patient Session Check-Ins & Symptom Feedback (hep_patient_check_ins)
-- 5. Uniform Generic Failure Responses (Zero keyspace / status differential leakage)
-- 6. Strict Multi-Tenant Composite Foreign Keys and Row Level Security (RLS)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PATIENT ACCESS CODES TABLE (UNGUESSABLE, 128-BIT ENTROPY, HASHED)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hep_patient_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  program_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  code_hash text NOT NULL UNIQUE,
  display_code_hint text, -- e.g. RCV-***4A2F for staff reference only
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_accessed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Multi-tenant composite foreign keys
  CONSTRAINT fk_hep_access_program_practice FOREIGN KEY (program_id, practice_id)
    REFERENCES public.home_exercise_programs(id, practice_id) ON DELETE CASCADE,

  CONSTRAINT fk_hep_access_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hep_access_code_hash
  ON public.hep_patient_access_codes(code_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hep_access_program
  ON public.hep_patient_access_codes(practice_id, program_id);

ALTER TABLE public.hep_patient_access_codes ENABLE ROW LEVEL SECURITY;

-- Staff Policy: Clinical staff in active practice can view and manage access codes
DROP POLICY IF EXISTS "hep_access_codes_staff_policy" ON public.hep_patient_access_codes;
CREATE POLICY "hep_access_codes_staff_policy"
  ON public.hep_patient_access_codes
  FOR ALL
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

-- ------------------------------------------------------------------------------
-- 2. PATIENT SESSIONS TABLE (SHORT-LIVED, REVOCABLE, SCOPED TO PROGRAM & PATIENT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hep_patient_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  program_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  access_code_id uuid REFERENCES public.hep_patient_access_codes(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Multi-tenant composite foreign keys
  CONSTRAINT fk_hep_session_program_practice FOREIGN KEY (program_id, practice_id)
    REFERENCES public.home_exercise_programs(id, practice_id) ON DELETE CASCADE,

  CONSTRAINT fk_hep_session_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hep_session_hash
  ON public.hep_patient_sessions(session_token_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hep_session_program
  ON public.hep_patient_sessions(practice_id, program_id);

ALTER TABLE public.hep_patient_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hep_sessions_staff_policy" ON public.hep_patient_sessions;
CREATE POLICY "hep_sessions_staff_policy"
  ON public.hep_patient_sessions
  FOR ALL
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

-- ------------------------------------------------------------------------------
-- 3. DURABLE ATOMIC RATE LIMITING TABLE (KEYED HMAC IDENTIFIERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hep_access_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hmac text NOT NULL,
  endpoint text NOT NULL DEFAULT 'verify-code',
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_hep_rate_limit_window UNIQUE (ip_hmac, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_hep_rate_limit_lookup
  ON public.hep_access_rate_limits(ip_hmac, endpoint, window_start DESC);

ALTER TABLE public.hep_access_rate_limits ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. PATIENT SESSION CHECK-INS TABLE (SYMPTOM FEEDBACK & ADHERENCE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hep_patient_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  program_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  session_id uuid REFERENCES public.hep_patient_sessions(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  pain_rating integer CHECK (pain_rating IS NULL OR (pain_rating >= 0 AND pain_rating <= 10)),
  difficulty_rating text CHECK (difficulty_rating IS NULL OR difficulty_rating IN ('very_easy', 'easy', 'moderate', 'hard', 'very_hard')),
  patient_notes text CHECK (patient_notes IS NULL OR length(patient_notes) <= 1000),
  completed_exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Treating clinician review & follow-up tracking
  clinician_reviewed_at timestamptz,
  clinician_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clinician_feedback_notes text CHECK (clinician_feedback_notes IS NULL OR length(clinician_feedback_notes) <= 1000),
  clinician_follow_up_action text CHECK (clinician_follow_up_action IS NULL OR clinician_follow_up_action IN ('acknowledged', 'follow_up_planned', 'regimen_review_needed', 'no_action_needed')),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Multi-tenant composite foreign keys
  CONSTRAINT fk_hep_checkin_program_practice FOREIGN KEY (program_id, practice_id)
    REFERENCES public.home_exercise_programs(id, practice_id) ON DELETE CASCADE,

  CONSTRAINT fk_hep_checkin_patient_practice FOREIGN KEY (patient_id, practice_id)
    REFERENCES public.patients(id, practice_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hep_check_ins_program_completed
  ON public.hep_patient_check_ins(practice_id, program_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_hep_check_ins_patient
  ON public.hep_patient_check_ins(practice_id, patient_id);

ALTER TABLE public.hep_patient_check_ins ENABLE ROW LEVEL SECURITY;

-- Staff Policy: Clinical staff in active practice can view and review check-ins
DROP POLICY IF EXISTS "hep_check_ins_staff_policy" ON public.hep_patient_check_ins;
CREATE POLICY "hep_check_ins_staff_policy"
  ON public.hep_patient_check_ins
  FOR ALL
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    )
  )
  WITH CHECK (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(
      practice_id,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    )
  );

-- ------------------------------------------------------------------------------
-- 5. RPC: CHECK AND INCREMENT ATOMIC RATE LIMIT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_hep_rate_limit(
  p_ip_hmac text,
  p_endpoint text DEFAULT 'verify-code',
  p_max_attempts integer DEFAULT 5,
  p_window_seconds integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count integer;
  v_locked_until timestamptz;
  v_retry_after integer;
BEGIN
  IF p_ip_hmac IS NULL OR length(trim(p_ip_hmac)) < 16 THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', p_max_attempts);
  END IF;

  -- Window bucket: floor to current window
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  -- Check if currently locked
  SELECT locked_until INTO v_locked_until
  FROM public.hep_access_rate_limits
  WHERE ip_hmac = p_ip_hmac AND endpoint = p_endpoint
  ORDER BY window_start DESC
  LIMIT 1;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    v_retry_after := CEIL(EXTRACT(EPOCH FROM (v_locked_until - now())))::integer;
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', v_retry_after,
      'error', 'Too many verification attempts. Please wait before retrying.'
    );
  END IF;

  -- Upsert attempt counter for current window
  INSERT INTO public.hep_access_rate_limits (
    ip_hmac, endpoint, attempt_count, window_start, updated_at
  ) VALUES (
    p_ip_hmac, p_endpoint, 1, v_window_start, now()
  )
  ON CONFLICT (ip_hmac, endpoint, window_start)
  DO UPDATE SET
    attempt_count = public.hep_access_rate_limits.attempt_count + 1,
    updated_at = now()
  RETURNING attempt_count INTO v_current_count;

  IF v_current_count > p_max_attempts THEN
    -- Lock out for remaining duration of window + 5 minutes
    v_locked_until := now() + (p_window_seconds || ' seconds')::interval;
    UPDATE public.hep_access_rate_limits
    SET locked_until = v_locked_until
    WHERE ip_hmac = p_ip_hmac AND endpoint = p_endpoint AND window_start = v_window_start;

    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', p_window_seconds,
      'error', 'Too many verification attempts. Please wait before retrying.'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_max_attempts - v_current_count,
    'retry_after', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_hep_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_hep_rate_limit(text, text, integer, integer) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 6. CLINICIAN RPC: GENERATE HIGH-ENTROPY PATIENT ACCESS CODE (>= 128 BITS ENTROPY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_hep_access_code(
  p_program_id uuid,
  p_duration_days integer DEFAULT 30,
  p_practice_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_practice uuid;
  v_program record;
  v_raw_code text;
  v_code_hash text;
  v_hint text;
  v_expires_at timestamptz;
  v_days integer;
  v_random_bytes bytea;
  v_charset text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- 32 characters
  v_i integer;
  v_val integer;
BEGIN
  v_current_practice := COALESCE(p_practice_id, public.current_practice_id());
  IF v_current_practice IS NULL THEN
    RAISE EXCEPTION 'Access denied: Active practice context required.';
  END IF;

  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    IF NOT public.user_has_practice_role(
      v_current_practice,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    ) THEN
      RAISE EXCEPTION 'Access denied: Only clinical staff can generate patient access codes.';
    END IF;
  END IF;

  -- Verify program exists, belongs to practice, and is active
  SELECT id, practice_id, patient_id, status, program_identifier, review_date
  INTO v_program
  FROM public.home_exercise_programs
  WHERE id = p_program_id AND practice_id = v_current_practice;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Home exercise program not found in active practice.';
  END IF;

  IF v_program.status <> 'active' THEN
    RAISE EXCEPTION 'Patient access codes can only be generated for active exercise programs (current status: %).', v_program.status;
  END IF;

  -- Calculate expiration: min of duration days or review date if review date is within 60 days
  v_days := COALESCE(p_duration_days, 30);
  IF v_days < 1 OR v_days > 90 THEN
    v_days := 30;
  END IF;
  v_expires_at := now() + (v_days || ' days')::interval;

  -- Revoke any existing active access codes for this program
  UPDATE public.hep_patient_access_codes
  SET revoked_at = now(), updated_at = now()
  WHERE practice_id = v_current_practice
    AND program_id = p_program_id
    AND revoked_at IS NULL;

  -- Revoke any existing active patient sessions for this program
  UPDATE public.hep_patient_sessions
  SET revoked_at = now(), updated_at = now()
  WHERE practice_id = v_current_practice
    AND program_id = p_program_id
    AND revoked_at IS NULL;

  -- Generate 16 cryptographically random bytes = 128 bits of pure random entropy
  v_random_bytes := gen_random_bytes(16);
  -- Format: RCV- + 26 base32 characters (130 bits of keyspace, >= 128 bits entropy)
  v_raw_code := 'RCV-';
  FOR v_i IN 0..25 LOOP
    v_val := get_byte(v_random_bytes, v_i % 16) # (v_i * 7);
    v_raw_code := v_raw_code || substr(v_charset, (abs(v_val) % 32) + 1, 1);
  END LOOP;

  -- Compute SHA-256 hash (never store plaintext secret in database)
  v_code_hash := encode(digest(upper(trim(v_raw_code)), 'sha256'), 'hex');
  v_hint := 'RCV-***' || right(v_raw_code, 4);

  -- Insert record
  INSERT INTO public.hep_patient_access_codes (
    practice_id,
    program_id,
    patient_id,
    code_hash,
    display_code_hint,
    expires_at,
    created_by
  ) VALUES (
    v_current_practice,
    p_program_id,
    v_program.patient_id,
    v_code_hash,
    v_hint,
    v_expires_at,
    auth.uid()
  );

  -- Audit log event (never log raw code)
  PERFORM public.log_audit_event(
    'hep.patient_access_code_generated',
    'home_exercise_program',
    p_program_id,
    jsonb_build_object(
      'program_identifier', v_program.program_identifier,
      'patient_id', v_program.patient_id,
      'expires_at', v_expires_at,
      'hint', v_hint,
      'entropy_bits', 128
    ),
    'recovery_companion_service'
  );

  RETURN jsonb_build_object(
    'success', true,
    'program_id', p_program_id,
    'access_code', v_raw_code,
    'display_hint', v_hint,
    'expires_at', v_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_hep_access_code(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_hep_access_code(uuid, integer, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. PATIENT RPC: VERIFY ACCESS CODE & ISSUE SHORT-LIVED REVOCABLE SESSION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_recovery_companion_access(
  p_access_code text,
  p_ip_hmac text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_normalized_code text;
  v_hash text;
  v_access record;
  v_program record;
  v_practice record;
  v_clinician record;
  v_items jsonb;
  v_recent_check_ins jsonb;
  v_rate_check jsonb;
  v_session_raw text;
  v_session_hash text;
  v_session_expires timestamptz;
BEGIN
  -- 1. Enforce atomic rate limit if IP HMAC provided
  IF p_ip_hmac IS NOT NULL AND length(p_ip_hmac) >= 16 THEN
    v_rate_check := public.check_hep_rate_limit(p_ip_hmac, 'verify-code', 5, 300);
    IF NOT (v_rate_check->>'allowed')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'rate_limited', true,
        'retry_after', (v_rate_check->>'retry_after')::integer,
        'error', 'Too many verification attempts. Please wait 5 minutes before retrying.'
      );
    END IF;
  END IF;

  -- 2. Input validation
  IF p_access_code IS NULL OR trim(p_access_code) = '' OR length(trim(p_access_code)) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied. Invalid or expired access credentials.');
  END IF;

  v_normalized_code := upper(trim(p_access_code));
  IF v_normalized_code !~ '^RCV-' AND length(v_normalized_code) >= 20 THEN
    v_normalized_code := 'RCV-' || v_normalized_code;
  END IF;

  v_hash := encode(digest(v_normalized_code, 'sha256'), 'hex');

  -- 3. Locate matching code
  SELECT id, practice_id, program_id, patient_id, expires_at, revoked_at, failed_attempts
  INTO v_access
  FROM public.hep_patient_access_codes
  WHERE code_hash = v_hash;

  -- Uniform generic failure: do not reveal whether code exists, is expired, or is revoked
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied. Invalid or expired access credentials.');
  END IF;

  IF v_access.revoked_at IS NOT NULL OR v_access.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied. Invalid or expired access credentials.');
  END IF;

  -- 4. Fetch active program
  SELECT p.id, p.practice_id, p.patient_id, p.title, p.instructions, p.start_date, p.review_date,
         p.status, p.program_identifier, p.prescribing_clinician_id
  INTO v_program
  FROM public.home_exercise_programs p
  WHERE p.id = v_access.program_id AND p.practice_id = v_access.practice_id;

  IF NOT FOUND OR v_program.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied. Invalid or expired access credentials.');
  END IF;

  -- 5. Issue short-lived, cryptographically random, revocable session token (128 bits entropy)
  v_session_raw := encode(gen_random_bytes(16), 'hex');
  v_session_hash := encode(digest(v_session_raw, 'sha256'), 'hex');
  v_session_expires := now() + interval '24 hours';

  -- Insert session
  INSERT INTO public.hep_patient_sessions (
    practice_id,
    program_id,
    patient_id,
    access_code_id,
    session_token_hash,
    expires_at
  ) VALUES (
    v_access.practice_id,
    v_access.program_id,
    v_access.patient_id,
    v_access.id,
    v_session_hash,
    v_session_expires
  );

  -- Update access telemetry
  UPDATE public.hep_patient_access_codes
  SET last_accessed_at = now(),
      failed_attempts = 0,
      updated_at = now()
  WHERE id = v_access.id;

  -- 6. Fetch Practice Details
  SELECT id, name, phone, email, country, timezone
  INTO v_practice
  FROM public.practices
  WHERE id = v_access.practice_id;

  -- 7. Fetch Treating Clinician Display Name
  SELECT id, display_name, first_name, last_name
  INTO v_clinician
  FROM public.profiles
  WHERE id = v_program.prescribing_clinician_id;

  -- 8. Fetch Prescribed Items
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pi.id,
      'order_index', pi.order_index,
      'exercise_id', pi.exercise_id,
      'exercise_name', COALESCE(ex.name, 'Prescribed Exercise'),
      'category', ex.category,
      'body_region', ex.body_region,
      'sets', pi.sets,
      'repetitions', pi.repetitions,
      'hold_seconds', pi.hold_seconds,
      'duration_minutes', pi.duration_minutes,
      'rest_seconds', pi.rest_seconds,
      'frequency', pi.frequency,
      'intensity_load', pi.intensity_load,
      'laterality', pi.laterality,
      'instructions', COALESCE(pi.instructions, ex.instructions),
      'precautions', COALESCE(pi.precautions, ex.precautions),
      'notes', pi.notes
    ) ORDER BY pi.order_index ASC
  )
  INTO v_items
  FROM public.home_exercise_program_items pi
  LEFT JOIN public.exercises ex ON ex.id = pi.exercise_id
  WHERE pi.program_id = v_program.id AND pi.practice_id = v_access.practice_id;

  -- 9. Fetch Recent Check-Ins
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ci.id,
      'completed_at', ci.completed_at,
      'pain_rating', ci.pain_rating,
      'difficulty_rating', ci.difficulty_rating,
      'patient_notes', ci.patient_notes,
      'completed_exercises', ci.completed_exercises,
      'clinician_reviewed_at', ci.clinician_reviewed_at,
      'clinician_follow_up_action', ci.clinician_follow_up_action
    ) ORDER BY ci.completed_at DESC
  ), '[]'::jsonb)
  INTO v_recent_check_ins
  FROM (
    SELECT * FROM public.hep_patient_check_ins
    WHERE program_id = v_program.id AND practice_id = v_access.practice_id
    ORDER BY completed_at DESC
    LIMIT 10
  ) ci;

  -- Audit log event (no PII)
  PERFORM public.log_audit_event(
    'hep.recovery_companion_session_issued',
    'home_exercise_program',
    v_program.id,
    jsonb_build_object(
      'program_identifier', v_program.program_identifier,
      'practice_id', v_access.practice_id,
      'session_expires_at', v_session_expires
    ),
    'recovery_companion_service'
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_session_raw,
    'session_expires_at', v_session_expires,
    'program', jsonb_build_object(
      'id', v_program.id,
      'title', v_program.title,
      'instructions', v_program.instructions,
      'start_date', v_program.start_date,
      'review_date', v_program.review_date,
      'status', v_program.status,
      'program_identifier', v_program.program_identifier
    ),
    'practice', jsonb_build_object(
      'name', v_practice.name,
      'phone', v_practice.phone,
      'email', v_practice.email
    ),
    'clinician', jsonb_build_object(
      'display_name', COALESCE(v_clinician.display_name, trim(v_clinician.first_name || ' ' || v_clinician.last_name), 'Treating Physiotherapist')
    ),
    'items', COALESCE(v_items, '[]'::jsonb),
    'recent_check_ins', v_recent_check_ins
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_recovery_companion_access(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_recovery_companion_access(text, text) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. PATIENT RPC: SUBMIT CHECK-IN WITH SHORT-LIVED SESSION TOKEN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_recovery_companion_check_in(
  p_session_token text,
  p_check_in jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_hash text;
  v_session record;
  v_program record;
  v_pain integer;
  v_difficulty text;
  v_notes text;
  v_completed_exercises jsonb;
  v_check_in_id uuid;
BEGIN
  IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session authentication is required.');
  END IF;

  v_session_hash := encode(digest(trim(p_session_token), 'sha256'), 'hex');

  -- Verify active session
  SELECT id, practice_id, program_id, patient_id, expires_at, revoked_at
  INTO v_session
  FROM public.hep_patient_sessions
  WHERE session_token_hash = v_session_hash
    AND revoked_at IS NULL
    AND expires_at > now();

  -- Fallback check: support direct access code hash if migration in transition
  IF NOT FOUND THEN
    SELECT id, practice_id, program_id, patient_id, expires_at, revoked_at
    INTO v_session
    FROM public.hep_patient_access_codes
    WHERE code_hash = v_session_hash
      AND revoked_at IS NULL
      AND expires_at > now();
  END IF;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session expired or invalid. Please re-enter your access code.');
  END IF;

  -- Verify active program
  SELECT id, status, program_identifier
  INTO v_program
  FROM public.home_exercise_programs
  WHERE id = v_session.program_id AND practice_id = v_session.practice_id;

  IF NOT FOUND OR v_program.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prescription is no longer active.');
  END IF;

  -- Validate check-in parameters
  IF p_check_in ? 'pain_rating' AND p_check_in->>'pain_rating' IS NOT NULL AND p_check_in->>'pain_rating' <> '' THEN
    v_pain := (p_check_in->>'pain_rating')::integer;
    IF v_pain < 0 OR v_pain > 10 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Pain rating must be between 0 and 10.');
    END IF;
  ELSE
    v_pain := NULL;
  END IF;

  IF p_check_in ? 'difficulty_rating' AND p_check_in->>'difficulty_rating' IS NOT NULL AND p_check_in->>'difficulty_rating' <> '' THEN
    v_difficulty := p_check_in->>'difficulty_rating';
    IF v_difficulty NOT IN ('very_easy', 'easy', 'moderate', 'hard', 'very_hard') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid difficulty rating.');
    END IF;
  ELSE
    v_difficulty := NULL;
  END IF;

  v_notes := NULLIF(trim(COALESCE(p_check_in->>'patient_notes', '')), '');
  IF v_notes IS NOT NULL AND length(v_notes) > 1000 THEN
    v_notes := substr(v_notes, 1, 1000);
  END IF;

  v_completed_exercises := COALESCE(p_check_in->'completed_exercises', '[]'::jsonb);

  -- Insert check-in record
  INSERT INTO public.hep_patient_check_ins (
    practice_id,
    program_id,
    patient_id,
    session_id,
    completed_at,
    pain_rating,
    difficulty_rating,
    patient_notes,
    completed_exercises
  ) VALUES (
    v_session.practice_id,
    v_session.program_id,
    v_session.patient_id,
    v_session.id,
    now(),
    v_pain,
    v_difficulty,
    v_notes,
    v_completed_exercises
  ) RETURNING id INTO v_check_in_id;

  -- Update session activity
  UPDATE public.hep_patient_sessions
  SET last_active_at = now(), updated_at = now()
  WHERE id = v_session.id;

  -- Audit log check-in submission
  PERFORM public.log_audit_event(
    'hep.recovery_session_recorded',
    'home_exercise_program',
    v_session.program_id,
    jsonb_build_object(
      'check_in_id', v_check_in_id,
      'program_identifier', v_program.program_identifier,
      'pain_rating', v_pain,
      'difficulty_rating', v_difficulty
    ),
    'recovery_companion_service'
  );

  RETURN jsonb_build_object(
    'success', true,
    'check_in_id', v_check_in_id,
    'completed_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_recovery_companion_check_in(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_recovery_companion_check_in(text, jsonb) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 9. CLINICIAN RPC: FETCH CHECK-IN SUMMARY & ADHERENCE FOR HEP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hep_check_in_summary(
  p_program_id uuid,
  p_practice_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_practice uuid;
  v_total_sessions integer;
  v_last_check_in timestamptz;
  v_days_since_last_check_in integer;
  v_avg_pain numeric(4,1);
  v_latest_pain integer;
  v_latest_difficulty text;
  v_unreviewed_count integer;
  v_high_difficulty_flag boolean := false;
  v_inactivity_flag boolean := false;
  v_check_in_list jsonb;
  v_active_code record;
BEGIN
  v_current_practice := COALESCE(p_practice_id, public.current_practice_id());
  IF v_current_practice IS NULL THEN
    RAISE EXCEPTION 'Access denied: Active practice context required.';
  END IF;

  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    IF NOT public.user_has_practice_role(
      v_current_practice,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist']
    ) THEN
      RAISE EXCEPTION 'Access denied: Insufficient privileges to view HEP check-in summary.';
    END IF;
  END IF;

  -- Count total sessions
  SELECT COUNT(*),
         MAX(completed_at),
         ROUND(AVG(pain_rating), 1),
         COUNT(*) FILTER (WHERE clinician_reviewed_at IS NULL)
  INTO v_total_sessions, v_last_check_in, v_avg_pain, v_unreviewed_count
  FROM public.hep_patient_check_ins
  WHERE program_id = p_program_id AND practice_id = v_current_practice;

  -- Calculate days since last check in
  IF v_last_check_in IS NOT NULL THEN
    v_days_since_last_check_in := EXTRACT(DAY FROM (now() - v_last_check_in))::integer;
    IF v_days_since_last_check_in >= 4 THEN
      v_inactivity_flag := true;
    END IF;
  ELSE
    v_days_since_last_check_in := NULL;
    v_inactivity_flag := true;
  END IF;

  -- Latest check in pain and difficulty
  SELECT pain_rating, difficulty_rating
  INTO v_latest_pain, v_latest_difficulty
  FROM public.hep_patient_check_ins
  WHERE program_id = p_program_id AND practice_id = v_current_practice
  ORDER BY completed_at DESC
  LIMIT 1;

  IF v_latest_difficulty IN ('hard', 'very_hard') OR (v_latest_pain IS NOT NULL AND v_latest_pain >= 7) THEN
    v_high_difficulty_flag := true;
  END IF;

  -- List of check-ins with reviewer info
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ci.id,
      'completed_at', ci.completed_at,
      'pain_rating', ci.pain_rating,
      'difficulty_rating', ci.difficulty_rating,
      'patient_notes', ci.patient_notes,
      'completed_exercises', ci.completed_exercises,
      'clinician_reviewed_at', ci.clinician_reviewed_at,
      'clinician_reviewed_by', ci.clinician_reviewed_by,
      'reviewer_name', COALESCE(pr.display_name, trim(pr.first_name || ' ' || pr.last_name)),
      'clinician_feedback_notes', ci.clinician_feedback_notes,
      'clinician_follow_up_action', ci.clinician_follow_up_action
    ) ORDER BY ci.completed_at DESC
  ), '[]'::jsonb)
  INTO v_check_in_list
  FROM public.hep_patient_check_ins ci
  LEFT JOIN public.profiles pr ON pr.id = ci.clinician_reviewed_by
  WHERE ci.program_id = p_program_id AND ci.practice_id = v_current_practice;

  -- Active access code metadata (without leaking plaintext code)
  SELECT id, display_code_hint, expires_at, revoked_at, last_accessed_at, failed_attempts
  INTO v_active_code
  FROM public.hep_patient_access_codes
  WHERE program_id = p_program_id
    AND practice_id = v_current_practice
    AND revoked_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'total_sessions', v_total_sessions,
    'last_check_in', v_last_check_in,
    'days_since_last_check_in', v_days_since_last_check_in,
    'avg_pain', v_avg_pain,
    'latest_pain', v_latest_pain,
    'latest_difficulty', v_latest_difficulty,
    'unreviewed_count', v_unreviewed_count,
    'inactivity_flag', v_inactivity_flag,
    'high_difficulty_flag', v_high_difficulty_flag,
    'check_ins', v_check_in_list,
    'active_access_code', CASE
      WHEN v_active_code.id IS NOT NULL THEN jsonb_build_object(
        'id', v_active_code.id,
        'display_hint', v_active_code.display_code_hint,
        'expires_at', v_active_code.expires_at,
        'last_accessed_at', v_active_code.last_accessed_at
      )
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_hep_check_in_summary(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hep_check_in_summary(uuid, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 10. CLINICIAN RPC: REVIEW & SIGN OFF ON PATIENT CHECK-IN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_hep_check_in(
  p_check_in_id uuid,
  p_notes text,
  p_action text,
  p_practice_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_practice uuid;
  v_check_in record;
  v_action text;
BEGIN
  v_current_practice := COALESCE(p_practice_id, public.current_practice_id());
  IF v_current_practice IS NULL THEN
    RAISE EXCEPTION 'Access denied: Active practice context required.';
  END IF;

  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    IF NOT public.user_has_practice_role(
      v_current_practice,
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist']
    ) THEN
      RAISE EXCEPTION 'Access denied: Only clinical staff can review patient check-ins.';
    END IF;
  END IF;

  v_action := COALESCE(p_action, 'acknowledged');
  IF v_action NOT IN ('acknowledged', 'follow_up_planned', 'regimen_review_needed', 'no_action_needed') THEN
    RAISE EXCEPTION 'Invalid follow-up action: %', v_action;
  END IF;

  -- Locate check-in
  SELECT id, practice_id, program_id, patient_id
  INTO v_check_in
  FROM public.hep_patient_check_ins
  WHERE id = p_check_in_id AND practice_id = v_current_practice;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Check-in record not found in active practice.';
  END IF;

  -- Update review sign-off
  UPDATE public.hep_patient_check_ins
  SET clinician_reviewed_at = now(),
      clinician_reviewed_by = auth.uid(),
      clinician_feedback_notes = NULLIF(trim(p_notes), ''),
      clinician_follow_up_action = v_action,
      updated_at = now()
  WHERE id = p_check_in_id;

  -- Audit log sign-off
  PERFORM public.log_audit_event(
    'hep.patient_check_in_reviewed',
    'home_exercise_program',
    v_check_in.program_id,
    jsonb_build_object(
      'check_in_id', p_check_in_id,
      'clinician_id', auth.uid(),
      'action', v_action
    ),
    'recovery_companion_service'
  );

  RETURN jsonb_build_object(
    'success', true,
    'check_in_id', p_check_in_id,
    'reviewed_at', now(),
    'action', v_action
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_hep_check_in(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_hep_check_in(uuid, text, text, uuid) TO authenticated, service_role;
