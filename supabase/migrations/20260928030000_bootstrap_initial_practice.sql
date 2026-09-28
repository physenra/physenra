-- ====================================================================================
-- Physenra Initial Practice & Administrator Controlled Bootstrap
-- Migration: 20260928030000_bootstrap_initial_practice.sql
-- Description: Controlled, idempotent provisioning of the first practice and owner
--              membership for verified administrator account physenra@gmail.com.
-- ====================================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_practice_id uuid;
BEGIN
  -- 1. Resolve authenticated administrator UUID dynamically by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'physenra@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Admin user physenra@gmail.com not found in auth.users; skipping initial bootstrap.';
    RETURN;
  END IF;

  -- 2. Idempotently resolve or create initial practice
  SELECT id INTO v_practice_id
  FROM public.practices
  WHERE slug = 'physenra-demo-practice';

  IF v_practice_id IS NULL THEN
    INSERT INTO public.practices (
      name,
      slug,
      status,
      timezone,
      country
    )
    VALUES (
      'Physenra Demo Practice',
      'physenra-demo-practice',
      'active',
      'UTC',
      'US'
    )
    RETURNING id INTO v_practice_id;

    RAISE NOTICE 'Created initial practice: Physenra Demo Practice (ID: %)', v_practice_id;
  ELSE
    RAISE NOTICE 'Initial practice already exists (ID: %)', v_practice_id;
  END IF;

  -- 3. Idempotently assign practice_owner membership to physenra@gmail.com
  IF NOT EXISTS (
    SELECT 1
    FROM public.practice_memberships
    WHERE practice_id = v_practice_id
      AND user_id = v_user_id
      AND status = 'active'
  ) THEN
    INSERT INTO public.practice_memberships (
      practice_id,
      user_id,
      role,
      status,
      joined_at
    )
    VALUES (
      v_practice_id,
      v_user_id,
      'practice_owner',
      'active',
      now()
    );

    RAISE NOTICE 'Provisioned practice_owner membership for user ID %', v_user_id;
  ELSE
    RAISE NOTICE 'Active membership already exists for user ID % in practice ID %', v_user_id, v_practice_id;
  END IF;

  -- 4. Idempotently set professional display name on profile if empty
  UPDATE public.profiles
  SET 
    display_name = CASE 
      WHEN display_name IS NULL OR trim(display_name) = '' THEN 'Physenra Administrator'
      ELSE display_name 
    END,
    updated_at = now()
  WHERE id = v_user_id;

  -- 5. Idempotently ensure active subscription record for the practice
  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE practice_id = v_practice_id
  ) THEN
    INSERT INTO public.subscriptions (
      practice_id,
      plan_tier,
      status
    )
    VALUES (
      v_practice_id,
      'starter',
      'active'
    );

    RAISE NOTICE 'Provisioned starter subscription for practice ID %', v_practice_id;
  END IF;

END $$;
