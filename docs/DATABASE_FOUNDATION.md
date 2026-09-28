# PHYSENRA DATABASE FOUNDATION SPECIFICATION (V1 HARDENED)

**Baseline Migration:** `20260928011500_foundation_platform_tenancy_and_auth.sql`  
**Hardening Migration:** `20260928012000_harden_foundation_security.sql`  
**Target Database:** PostgreSQL 17+ (Supabase)  
**Status:** Approved, Implemented & Security-Hardened (Local Deliverable)  

---

## 1. ARCHITECTURAL SCOPE & PURPOSE

The V1 Database Foundation establishes the core platform substrate for Physenra:
1. Multi-tenant practice isolation (`practices`)
2. Decoupled user profiles linked 1:1 to Supabase Auth (`profiles`)
3. Multi-practice membership model with explicit RBAC roles (`practice_memberships`)
4. Core SaaS subscription status tracking (`subscriptions`)
5. Immutable, append-only security and operational audit trail (`audit_events`)
6. Database-enforced tenant context resolution and fail-closed Row Level Security (RLS)
7. Comprehensive defense-in-depth privilege escalation protections

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
- Unique Partial Index: `uq_practice_user_role_active` ON `(practice_id, user_id, role) WHERE status <> 'revoked'`

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
Tamper-resistant append-only log capturing security, membership, and operational events. Direct client inserts are permanently disabled; records are written exclusively through trusted functions or backend workers.
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
3. **`public.protect_is_platform_admin()`:** Trigger function on `public.profiles` (`BEFORE INSERT OR UPDATE`) preventing non-platform administrators from elevating `is_platform_admin` to `true`.
4. **`public.protect_practice_owner_membership()`:** Trigger function on `public.practice_memberships` (`BEFORE INSERT OR UPDATE`) preventing unauthorized assignment of `platform_admin` and ensuring only existing practice owners can create or modify `practice_owner` records.
5. **`public.prevent_audit_mutation()`:** Trigger function on `public.audit_events` (`BEFORE UPDATE OR DELETE`) raising an `integrity_constraint_violation` exception to enforce audit immutability.
6. **`public.log_audit_event(...)`:** Trusted `SECURITY DEFINER` function for recording audit events. Automatically derives `actor_user_id = auth.uid()`, active practice role from `auth.current_practice_id()`, `created_at = now()`, and client network telemetry.
7. **`auth.current_practice_id()`:** Resolves active tenant context. Reads the `x-practice-id` client request header (with fallback to `app_metadata.active_practice_id`), and **verifies that the calling user possesses an active membership in that practice**. Returns `NULL` if unauthenticated, invalid, or membership is suspended/revoked.
8. **`auth.user_has_practice_role(target_practice_id, allowed_roles)`:** Security definer helper confirming the calling user holds an active membership with one of the specified roles.
9. **`auth.is_platform_admin()`:** Security definer helper confirming whether the calling user has `is_platform_admin = true` in their profile.

---

## 4. ROW LEVEL SECURITY (RLS) POLICIES

RLS is enabled on all 5 tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

- **`practices`:**
  - `SELECT`: Allowed only for authenticated users who are active members.
  - `INSERT`: Allowed for authenticated users with `status IN ('active', 'trial')`.
  - `UPDATE`: Restricted to `practice_owner` or `practice_manager`.
  - `DELETE`: Permanently blocked (`USING (false)`).
- **`profiles`:**
  - `SELECT (Self)`: Allowed for self (`id = auth.uid()`).
  - `SELECT (Staff Scoped)`: Allowed for staff members in their active practice context to view colleagues and patients in that active practice. Cross-patient enumeration is strictly prevented.
  - `SELECT (Platform Admin)`: Allowed for platform administrators.
  - `INSERT`: Enforces `id = auth.uid()` and `(is_platform_admin IS FALSE OR auth.is_platform_admin())`.
  - `UPDATE`: Enforces `id = auth.uid()` and `(is_platform_admin IS FALSE OR auth.is_platform_admin())`.
  - `DELETE`: Permanently blocked (`USING (false)`).
- **`practice_memberships`:**
  - `SELECT`: Allowed for self (`user_id = auth.uid()`), OR practice owners/managers for their practice.
  - `INSERT`: Strictly enforces privilege hierarchy. Practice owners can grant practice roles (except `platform_admin`). Practice managers can grant staff/patient roles (NOT `practice_owner` or `platform_admin`). Initial practice bootstrapping allows self-assignment as `practice_owner`.
  - `UPDATE`: Practice owners can update any membership. Practice managers can only update non-owner memberships to non-owner/non-platform_admin roles.
  - `DELETE`: Blocked; status transitions to `'revoked'`.
- **`subscriptions`:**
  - `SELECT`: Allowed for `practice_owner`, `practice_manager`, `accountant`.
  - `INSERT`: Allowed for `practice_owner` during practice setup.
  - `UPDATE`: Restricted to `practice_owner` or service-role webhooks.
  - `DELETE`: Blocked.
- **`audit_events`:**
  - `SELECT`: Restricted to `practice_owner` in the active practice context.
  - `INSERT`: Direct inserts by authenticated clients are blocked (`audit_events_no_direct_insert WITH CHECK (false)`). Inserts must occur via trusted `public.log_audit_event()`.
  - `UPDATE` / `DELETE`: Permanently blocked at policy and trigger levels.

---

## 5. HARDENED SECURITY DECISIONS & FIXES

1. **Profile Isolation (No Cross-Patient Enumeration):** Patients can ONLY view their own profile record. Staff can view other practice members ONLY within their verified active practice context (`auth.current_practice_id()`).
2. **Platform Admin Self-Injection Prevention:** Enforced via dual-layer protection: RLS `WITH CHECK` and `BEFORE INSERT OR UPDATE` trigger `trg_protect_is_platform_admin`.
3. **Manager-to-Owner Privilege Escalation Prevention:** Managers are strictly prohibited at both RLS policy and trigger levels from assigning or editing `practice_owner` or `platform_admin` roles.
4. **Lifecycle Re-Invitation via Partial Index:** Replaced rigid constraint with `uq_practice_user_role_active` (`WHERE status <> 'revoked'`), permitting staff and patient re-invitations without database collisions.
5. **Audit Ingestion Integrity:** Revoked direct client `INSERT` privileges. Audit logs must be created through `public.log_audit_event()`, guaranteeing authentic actor identity, derived role, verified tenant context, and unforgeable timestamps.
6. **Explicit Privilege Least-Authority:** Revoked default `EXECUTE` privileges from `PUBLIC` on all database functions, explicitly granting execution only where needed.
