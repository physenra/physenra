# PHYSENRA DATABASE FOUNDATION SPECIFICATION (V1)

**Migration:** `20260928011500_foundation_platform_tenancy_and_auth.sql`  
**Target Database:** PostgreSQL 17+ (Supabase)  
**Status:** Approved & Implemented Migration (Local Deliverable)  

---

## 1. ARCHITECTURAL SCOPE & PURPOSE

The V1 Database Foundation establishes the core platform substrate for Physenra:
1. Multi-tenant practice isolation (`practices`)
2. Decoupled user profiles linked 1:1 to Supabase Auth (`profiles`)
3. Multi-practice membership model with explicit RBAC roles (`practice_memberships`)
4. Core SaaS subscription status tracking (`subscriptions`)
5. Immutable, append-only security and operational audit trail (`audit_events`)
6. Database-enforced tenant context resolution and fail-closed Row Level Security (RLS)

This migration explicitly excludes clinical entities (patients, appointments, visits, notes, treatment plans), financial transactions (invoices, payments, packages, wallets), and third-party integrations (WhatsApp, email, AI).

---

## 2. TABLES & DATA STRUCTURES

### 2.1 `public.practices` (Tenant Root)
Root entity for all clinic-scoped data.
- `id` (uuid, PK, default: `gen_random_uuid()`)
- `name` (text, NOT NULL)
- `slug` (text, UNIQUE, NOT NULL): URL-safe clinic identifier
- `status` (text, NOT NULL, default: `'active'`, CHECK: `'active'`, `'trial'`, `'past_due'`, `'suspended'`, `'archived'`)
- `email` (text): Practice primary contact email
- `phone` (text): Practice primary contact phone
- `timezone` (text, NOT NULL, default: `'UTC'`)
- `country` (text, NOT NULL, default: `'US'`)
- `created_at` (timestamptz, NOT NULL, default: `now()`)
- `updated_at` (timestamptz, NOT NULL, default: `now()`)

### 2.2 `public.profiles` (User Identity Extension)
Stores user identity metadata decoupled from Supabase Auth credentials.
- `id` (uuid, PK, FK: `auth.users.id ON DELETE CASCADE`)
- `display_name` (text)
- `first_name` (text)
- `last_name` (text)
- `phone` (text)
- `avatar_url` (text)
- `is_platform_admin` (boolean, NOT NULL, default: `false`)
- `created_at` (timestamptz, NOT NULL, default: `now()`)
- `updated_at` (timestamptz, NOT NULL, default: `now()`)

### 2.3 `public.practice_memberships` (Tenant Membership & RBAC)
Associates users with practices, granting specific roles and lifecycle status.
- `id` (uuid, PK, default: `gen_random_uuid()`)
- `practice_id` (uuid, NOT NULL, FK: `public.practices.id ON DELETE RESTRICT`)
- `user_id` (uuid, NOT NULL, FK: `auth.users.id ON DELETE CASCADE`)
- `role` (text, NOT NULL, CHECK: `'platform_admin'`, `'practice_owner'`, `'practice_manager'`, `'physiotherapist'`, `'receptionist'`, `'accountant'`, `'patient'`)
- `status` (text, NOT NULL, default: `'active'`, CHECK: `'active'`, `'invited'`, `'suspended'`, `'revoked'`)
- `joined_at` (timestamptz)
- `created_at` (timestamptz, NOT NULL, default: `now()`)
- `updated_at` (timestamptz, NOT NULL, default: `now()`)
- Constraint: `UNIQUE (practice_id, user_id, role)`

### 2.4 `public.subscriptions` (SaaS Practice Subscription)
Tracks the commercial B2B subscription status between the practice and Physenra.
- `id` (uuid, PK, default: `gen_random_uuid()`)
- `practice_id` (uuid, NOT NULL, UNIQUE, FK: `public.practices.id ON DELETE RESTRICT`)
- `plan_tier` (text, NOT NULL, default: `'starter'`, CHECK: `'starter'`, `'growth'`, `'enterprise'`)
- `status` (text, NOT NULL, default: `'trialing'`, CHECK: `'trialing'`, `'active'`, `'past_due'`, `'paused'`, `'cancelled'`, `'expired'`)
- `seat_limit` (integer, NOT NULL, default: `5`, CHECK: `seat_limit > 0`)
- `current_period_start` (timestamptz, NOT NULL, default: `now()`)
- `current_period_end` (timestamptz, NOT NULL, default: `now() + interval '14 days'`)
- `cancel_at_period_end` (boolean, NOT NULL, default: `false`)
- `created_at` (timestamptz, NOT NULL, default: `now()`)
- `updated_at` (timestamptz, NOT NULL, default: `now()`)

### 2.5 `public.audit_events` (Immutable Security Trail)
Tamper-resistant append-only log capturing security, membership, and operational events.
- `id` (uuid, PK, default: `gen_random_uuid()`)
- `practice_id` (uuid, NULLABLE, FK: `public.practices.id ON DELETE RESTRICT`)
- `actor_user_id` (uuid, NULLABLE, FK: `auth.users.id ON DELETE SET NULL`)
- `actor_role` (text)
- `action` (text, NOT NULL)
- `entity_type` (text, NOT NULL)
- `entity_id` (uuid)
- `metadata` (jsonb, NOT NULL, default: `'{}'::jsonb`)
- `source` (text, default: `'web'`)
- `ip_address` (inet)
- `user_agent` (text)
- `created_at` (timestamptz, NOT NULL, default: `now()`)

---

## 3. DATABASE FUNCTIONS & TRIGGERS

1. **`public.set_updated_at()`:** Reusable trigger function updating `updated_at = now()`. Attached to `practices`, `profiles`, `practice_memberships`, and `subscriptions`.
2. **`public.handle_new_user()`:** Trigger function on `auth.users` (`AFTER INSERT`) ensuring a corresponding row is created in `public.profiles`. Safe `search_path = public, auth, pg_temp`.
3. **`public.prevent_audit_mutation()`:** Trigger function on `public.audit_events` (`BEFORE UPDATE OR DELETE`) raising an `integrity_constraint_violation` exception to enforce audit immutability.
4. **`auth.current_practice_id()`:** Resolves active tenant context. Reads the `x-practice-id` client request header (with fallback to `app_metadata.active_practice_id`), and **verifies that the calling user possesses an active membership in that practice**. Returns `NULL` if unauthenticated, invalid, or membership is suspended/revoked.
5. **`auth.user_has_practice_role(target_practice_id, allowed_roles)`:** Security definer helper confirming the calling user holds an active membership with one of the specified roles.
6. **`auth.is_platform_admin()`:** Security definer helper confirming whether the calling user has `is_platform_admin = true` in their profile.

---

## 4. ROW LEVEL SECURITY (RLS) POLICIES

RLS is enabled on all 5 tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

- **`practices`:**
  - `SELECT`: Allowed only for authenticated users who are active members.
  - `INSERT`: Allowed for authenticated users (clinic onboarding).
  - `UPDATE`: Restricted to `practice_owner` or `practice_manager`.
  - `DELETE`: Permanently blocked (`USING (false)`).
- **`profiles`:**
  - `SELECT`: Allowed for self (`id = auth.uid()`), OR co-members within the same active practice.
  - `UPDATE`: Allowed for self, preventing non-admins from self-promoting `is_platform_admin`.
  - `DELETE`: Permanently blocked (`USING (false)`).
- **`practice_memberships`:**
  - `SELECT`: Allowed for self (`user_id = auth.uid()`), OR practice owners/managers for their practice.
  - `INSERT` / `UPDATE`: Restricted to `practice_owner` or `practice_manager` (or self as owner on initial clinic bootstrap).
  - `DELETE`: Blocked; status transitions to `'revoked'`.
- **`subscriptions`:**
  - `SELECT`: Allowed for `practice_owner`, `practice_manager`, `accountant`.
  - `UPDATE`: Restricted to `practice_owner` or service-role webhooks.
  - `DELETE`: Blocked.
- **`audit_events`:**
  - `SELECT`: Restricted to `practice_owner` in the active practice context.
  - `INSERT`: Allowed for authenticated user recording actions they performed.
  - `UPDATE` / `DELETE`: Permanently blocked at policy and trigger levels.

---

## 5. INDEX STRATEGY

- `idx_practices_status`, `idx_practices_slug`
- `idx_profiles_platform_admin`
- `idx_memberships_user_id`, `idx_memberships_practice_id`, `idx_memberships_user_practice_active`
- `idx_subscriptions_practice_id`
- `idx_audit_events_practice_id`, `idx_audit_events_actor_user_id`, `idx_audit_events_created_at`, `idx_audit_events_entity`

---

## 6. SECURITY & ARCHITECTURAL DECISIONS

1. **Header Validation Rule:** Client headers (`x-practice-id`) are NEVER trusted by default. The database function verifies membership before granting tenant context.
2. **Platform Admin Boundary:** Platform administrators do not receive blanket RLS bypass.
3. **Immutability Protection:** Audit events cannot be updated or deleted by any user or application role.
4. **Clean Decoupling:** SaaS clinic subscriptions are strictly separated from patient packages.

---

## 7. KNOWN LIMITATIONS & FUTURE PHASES

- Clinical entities (patients, appointments, SOAP notes) are deferred to subsequent migrations.
- Payment gateway webhook processors will be introduced in V1.5.
