-- ====================================================================================
-- Physenra Database Foundation V1 Hardening
-- Migration: 20260928012000_harden_foundation_security.sql
-- Description: Implements comprehensive security hardening for Foundation V1:
--              1. Patient profile isolation & active-practice staff scoping
--              2. Platform-admin self-elevation prevention (RLS + trigger)
--              3. Practice manager -> owner privilege escalation prevention
--              4. Partial unique index for practice memberships (re-invite after revocation)
--              5. Tamper-proof audit logging via trusted SECURITY DEFINER function
--              6. Explicit function execution privilege revocations & grants
--              7. Practice creation status constraint hardening
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- 1. PRACTICE MEMBERSHIP UNIQUENESS FIX (RE-INVITATION AFTER REVOCATION)
-- ------------------------------------------------------------------------------------
-- Replace rigid UNIQUE constraint with partial index that excludes 'revoked' memberships.
-- This allows audit history of revoked memberships while preventing duplicate active/invited/suspended rows.
ALTER TABLE public.practice_memberships DROP CONSTRAINT IF EXISTS uq_practice_user_role;

DROP INDEX IF EXISTS public.uq_practice_user_role_active;
CREATE UNIQUE INDEX uq_practice_user_role_active 
  ON public.practice_memberships (practice_id, user_id, role) 
  WHERE status <> 'revoked';

-- ------------------------------------------------------------------------------------
-- 2. PROFILE ISOLATION HARDENING (ELIMINATE CROSS-PATIENT ENUMERATION)
-- ------------------------------------------------------------------------------------
-- Drop the overly permissive co-membership policy that allowed patients to enumerate each other
DROP POLICY IF EXISTS profiles_select_self_or_colleague ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
DROP POLICY IF EXISTS profiles_select_staff_active_practice ON public.profiles;
DROP POLICY IF EXISTS profiles_select_platform_admin ON public.profiles;

-- Policy 2.1: Users can view their own profile
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2.2: Staff in active practice context can view colleague and patient profiles in that practice
CREATE POLICY profiles_select_staff_active_practice ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.user_has_practice_role(
      auth.current_practice_id(),
      ARRAY['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant']
    )
    AND EXISTS (
      SELECT 1 
      FROM public.practice_memberships pm
      WHERE pm.practice_id = auth.current_practice_id()
        AND pm.user_id = profiles.id
        AND pm.status = 'active'
    )
  );

-- Policy 2.3: Platform administrators can view profiles for system administration
CREATE POLICY profiles_select_platform_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.is_platform_admin());

-- ------------------------------------------------------------------------------------
-- 3. PLATFORM-ADMIN PRIVILEGE ESCALATION PROTECTION (TRIGGER + RLS)
-- ------------------------------------------------------------------------------------
-- Trigger function preventing non-platform-admins from inserting or modifying is_platform_admin
CREATE OR REPLACE FUNCTION public.protect_is_platform_admin()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_platform_admin IS TRUE AND NOT COALESCE(auth.is_platform_admin(), false) THEN
      RAISE EXCEPTION 'Privilege escalation rejected: only platform administrators can create platform admin accounts'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin AND NOT COALESCE(auth.is_platform_admin(), false) THEN
      RAISE EXCEPTION 'Privilege escalation rejected: only platform administrators can modify platform administrator status'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_is_platform_admin ON public.profiles;
CREATE TRIGGER trg_protect_is_platform_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_is_platform_admin();

-- Re-create profiles INSERT and UPDATE policies with explicit platform admin check
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND (is_platform_admin IS FALSE OR auth.is_platform_admin())
  );

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (is_platform_admin IS FALSE OR auth.is_platform_admin())
  );

-- ------------------------------------------------------------------------------------
-- 4. PRACTICE MEMBERSHIP HIERARCHY & ESCALATION PREVENTION
-- ------------------------------------------------------------------------------------
-- Drop existing policies that allowed practice_manager to grant practice_owner
DROP POLICY IF EXISTS memberships_insert_owner_manager ON public.practice_memberships;
DROP POLICY IF EXISTS memberships_update_owner_manager ON public.practice_memberships;
DROP POLICY IF EXISTS memberships_insert_hierarchy ON public.practice_memberships;
DROP POLICY IF EXISTS memberships_update_hierarchy ON public.practice_memberships;

-- Policy 4.1: INSERT with strict role hierarchy
CREATE POLICY memberships_insert_hierarchy ON public.practice_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 1. Bootstrap: User creating initial practice can set themselves as practice_owner
    (
      user_id = auth.uid()
      AND role = 'practice_owner'
      AND NOT EXISTS (
        SELECT 1 
        FROM public.practice_memberships pm 
        WHERE pm.practice_id = practice_memberships.practice_id
      )
    )
    -- 2. Practice Owner: Can assign any practice role (cannot assign platform_admin)
    OR (
      auth.user_has_practice_role(practice_id, ARRAY['practice_owner'])
      AND role <> 'platform_admin'
    )
    -- 3. Practice Manager: Can only assign staff/patient roles (NOT practice_owner or platform_admin)
    OR (
      auth.user_has_practice_role(practice_id, ARRAY['practice_manager'])
      AND role NOT IN ('practice_owner', 'platform_admin')
    )
  );

-- Policy 4.2: UPDATE with strict role hierarchy
CREATE POLICY memberships_update_hierarchy ON public.practice_memberships
  FOR UPDATE
  TO authenticated
  USING (
    -- Practice Owner can manage any membership in their practice
    auth.user_has_practice_role(practice_id, ARRAY['practice_owner'])
    -- Practice Manager can ONLY manage memberships that are NOT currently practice_owner
    OR (
      auth.user_has_practice_role(practice_id, ARRAY['practice_manager'])
      AND role <> 'practice_owner'
    )
  )
  WITH CHECK (
    -- Practice Owner can update to any practice role (cannot assign platform_admin)
    (
      auth.user_has_practice_role(practice_id, ARRAY['practice_owner'])
      AND role <> 'platform_admin'
    )
    -- Practice Manager can only update to non-owner, non-platform_admin roles
    OR (
      auth.user_has_practice_role(practice_id, ARRAY['practice_manager'])
      AND role NOT IN ('practice_owner', 'platform_admin')
    )
  );

-- Trigger guarding against membership tampering and unauthorized role assignment
CREATE OR REPLACE FUNCTION public.protect_practice_owner_membership()
RETURNS trigger AS $$
BEGIN
  -- Block any attempt to assign platform_admin via practice memberships
  IF NEW.role = 'platform_admin' THEN
    RAISE EXCEPTION 'Platform administrator role cannot be assigned via practice memberships'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Protect practice_owner role from unauthorized creation or modification
  IF (NEW.role = 'practice_owner' OR (TG_OP = 'UPDATE' AND OLD.role = 'practice_owner')) THEN
    -- Allow initial bootstrap if no memberships exist yet for the practice
    IF TG_OP = 'INSERT' AND NOT EXISTS (
      SELECT 1 
      FROM public.practice_memberships pm 
      WHERE pm.practice_id = NEW.practice_id
    ) THEN
      RETURN NEW;
    END IF;

    -- Otherwise, only an active practice_owner or platform admin can touch owner memberships
    IF NOT (
      COALESCE(auth.user_has_practice_role(COALESCE(NEW.practice_id, OLD.practice_id), ARRAY['practice_owner']), false)
      OR COALESCE(auth.is_platform_admin(), false)
    ) THEN
      RAISE EXCEPTION 'Privilege escalation rejected: only practice owners can assign or modify owner memberships'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_practice_owner_membership ON public.practice_memberships;
CREATE TRIGGER trg_protect_practice_owner_membership
  BEFORE INSERT OR UPDATE ON public.practice_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_practice_owner_membership();

-- ------------------------------------------------------------------------------------
-- 5. AUDIT EVENT INGESTION INTEGRITY (TRUSTED FUNCTION & DIRECT INSERT DENIAL)
-- ------------------------------------------------------------------------------------
-- Remove direct insert policy to prevent forging actor_role, timestamp, or cross-tenant injection
DROP POLICY IF EXISTS audit_events_insert ON public.audit_events;
DROP POLICY IF EXISTS audit_events_no_direct_insert ON public.audit_events;

CREATE POLICY audit_events_no_direct_insert ON public.audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Trusted SECURITY DEFINER logging function that automatically resolves caller, role, context, and time
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_source text DEFAULT 'web'
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_practice_id uuid;
  v_role text;
  v_audit_id uuid;
  v_headers jsonb;
  v_ip inet;
  v_user_agent text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to record audit event'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_action IS NULL OR TRIM(p_action) = '' THEN
    RAISE EXCEPTION 'Audit action parameter cannot be empty'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_entity_type IS NULL OR TRIM(p_entity_type) = '' THEN
    RAISE EXCEPTION 'Audit entity_type parameter cannot be empty'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Practice context is resolved through the trusted helper
  v_practice_id := auth.current_practice_id();

  -- Actor role is strictly derived from active membership in the resolved practice context
  IF v_practice_id IS NOT NULL THEN
    SELECT role INTO v_role
    FROM public.practice_memberships
    WHERE practice_id = v_practice_id
      AND user_id = v_user_id
      AND status = 'active'
    ORDER BY 
      CASE role
        WHEN 'practice_owner' THEN 1
        WHEN 'practice_manager' THEN 2
        WHEN 'physiotherapist' THEN 3
        WHEN 'receptionist' THEN 4
        WHEN 'accountant' THEN 5
        WHEN 'patient' THEN 6
        ELSE 7
      END
    LIMIT 1;
  ELSIF auth.is_platform_admin() THEN
    v_role := 'platform_admin';
  ELSE
    v_role := NULL;
  END IF;

  -- Extract network metadata safely if available
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
    IF v_headers IS NOT NULL THEN
      v_user_agent := v_headers ->> 'user-agent';
      BEGIN
        v_ip := (split_part(v_headers ->> 'x-forwarded-for', ',', 1))::inet;
      EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
    v_ip := NULL;
    v_user_agent := NULL;
  END;

  INSERT INTO public.audit_events (
    practice_id,
    actor_user_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    metadata,
    source,
    ip_address,
    user_agent,
    created_at
  )
  VALUES (
    v_practice_id,
    v_user_id,
    v_role,
    TRIM(p_action),
    TRIM(p_entity_type),
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_source, 'web'),
    v_ip,
    v_user_agent,
    now()
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------------
-- 6. PRACTICE ONBOARDING POLICY HARDENING
-- ------------------------------------------------------------------------------------
-- Restrict initial practice creation status to active or trial
DROP POLICY IF EXISTS practices_insert_auth ON public.practices;
CREATE POLICY practices_insert_auth ON public.practices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status IN ('active', 'trial')
  );

-- ------------------------------------------------------------------------------------
-- 7. EXPLICIT FUNCTION PRIVILEGE RESTRICTIONS
-- ------------------------------------------------------------------------------------
-- Revoke public execution privileges from all database functions
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_audit_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_practice_owner_membership() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.current_practice_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.user_has_practice_role(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.is_platform_admin() FROM PUBLIC;

-- Grant execution explicitly to authenticated users for client-facing/RLS helper functions
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.current_practice_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_has_practice_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_platform_admin() TO authenticated;
