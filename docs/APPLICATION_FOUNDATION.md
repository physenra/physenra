# PHYSENRA — APPLICATION FOUNDATION SPECIFICATION (V1)

**Status:** Approved Architectural Design  
**Target Platform:** Single Page Application (SPA) / React 19 + TypeScript + Vite  
**Backend:** Supabase (PostgreSQL 17, GoTrue Auth, Realtime, REST)  
**Database Tenancy Model:** Row Level Security (RLS) with Dynamic `x-practice-id` Tenant Context  

---

## 1. APPLICATION ARCHITECTURE

Physenra is an independent physiotherapy Electronic Medical Record (EMR) and practice management SaaS platform. The application frontend follows a modern, modular, component-driven React architecture:

```
src/
├── assets/             # Brand logos, icons, static assets
├── components/         # Reusable presentation & layout components
│   ├── layout/         # AppShell, Header, Sidebar, Container
│   ├── auth/           # ProtectedRoute, AuthGuard, RoleGate
│   └── ui/             # Buttons, Cards, Inputs, Badges, Modals, Spinners
├── contexts/           # Global React Contexts & State Providers
│   ├── AuthContext.tsx     # Supabase session, auth user, sign-in/out
│   └── PracticeContext.tsx # Active practice resolution, switcher, multi-practice state
├── hooks/              # Custom React hooks (useAuth, usePractice, useRole)
├── lib/                # Third-party wrappers & SDK configuration
│   └── supabase.ts     # Centralized, typed Supabase client with tenant headers
├── pages/              # Routed page-level views
│   ├── auth/           # LoginPage, CallbackPage
│   ├── dashboard/      # DashboardPage (Foundation view)
│   ├── practice/       # PracticeSettingsPage
│   └── error/          # NotFoundPage, UnauthorizedPage, NoPracticePage
├── types/              # Domain TypeScript types & Supabase DB mappings
│   ├── database.ts     # Database table row definitions & schemas
│   └── models.ts       # Domain abstractions (User, Practice, Membership, Role)
├── App.tsx             # Root component with routing providers
├── main.tsx            # DOM mounting & root wrappers
└── index.css           # Design tokens, clinical styling, utility classes
```

---

## 2. AUTHENTICATION ARCHITECTURE

Authentication is delegated exclusively to **Supabase Auth (GoTrue)**. The application stores no passwords, hashes, or credentials in local application tables.

1. **Session Lifecycle:**
   - **Initialization:** On boot, `supabase.auth.getSession()` retrieves the persisted session from `localStorage`.
   - **Realtime Sync:** `supabase.auth.onAuthStateChange()` subscribes to auth events (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`).
   - **Session Restoration:** Token refresh cycles are handled transparently by the Supabase client without page reloads.
2. **State Abstraction (`AuthContext`):**
   - `user`: Supabase `User` object (or `null`).
   - `profile`: User profile fetched from `public.profiles` (`id`, `display_name`, `first_name`, `last_name`, `is_platform_admin`).
   - `loading`: Boolean state blocking route evaluation until initial auth resolution completes.
   - `signIn(email, password)`: Email/password authentication helper.
   - `signOut()`: Terminates session, clears cached tenant context, redirects to `/login`.

---

## 3. TENANT / PRACTICE CONTEXT ARCHITECTURE

A core architectural tenet of Physenra is **multi-practice flexibility**. A clinician or administrative user may belong to multiple practices or move between practices.

1. **Membership Discovery:**
   - Upon authentication, `PracticeContext` queries `public.practice_memberships` joining `public.practices`:
     ```sql
     SELECT pm.id, pm.practice_id, pm.role, pm.status, p.name, p.slug, p.status as practice_status, p.timezone, p.country
     FROM public.practice_memberships pm
     JOIN public.practices p ON pm.practice_id = p.id
     WHERE pm.user_id = auth.uid()
       AND pm.status = 'active';
     ```
   - Memberships marked `invited`, `suspended`, or `revoked` are strictly excluded from selectable active contexts.
2. **Context Selection Rules:**
   - **0 Active Practices:** Route to `/no-practice` empty-state view.
   - **1 Active Practice:** Automatically selected as the active practice.
   - **>1 Active Practices:** Checks `localStorage.getItem('physenra_active_practice_id')`. If valid and present in user's active memberships, select it; otherwise default to the first active practice.
3. **Database Tenant Header Injection (`x-practice-id`):**
   - All authenticated requests requiring practice context communicate the selected practice ID via the HTTP header `x-practice-id`.
   - The Supabase client configuration or fetch proxy dynamically injects `x-practice-id: activePracticeId`.
   - The database foundation's `public.current_practice_id()` validates this header server-side against `public.practice_memberships` (`WHERE user_id = auth.uid() AND practice_id = x AND status = 'active'`).
   - Client-side selection is for user experience only; **Row Level Security (RLS) remains the sole authoritative security boundary**.

---

## 4. PROTECTED ROUTING

Routing is implemented with `react-router-dom`:

| Route | Access Level | Description | Redirect / Guard |
|---|---|---|---|
| `/login` | Public / Unauth | Staff sign-in portal | If authenticated, redirect to `/app` |
| `/app` | Protected | Index redirect | Redirects to `/app/dashboard` |
| `/app/dashboard` | Protected | Practice overview & foundation status | Requires authenticated session & active practice |
| `/app/practice` | Protected | Practice profile & settings | Requires authenticated session & active practice |
| `/no-practice` | Protected | Empty state when user has 0 practices | Shown when user is authenticated without active memberships |
| `*` | Any | 404 Not Found fallback | Standard error view |

**Route Guards:**
- `<ProtectedRoute>`: Evaluates `AuthContext.loading`. While loading, displays full-screen clinical spinner. If unauthenticated, redirects to `/login` preserving target location in state for post-login return.
- If user has no active practice memberships, protected application routes redirect to `/no-practice`.

---

## 5. ROLE-AWARE ACCESS & UI VISIBILITY

Physenra foundation implements 7 RBAC roles defined in the database:
1. `platform_admin`: System-level administrator
2. `practice_owner`: Clinic owner with full practice governance
3. `practice_manager`: Operational manager (cannot modify owner)
4. `physiotherapist`: Treating clinician
5. `receptionist`: Front desk & scheduling administrator
6. `accountant`: Financial & billing manager
7. `patient`: Client / patient portal account

**Frontend Authorization Helpers:**
- `useRole()` provides:
  - `role`: Current active membership role.
  - `isOwner`: `role === 'practice_owner'`
  - `isManager`: `role === 'practice_manager'`
  - `isClinician`: `role === 'physiotherapist'`
  - `isStaff`: `['practice_owner', 'practice_manager', 'physiotherapist', 'receptionist', 'accountant'].includes(role)`
  - `hasRole(allowedRoles: Role[])`: Generic check for component visibility.
- **Security Rule:** Role-based conditional rendering in React is strictly for **User Experience (UX)**. It does not replace or weaken database RLS policies.

---

## 6. APPLICATION SHELL & VISUAL IDENTITY

The Physenra application shell establishes a distinct, clinical-grade visual identity:
- **Brand Aesthetic:** Professional, clean, clinical palette (Deep Slate `#0f172a`, Physenra Teal/Cyan `#0d9488`, Pure White `#ffffff`, Cool Grays `#f8fafc` to `#64748b`).
- **Header:**
  - Physenra logomark & brand title.
  - Practice context dropdown / selector (badge displaying practice name and status).
  - User identity badge (display name and role chip).
  - Quick action menu (Sign Out).
- **Navigation Sidebar:**
  - Core navigation links: Dashboard, Practice Settings.
  - Collapsible, mobile-responsive layout.
- **Main Area:** Fluid container rendering nested child routes via React Router `<Outlet />`.

---

## 7. ERROR HANDLING & LOADING STATES

1. **Loading Indicators:** Standardized `<LoadingScreen />` and `<Spinner />` components preventing content flashing during session validation and practice resolution.
2. **Error Boundaries:** React Error Boundary catching unexpected runtime rendering exceptions and displaying safe fallback instructions without raw stack traces.
3. **Session Expiry:** On `401 Unauthorized` or token refresh failure, the user is transitioned to `/login` with an informative session-expired notification.

---

## 8. ENVIRONMENT CONFIGURATION & SECURITY

- **Configuration:** Managed strictly through Vite environment variables (`.env.local` ignored by Git, `.env.example` committed with placeholders).
- **Frontend Variables:**
  - `VITE_SUPABASE_URL`: Public HTTPS API URL for the Physenra Supabase project.
  - `VITE_SUPABASE_ANON_KEY`: Public anonymous API key.
- **Forbidden In Frontend:**
  - `SUPABASE_ACCESS_TOKEN` (CLI PAT): Never imported, bundled, or referenced.
  - `service_role` key: Never included in frontend code.
  - Database connection strings: Never included in frontend code.

---

## 9. TESTING STRATEGY

1. **Automated Unit & Integration Tests (Vitest / Node Test Runner):**
   - Auth state transitions (unauthenticated, authenticated, sign-out).
   - Protected route redirection logic.
   - Practice context resolution (0 practices, 1 practice, multiple practices, filtering of revoked rows).
   - Role verification and permission helpers.
2. **Static Security Audit:**
   - Scan source code for prohibited credentials (`service_role`, `sbp_`).
   - Scan source code for contaminated strings or references to third-party or legacy external systems.
3. **Build & Typecheck:**
   - Strict TypeScript compiler check (`tsc --noEmit`).
   - Vite production build verification (`npm run build`).

---

## 10. FUTURE EXTENSION POINTS (CONTROLLED SUBSEQUENT PHASES)

The application foundation is architected to cleanly receive future business modules without breaking foundation state:
- `/app/patients` (Patient Demographics & Registration)
- `/app/appointments` (Clinical Scheduling & Dispatch)
- `/app/clinical` (SOAP Notes, Visits & Episodes of Care)
- `/app/billing` (Invoices, Payments & Superbills)
- `/app/settings/staff` (Staff Invitations & Role Management)
