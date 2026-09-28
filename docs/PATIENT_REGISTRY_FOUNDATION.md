# Physenra Patient Registry Foundation V1 Architecture & Specification

## 1. Executive Summary & Purpose

The **Patient Registry Foundation V1** establishes the primary demographic and administrative patient identity domain for the Physenra Physiotherapy EMR & Practice Management Platform.

This domain provides durable, practice-scoped patient identities that future clinical modules (episodes of care, appointments, SOAP notes, exercise prescriptions, billing) can reference safely.

### Explicit Boundary: Patient Identity vs. Clinical Record
A fundamental tenet of Physenra architecture is the strict separation between:
- **Patient Identity & Administrative Record:** Name, demographic parameters, contact channels, emergency contacts, administrative status, and unique clinical practice identifiers.
- **Clinical Records (Deferred to subsequent milestones):** Subjective/Objective assessments, diagnoses, clinical visits, SOAP notes, treatment plans, exercise prescriptions, outcome measures.

The Patient Registry V1 contains **zero clinical records, zero diagnosis fields, and zero financial ledgers**.

---

## 2. Multi-Tenant Ownership & Isolation

Every patient record is strictly owned by a single practice (`practice_id`). Patients are never shared across practice boundaries.

### Tenancy Principles:
1. **Authoritative Database Enforcement:** Row-Level Security (RLS) on `public.patients` enforces practice isolation using `public.current_practice_id()`.
2. **Context Synchronization:** The client runtime supplies the active practice context via the HTTP header `x-practice-id`, verified server-side against the user's active membership in `public.practice_memberships`.
3. **Cross-Tenant Prevention:**
   - **Cross-tenant SELECT:** Blocked at the RLS policy layer.
   - **Cross-tenant INSERT:** Blocked via `WITH CHECK (practice_id = public.current_practice_id())`.
   - **Cross-tenant UPDATE:** Blocked via `USING` and `WITH CHECK`. A database trigger forbids changing `practice_id` after creation.
   - **Cross-tenant DELETE:** Hard deletes are prohibited across the board. No DELETE policy is granted to any user.

---

## 3. Patient Identity & Demographic Model

### Entity Schema (`public.patients`):
| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `gen_random_uuid()` | Immutable internal surrogate key |
| `practice_id` | `uuid` | Foreign Key to `public.practices(id)` | Tenant ownership (immutable) |
| `patient_identifier` | `text` | NOT NULL, Unique per practice | Human-readable identifier (e.g. `PAT-000001`) |
| `first_name` | `text` | NOT NULL | Legal or given first name |
| `middle_name` | `text` | NULL | Middle name(s) |
| `last_name` | `text` | NOT NULL | Legal or family last name |
| `preferred_name` | `text` | NULL | Informal or preferred name |
| `date_of_birth` | `date` | NULL | Date of birth for age and identification |
| `sex` | `text` | CHECK `('male', 'female', 'other', 'unknown')` | Administrative sex |
| `phone` | `text` | NULL | Primary contact phone |
| `email` | `text` | NULL | Primary contact email |
| `address_line1` | `text` | NULL | Street address line 1 |
| `address_line2` | `text` | NULL | Street address line 2 / Suite |
| `city` | `text` | NULL | Locality / City |
| `state_province` | `text` | NULL | State, province, or county |
| `postal_code` | `text` | NULL | Postal / ZIP code |
| `country` | `text` | NOT NULL, DEFAULT `'GB'` | Country code (ISO 3166-1 alpha-2) |
| `emergency_contact_name` | `text` | NULL | Name of emergency contact |
| `emergency_contact_relationship` | `text` | NULL | Relationship (spouse, parent, etc.) |
| `emergency_contact_phone` | `text` | NULL | Emergency phone number |
| `emergency_contact_email` | `text` | NULL | Emergency email address |
| `status` | `text` | NOT NULL, DEFAULT `'active'` | `('active', 'inactive', 'archived')` |
| `administrative_notes` | `text` | NULL | Administrative instructions only |
| `archived_at` | `timestamptz` | NULL | Timestamp of archiving |
| `archived_by` | `uuid` | Foreign Key to `auth.users(id)` | User who archived the patient |
| `created_by` | `uuid` | Foreign Key to `auth.users(id)` | User who registered the patient |
| `updated_by` | `uuid` | Foreign Key to `auth.users(id)` | User who last updated the record |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Registration timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Last modification timestamp |

---

## 4. Human-Readable Patient Identifier Strategy

Commercial physiotherapy clinics require a concise, human-readable identifier suitable for verbal verification, wristbands, and physical document labeling.

### Identifier Rules:
1. **Not a Primary Key:** The database UUID remains the immutable internal foreign key target.
2. **Practice-Scoped Uniqueness:** Enforced via `CONSTRAINT uq_patients_practice_identifier UNIQUE (practice_id, patient_identifier)`.
3. **No PII Contamination:** Strictly derived from a database counter. Never derived from date of birth, initials, phone number, or national identification numbers (NHS / SSN).
4. **Database-Controlled Generation:**
   - Generated atomically via a per-practice counter table `public.practice_patient_counters`.
   - Before insertion trigger `trg_patients_generate_identifier` assigns `'PAT-' || lpad(v_counter::text, 6, '0')` if not supplied.
   - Immutable once assigned; attempts to update `patient_identifier` are rejected by trigger.

---

## 5. Patient Lifecycle & Status Management

Patients transition through three explicit statuses:
- **`active`:** Currently receiving or eligible to receive care. Appears in default directory listings.
- **`inactive`:** Discharged or dormant, but not archived. Retains searchability.
- **`archived`:** Inactive, deceased, transferred, or duplicate record closed. Excluded from default active lists to prevent clinical clutter; discoverable only when the user explicitly requests archived records.

### Archiving Rules:
- **Zero Hard Deletes:** Deleting rows from `public.patients` is completely disallowed at the database level.
- **Soft-Archiving:** Archiving updates `status = 'archived'`, records `archived_at = now()`, and stores `archived_by = auth.uid()`.
- **Audit Integration:** Archiving and unarchiving generate high-fidelity audit trail events via `public.log_audit_event()`.

---

## 6. Duplicate Management Strategy

In outpatient physiotherapy practices, multiple family members often share contact information (e.g., parents and children sharing an email and home phone). Therefore:
- **Hard Uniqueness:** Applied ONLY to `(practice_id, patient_identifier)`.
- **No Hard Unique Constraint on Phone or Email:** Enforcing uniqueness on phone or email causes severe operational failure in family medicine and pediatric/geriatric physiotherapy.
- **Duplicate Warning System:** The application checks for existing active patients in the same practice sharing `(first_name, last_name, date_of_birth)` or matching phone/email, displaying an informational confirmation prompt to the receptionist before submission.

---

## 7. Role-Based Access Control (RBAC) Strategy

Permissions within the active practice context:

| Role | View Registry | Create Patient | Edit Demographics | Archive/Unarchive | View Billing Info |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `practice_owner` | Yes | Yes | Yes | Yes | Yes |
| `practice_manager` | Yes | Yes | Yes | Yes | Yes |
| `receptionist` | Yes | Yes | Yes | Yes | Yes |
| `physiotherapist` | Yes | Yes | Yes | No | Restricted |
| `accountant` | Yes | No | No | No | Yes |
| `patient` | No | No | No | No | Self-only (Deferred) |
| `platform_admin` | No (RLS) | No (RLS) | No (RLS) | No (RLS) | No (RLS) |

---

## 8. Audit Trail Integration

All patient administrative lifecycle operations integrate with `public.log_audit_event()`:
- `patient_created`: Logged upon patient registration with actor and patient ID.
- `patient_updated`: Logged when demographic/contact details change.
- `patient_archived`: Logged when a patient record is archived.
- `patient_unarchived`: Logged when an archived record is restored.
- `patient_status_changed`: Logged on active/inactive status transitions.

Audit records capture actor UUID, active practice context, and timestamp automatically through `SECURITY DEFINER` resolution.

---

## 9. Search & Pagination Strategy

- Search queries query `first_name`, `last_name`, `patient_identifier`, `phone`, and `email` using ILIKE / text matching.
- All queries are strictly scoped to `practice_id = public.current_practice_id()`.
- Unbounded queries are blocked; queries enforce pagination (default 20 records per page).

---

## 10. Future Integration Points

Durable foreign key references from future clinical modules:
- `episodes_of_care.patient_id -> patients.id`
- `appointments.patient_id -> patients.id`
- `clinical_visits.patient_id -> patients.id`
- `invoices.patient_id -> patients.id`
- `patient_portal_accounts.patient_id -> patients.id`
