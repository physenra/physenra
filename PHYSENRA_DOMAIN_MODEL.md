# PHYSENRA DOMAIN MODEL & ENTITY CATALOG

**Product:** Physenra  
**Document:** Domain Entity Specification & Conceptual Data Model  
**Version:** 1.0.0  
**Status:** Conceptual Specification (Pre-Implementation)

---

## 1. DOMAIN RELATIONSHIP OVERVIEW

```text
[Subscription] ──> [Practice (Tenant)]
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
[PracticeMembership]                    [Patient]
   │          │                            │
   ▼          ▼           ┌────────────────┼────────────────┐
  [User]    [Role]        ▼                ▼                ▼
                    [Appointment]   [EpisodeOfCare]   [PatientWallet]
                          │                │                │
                          ▼                ▼                ▼
                   [ClinicalVisit] ──> [TreatmentPlan] [WalletTransaction]
                          │
                   ┌──────┴──────┐
                   ▼             ▼
             [ClinicalNote]  [Invoice] <── [Payment]
                   │             │
                   ▼             ▼
         [PackageSessionLedger] <── [Package]
```

---

## 2. CORE DOMAIN ENTITIES

### 2.1 Practice (Tenant Root)
- **Purpose:** Represents the top-level tenant entity—a physical or virtual physiotherapy practice, clinic, or healthcare group.
- **Ownership:** Owned by one or more `Practice Owner` users.
- **Tenant Relationship:** Root tenant. All operational, clinical, and financial data belonging to the clinic cascade from this identifier (`practice_id`).
- **Important Relationships:**
  - Has one active `Subscription`
  - Has many `PracticeMembership` records
  - Has many `Patient`, `Appointment`, `ClinicalVisit`, `Invoice`, and `Package` records
- **Lifecycle:** `Trial` ──> `Active` ──> `Past Due` ──> `Suspended` ──> `Archived`.
- **Security Considerations:** Direct access strictly partitioned. Practice boundaries are absolute; no query may join across practices without explicit platform super-privilege.

---

### 2.2 User (Global Identity)
- **Purpose:** Represents a real person who authenticates into Physenra (e.g. physiotherapist, receptionist, practice owner, patient, platform admin).
- **Ownership:** Owned by the authenticating individual.
- **Tenant Relationship:** Global identity. Users exist independently of tenants and establish associations via memberships.
- **Important Relationships:**
  - Bound 1:1 to Supabase `auth.users`
  - Has many `PracticeMembership` records across different practices
  - May be linked to a `Patient` profile within a specific practice
- **Lifecycle:** `Invited` ──> `Active` ──> `Disabled` ──> `Deactivated`.
- **Security Considerations:** Authentication handled via Supabase Auth (JWT). Passwords never stored in plaintext. Multi-factor authentication (MFA) supported.

---

### 2.3 PracticeMembership
- **Purpose:** Explicit junction associating a `User` with a `Practice`, defining their specific role, status, and clinic permissions.
- **Ownership:** Managed by `Practice Owner` and `Practice Manager`.
- **Tenant Relationship:** Scoped to a specific `practice_id`.
- **Important Relationships:**
  - Foreign key to `Practice`
  - Foreign key to `User`
  - Foreign key to `Role`
- **Lifecycle:** `Invited` ──> `Active` ──> `Suspended` ──> `Terminated`.
- **Security Considerations:** Resolves the user's authorization claims when operating within the selected practice context. Prevents orphaned access if a practitioner departs the clinic.

---

### 2.4 Role
- **Purpose:** Standardized definition of system capabilities and authorization scopes.
- **Ownership:** Platform-defined baseline roles with optional practice-level custom permission overrides.
- **Tenant Relationship:** Platform standard roles (`Platform Administrator`, `Practice Owner`, `Practice Manager`, `Physiotherapist`, `Receptionist`, `Accountant`, `Patient`).
- **Important Relationships:**
  - Referenced by `PracticeMembership`
- **Lifecycle:** Static platform definition.
- **Security Considerations:** Evaluated in server-side security policies. A role change immediately alters subsequent session authorizations.

---

### 2.5 Patient
- **Purpose:** Represents an individual receiving physiotherapy care within a practice.
- **Ownership:** Owned by the `Practice` where care is registered.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - Belong to `Practice`
  - Optionally linked to a `User` identity for patient portal access
  - Has many `EpisodeOfCare` records
  - Has many `Appointment` records
  - Has many `ClinicalVisit` and `ClinicalNote` records
  - Has many `Invoice` and `Payment` records
  - Has one `PatientWallet`
  - Has many `Package` entitlements
- **Lifecycle:** `Active` ──> `Discharged` ──> `Inactive` ──> `Archived`.
- **Security Considerations:** Sensitive Personal Health Information (PHI). Strict access controls; receptionists view demographic/booking data; accountants view billing data; clinicians view clinical histories.

---

### 2.6 EpisodeOfCare (Clinical Case Management)
- **Purpose:** Represents a coherent clinical episode, condition, or rehabilitation case (e.g. "Post-op ACL Reconstruction Rehab", "Chronic Cervical Radiculopathy"). Organizes visits, goals, and notes into distinct clinical tracks.
- **Ownership:** Authored by attending `Physiotherapist`, owned by `Practice`.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Patient`
  - References primary `Physiotherapist`
  - Groups related `ClinicalVisit`, `ClinicalNote`, `TreatmentPlan`, and `OutcomeMeasure` records
- **Lifecycle:** `Active` ──> `Under Review` ──> `Completed/Discharged` ──> `Dormant`.
- **Security Considerations:** Clinical PHI. Accessible only to authorized clinicians and the specific patient (summary view in portal).

---

### 2.7 Appointment (Scheduling Domain)
- **Purpose:** A calendar reservation of time, practitioner capacity, room/bed, and clinical service.
- **Ownership:** Owned by the `Practice`.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Practice`
  - References `Patient`
  - References `User` (Practitioner)
  - References `ServiceType` / `FeeSchedule`
  - Optionally leads to a `ClinicalVisit`
- **Lifecycle (State Machine):** `Scheduled` ──> `Confirmed` ──> `Arrived` ──> `In Progress` ──> `Completed` ──> `Documentation Completed` (Terminal alternatives: `Cancelled`, `No Show`).
- **Security Considerations:** Clinicians see their calendar schedules; receptionists manage practice-wide calendar; patients view only their own appointments.

---

### 2.8 ClinicalVisit (EMR Domain)
- **Purpose:** The formal clinical encounter between a patient and a physiotherapist.
- **Ownership:** Owned by the attending `Physiotherapist` and `Practice`.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Practice`
  - References `Patient`
  - Optionally links to `EpisodeOfCare`
  - References attending `User` (Physiotherapist)
  - Linked 1:1 or 1:Many with `Appointment`
  - Parent of `ClinicalNote` records and `TreatmentPlan` milestones
- **Lifecycle:** `Initiated` ──> `Conducted` ──> `Signed & Locked`.
- **Security Considerations:** Strictly restricted to clinical roles. Never visible to accountants, billing clerks, or unauthorized staff.

---

### 2.9 ClinicalNote (Medical Documentation)
- **Purpose:** The legal medical record of subjective reporting, objective findings, clinical assessment, and treatment plan (SOAP).
- **Ownership:** Authored by the treating `Physiotherapist`.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `ClinicalVisit`
  - References `Patient`
  - References `author_id` (`User`)
- **Lifecycle:** `Draft` ──> `Finalized/Signed` ──> `Amended` (via auditable addendum).
- **Security Considerations:** Immutable once finalized. In-place edits prohibited. Modifications create versioned history. Deletion prohibited by law; records may only be marked as entered in error with permanent audit reasons.

---

### 2.10 TreatmentPlan (Clinical Rehabilitation Pathway)
- **Purpose:** Long-term clinical rehabilitation roadmap detailing patient goals, target outcomes, prescribed exercise regimens, and scheduled evaluation intervals.
- **Ownership:** Authored by `Physiotherapist`, shared with `Patient`.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Patient`
  - References `EpisodeOfCare`
  - References treating `Physiotherapist`
  - Associated with multiple `ClinicalVisit` milestones
- **Lifecycle:** `Active` ──> `Review Pending` ──> `Achieved` ──> `Discontinued`.
- **Security Considerations:** Patient can view their own prescribed goals and home exercises via the Patient Portal. Clinician notes remain private.

---

### 2.11 Invoice (Billing Domain)
- **Purpose:** The formal, legal accounting document requesting payment for clinical consultations, treatments, products, or prepaid packages.
- **Ownership:** Issued by the `Practice` to the `Patient` or Third-Party Payer (Insurer / Medical Aid).
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Practice`
  - References `Patient`
  - Contains multiple itemized lines (consultations, exercises, equipment)
  - References settled `Payment` records
- **Lifecycle:** `Draft` ──> `Issued` ──> `Partially Paid` ──> `Paid` ──> `Overdue` ──> `Void/Cancelled`.
- **Security Considerations:** Financial accounting record. Once issued, values cannot be silently mutated; changes require formal credit notes or cancellations.

---

### 2.12 Payment (Financial Transaction)
- **Purpose:** A captured monetary settlement against one or more invoices or patient account credit.
- **Ownership:** Received by the `Practice`.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Practice`
  - References `Patient`
  - References target `Invoice` (or unallocated patient wallet balance)
  - Records gateway reference, method (`cash`, `card`, `bank_transfer`, `pos`), and collector `User`
- **Lifecycle:** `Pending` ──> `Successful` ──> `Failed` ──> `Refunded`.
- **Security Considerations:** Financial integrity. Immutable once settled. Partial or full refunds create explicit child transaction records.

---

### 2.13 PatientWallet (Pre-Funded Patient Credit)
- **Purpose:** Represents a practice-specific account holding pre-funded credit, unallocated cash deposits, or overpayment balances on behalf of a patient.
- **Ownership:** Owned by `Patient` within the `Practice`.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Practice`
  - References `Patient` (1:1 per patient per practice)
  - Parent of `WalletTransaction` records
- **Lifecycle:** `Active` ──> `Suspended` ──> `Closed`.
- **Security Considerations:** Denominated in real currency (strictly separated from non-monetary package session counts). Balance derived from verified transaction history.

---

### 2.14 WalletTransaction (Wallet Ledger)
- **Purpose:** Immutable ledger transaction tracking funds credited to, debited from, or refunded through the patient wallet.
- **Ownership:** Maintained by the practice billing subsystem.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `PatientWallet`
  - References `Invoice` (when applied toward paying an invoice)
  - References `Payment` (when funded by an external payment)
  - Records `actor_id` (`User`)
- **Lifecycle:** Immutable append-only (`deposit`, `payment_application`, `refund`, `manual_adjustment`).
- **Security Considerations:** Zero in-place edits. Audit reason required for manual adjustments.

---

### 2.15 Package (Prepaid Treatment Offer)
- **Purpose:** Product definition representing a prepaid block of rehabilitation sessions (e.g. "6-Session Knee Rehabilitation Protocol").
- **Ownership:** Configured by `Practice Owner`.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Practice`
  - Sold via `Invoice`
  - Linked to patient entitlement in `PackageSessionLedger`
- **Lifecycle:** `Active` ──> `Deprecated` ──> `Archived`.
- **Security Considerations:** Practice pricing and commission terms hidden from patients and external queries.

---

### 2.16 PackageSessionLedger (Entitlement Ledger)
- **Purpose:** Ledger tracking the creation, consumption, reversal, and expiration of treatment session units for prepaid packages.
- **Ownership:** Maintained by the system under practice audit rules.
- **Tenant Relationship:** Strictly tenant-scoped (`practice_id`).
- **Important Relationships:**
  - References `Package`
  - References `Patient`
  - References `Appointment` (on debit/consumption)
  - References `Physiotherapist` (delivering practitioner)
- **Lifecycle:** Immutable ledger append-only transactions (`credit_purchase`, `debit_consumption`, `reversal_cancellation`, `expiry_adjustment`).
- **Security Considerations:** Session entitlement is strictly service units, NOT currency. Balance is derived by summing verified ledger transactions.

---

### 2.17 AuditEvent (Security & Governance Trail)
- **Purpose:** Permanent, tamper-evident log capturing critical security, clinical, and financial actions across the tenant.
- **Ownership:** Platform security subsystem.
- **Tenant Relationship:** Tenant-scoped (`practice_id`) or Platform-scoped (null `practice_id` for system-wide administrative actions).
- **Important Relationships:**
  - References `actor_id` (`User`)
  - References target entity type and UUID
- **Lifecycle:** Append-only. Updates and deletions permanently blocked by database rules.
- **Security Considerations:** Critical for compliance, dispute resolution, and security auditing. Readable only by `Practice Owner` and authorized system auditors.

---

### 2.18 Subscription (SaaS Account Status)
- **Purpose:** Governs the commercial B2B relationship between the `Practice` tenant and the Physenra SaaS platform. Completely decoupled from patient treatment packages.
- **Ownership:** Platform Administrator / Physenra Billing.
- **Tenant Relationship:** 1:1 relationship with `Practice`.
- **Important Relationships:**
  - References `Practice`
  - Defines tier, seat limits, storage quotas, and feature flags
- **Lifecycle:** `Trial` ──> `Active` ──> `Past Due` ──> `Suspended` ──> `Cancelled`.
- **Security Considerations:** Enforced at API gateway and middleware. Inactive subscriptions restrict practice access to read-only or renewal interfaces.
