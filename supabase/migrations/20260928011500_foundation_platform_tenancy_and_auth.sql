-- ====================================================================================
-- Physenra Database Foundation V1
-- Migration: 20260928011500_foundation_platform_tenancy_and_auth.sql
-- Description: Establishes the foundational platform, tenancy, RBAC, subscription,
--              user profile, audit infrastructure, and tenant-context RLS helpers.
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------------
-- pgcrypto: Essential for cryptographic functions and UUID generation fallback.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------------
-- 2. REUSABLE UTILITIES & TRIGGERS
-- ------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------------
-- 3. PRACTICES / TENANTS
-- ------------------------------------------------------------------------------------
CREATE TABLE public.practices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'trial', 'past_due', 'suspended', 'archived')),
  email text,
  phone text,
  timezone text NOT NULL DEFAULT 'UTC',
  country text NOT NULL DEFAULT 'US',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_practices_status ON public.practices(status);
CREATE INDEX idx_practices_slug ON public.practices(slug);

CREATE TRIGGER trg_practices_updated_at
  BEFORE UPDATE ON public.practices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------------
-- 4. USER PROFILES
-- ------------------------------------------------------------------------------------
-- Decoupled from auth credentials; references auth.users 1:1.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  is_platform_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_platform_admin ON public.profiles(is_platform_admin) WHERE is_platform_admin = true;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Safe profile creation trigger on auth.users registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      TRIM(CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name')),
      NEW.email
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------------
-- 5. PRACTICE MEMBERSHIPS & RBAC
-- ------------------------------------------------------------------------------------
-- Explicit junction linking users to practices with specific roles and lifecycle states.
CREATE TABLE public.practice_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'platform_admin',
    'practice_owner',
    'practice_manager',
    'physiotherapist',
    'receptionist',
    'accountant',
    'patient'
  )),
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'invited',
    'suspended',
    'revoked'
  )),
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_practice_user_role UNIQUE (practice_id, user_id, role)
);

CREATE INDEX idx_memberships_user_id ON public.practice_memberships(user_id);
CREATE INDEX idx_memberships_practice_id ON public.practice_memberships(practice_id);
CREATE INDEX idx_memberships_user_practice_active ON public.practice_memberships(user_id, practice_id) WHERE status = 'active';

CREATE TRIGGER trg_practice_memberships_updated_at
  BEFORE UPDATE ON public.practice_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------------
-- 6. SUBSCRIPTION FOUNDATION
-- ------------------------------------------------------------------------------------
-- B2B SaaS subscription status for practices. Completely decoupled from patient packages.
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL UNIQUE REFERENCES public.practices(id) ON DELETE RESTRICT,
  plan_tier text NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'enterprise')),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN (
    'trialing',
    'active',
    'past_due',
    'paused',
    'cancelled',
    'expired'
  )),
  seat_limit integer NOT NULL DEFAULT 5 CHECK (seat_limit > 0),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_practice_id ON public.subscriptions(practice_id);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------------
-- 7. AUDIT INFRASTRUCTURE & IMMUTABILITY
-- ------------------------------------------------------------------------------------
-- Append-only audit events table capturing security, tenant, and operational actions.
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid REFERENCES public.practices(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text DEFAULT 'web',
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_practice_id ON public.audit_events(practice_id);
CREATE INDEX idx_audit_events_actor_user_id ON public.audit_events(actor_user_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at);
CREATE INDEX idx_audit_events_entity ON public.audit_events(entity_type, entity_id);

-- Enforce strict immutability: block UPDATE and DELETE on audit records
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be updated or deleted'
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER trg_protect_audit_events_mutation
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_mutation();

-- ------------------------------------------------------------------------------------
-- 8. TENANT CONTEXT RESOLUTION & SECURITY DEFINER HELPERS
-- ------------------------------------------------------------------------------------

-- Resolves the active practice ID for the current authenticated request.
-- CRITICAL SECURITY RULE: The client-supplied header `x-practice-id` is NEVER trusted
-- alone; the database validates that the authenticated caller holds an active membership.
CREATE OR REPLACE FUNCTION public.current_practice_id()
RETURNS uuid AS $$
DECLARE
  v_practice_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Check custom HTTP header x-practice-id
  BEGIN
    v_practice_id := nullif(current_setting('request.headers', true)::jsonb ->> 'x-practice-id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_practice_id := NULL;
  END;

  -- 2. Fallback to active_practice_id in JWT app_metadata
  IF v_practice_id IS NULL THEN
    BEGIN
      v_practice_id := nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'active_practice_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_practice_id := NULL;
    END;
  END IF;

  IF v_practice_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3. CRITICAL VERIFICATION: Confirm authenticated user holds an active membership
  IF EXISTS (
    SELECT 1 
    FROM public.practice_memberships
    WHERE user_id = v_user_id
      AND practice_id = v_practice_id
      AND status = 'active'
  ) THEN
    RETURN v_practice_id;
  END IF;

  -- Return NULL if caller lacks active membership in the target practice
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Helper to verify if caller possesses a specific role in a practice
CREATE OR REPLACE FUNCTION public.user_has_practice_role(target_practice_id uuid, allowed_roles text[])
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.practice_memberships
    WHERE user_id = auth.uid()
      AND practice_id = target_practice_id
      AND status = 'active'
      AND role = ANY(allowed_roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Helper to check if caller is an identified platform administrator
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_platform_admin = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ------------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------------

-- Enable RLS across all foundational tables
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------------
-- Practices Policies
-- ------------------------------------------------------------------------------------
-- SELECT: Users can view practices where they hold an active membership
CREATE POLICY practices_select_member ON public.practices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.practice_memberships pm
      WHERE pm.practice_id = practices.id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

-- INSERT: Authenticated users can create a new practice (e.g. clinic onboarding)
CREATE POLICY practices_insert_auth ON public.practices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Only Practice Owners and Managers of that practice can update practice settings
CREATE POLICY practices_update_owner_or_manager ON public.practices
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_practice_role(id, ARRAY['practice_owner', 'practice_manager'])
  )
  WITH CHECK (
    public.user_has_practice_role(id, ARRAY['practice_owner', 'practice_manager'])
  );

-- DELETE: Practice hard deletion is prohibited at database level
CREATE POLICY practices_no_delete ON public.practices
  FOR DELETE
  TO authenticated
  USING (false);

-- ------------------------------------------------------------------------------------
-- Profiles Policies
-- ------------------------------------------------------------------------------------
-- SELECT: Users can view their own profile, OR profiles of active co-members in an active practice
CREATE POLICY profiles_select_self_or_colleague ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM public.practice_memberships pm_self
      JOIN public.practice_memberships pm_other 
        ON pm_self.practice_id = pm_other.practice_id
      WHERE pm_self.user_id = auth.uid()
        AND pm_self.status = 'active'
        AND pm_other.user_id = profiles.id
        AND pm_other.status = 'active'
    )
  );

-- UPDATE: Users can update their own non-administrative profile fields
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    -- Prevent non-admins from self-promoting to platform_admin
    AND (is_platform_admin = (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid()))
  );

-- INSERT: Handled via trigger on auth.users; allow fallback self-insert
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- DELETE: Prohibited via application API
CREATE POLICY profiles_no_delete ON public.profiles
  FOR DELETE
  TO authenticated
  USING (false);

-- ------------------------------------------------------------------------------------
-- Practice Memberships Policies
-- ------------------------------------------------------------------------------------
-- SELECT: Users can view their own memberships, OR Practice Owners / Managers can view practice memberships
CREATE POLICY memberships_select ON public.practice_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
  );

-- INSERT: Only Practice Owners and Managers can invite / add members to their practice
CREATE POLICY memberships_insert_owner_manager ON public.practice_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
    -- Or self-creation during initial practice creation if no members exist yet for that practice
    OR (
      user_id = auth.uid() 
      AND role = 'practice_owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.practice_memberships pm WHERE pm.practice_id = practice_memberships.practice_id
      )
    )
  );

-- UPDATE: Only Practice Owners and Managers can modify memberships
CREATE POLICY memberships_update_owner_manager ON public.practice_memberships
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
  )
  WITH CHECK (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager'])
  );

-- DELETE: Hard deletion prohibited; status transitions to 'revoked'
CREATE POLICY memberships_no_delete ON public.practice_memberships
  FOR DELETE
  TO authenticated
  USING (false);

-- ------------------------------------------------------------------------------------
-- Subscriptions Policies
-- ------------------------------------------------------------------------------------
-- SELECT: Authorized roles (Owner, Manager, Accountant) can view their practice subscription
CREATE POLICY subscriptions_select_authorized ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner', 'practice_manager', 'accountant'])
  );

-- INSERT: Practice owner can create initial subscription record during practice onboarding
CREATE POLICY subscriptions_insert_owner ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner'])
  );

-- UPDATE: Restricted to practice owner or service role (for webhook settlement)
CREATE POLICY subscriptions_update_owner ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner'])
  )
  WITH CHECK (
    public.user_has_practice_role(practice_id, ARRAY['practice_owner'])
  );

-- DELETE: Prohibited
CREATE POLICY subscriptions_no_delete ON public.subscriptions
  FOR DELETE
  TO authenticated
  USING (false);

-- ------------------------------------------------------------------------------------
-- Audit Events Policies
-- ------------------------------------------------------------------------------------
-- SELECT: Restricted to Practice Owners in active practice context
CREATE POLICY audit_events_select_owner ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (
    practice_id = public.current_practice_id()
    AND public.user_has_practice_role(practice_id, ARRAY['practice_owner'])
  );

-- INSERT: Authenticated users can record audit events for actions they perform
CREATE POLICY audit_events_insert ON public.audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      practice_id IS NULL 
      OR practice_id = public.current_practice_id()
    )
  );

-- UPDATE & DELETE: Permanently denied (supplementing the trigger)
CREATE POLICY audit_events_no_update ON public.audit_events
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY audit_events_no_delete ON public.audit_events
  FOR DELETE
  TO authenticated
  USING (false);
