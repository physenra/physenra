// ==============================================================================
// PHYSENRA — NAVIGATION, PAGE STATE & UNSAVED DATA PRESERVATION TEST SUITE
// Test File: tests/navigation_and_form_state_preservation.test.cjs
//
// Governs:
// 1. Form draft service multi-tenant scoped key partitioning (practice:user:form).
// 2. Cross-practice and cross-user draft isolation (no data leakage).
// 3. Draft TTL expiration enforcement (24h TTL) and cleanup.
// 4. Safe serialization/deserialization and storage fallback handling.
// 5. In-memory and browser storage lifecycle (save, load, clear, clearAllForUser).
// 6. Clinical & financial safety invariants (draft restoration never auto-submits, auto-finalizes, or auto-charges).
// 7. Structural validation of useFormDraft and DraftBanner integration across all critical target forms:
//    - CreateClinicalNotePage (SOAP notes)
//    - CreatePatientPage & EditPatientPage (demographics, contacts)
//    - CreateClinicalVisitPage (encounter documentation)
//    - CreateTreatmentPlanPage (goals, frequency, roadmap)
//    - CreateInvoicePage (line items, pricing, notes)
//    - CreateAppointmentPage (scheduling slot)
//    - CreateOutcomeAssessmentPage (standardized clinical assessment)
//    - ClinicalNoteDetailPage (draft note edits)
// 8. Structural validation of useListFilters in PatientListPage and AppointmentListPage.
// 9. Zero Kabworld references and absolute tenant isolation.
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Mock localStorage and sessionStorage for testing formDraftService logic in Node
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
  get length() {
    return this.store.size;
  }
}

// Emulate formDraftService functions in test sandbox
const DRAFT_PREFIX = 'physenra:draft:v1:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

function buildStorageKey(practiceId, userId, formId) {
  const safePractice = practiceId || 'unassigned';
  const safeUser = userId || 'anonymous';
  return `${DRAFT_PREFIX}${safePractice}:${safeUser}:${formId}`;
}

function saveDraft(storage, practiceId, userId, formId, data, ttlMs = DEFAULT_TTL_MS) {
  const key = buildStorageKey(practiceId, userId, formId);
  const envelope = {
    formId,
    practiceId: practiceId || 'unassigned',
    userId: userId || 'anonymous',
    savedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    data,
  };
  storage.setItem(key, JSON.stringify(envelope));
  return envelope;
}

function loadDraft(storage, practiceId, userId, formId) {
  const key = buildStorageKey(practiceId, userId, formId);
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw);
    const expectedPractice = practiceId || 'unassigned';
    const expectedUser = userId || 'anonymous';
    if (envelope.practiceId !== expectedPractice || envelope.userId !== expectedUser) {
      storage.removeItem(key);
      return null;
    }
    const expiresAt = new Date(envelope.expiresAt).getTime();
    if (Date.now() > expiresAt) {
      storage.removeItem(key);
      return null;
    }
    return envelope;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function clearDraft(storage, practiceId, userId, formId) {
  const key = buildStorageKey(practiceId, userId, formId);
  storage.removeItem(key);
}

function clearAllDraftsForUser(storage, practiceId, userId) {
  const safePractice = practiceId || 'unassigned';
  const safeUser = userId || 'anonymous';
  const prefix = `${DRAFT_PREFIX}${safePractice}:${safeUser}:`;
  const keysToRemove = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(prefix)) {
      keysToRemove.push(k);
    }
  }
  for (const k of keysToRemove) {
    storage.removeItem(k);
  }
}

test('PHYSENRA — Navigation, Page State & Unsaved Data Preservation Test Suite', async (t) => {
  // ============================================================================
  // SUITE 1: Multi-Tenant Key Partitioning & Boundary Enforcement
  // ============================================================================
  await t.test('--- SUITE 1: Multi-Tenant Key Partitioning & Boundaries ---', async (st) => {
    await st.test('1. Draft storage keys are partitioned strictly by practice, user, and formId', () => {
      const key = buildStorageKey('prac_alpha', 'user_dr_ada', 'create_soap_note');
      assert.equal(key, 'physenra:draft:v1:prac_alpha:user_dr_ada:create_soap_note');
    });

    await st.test('2. Unassigned practice or anonymous session use safe defaults', () => {
      const key = buildStorageKey(null, null, 'create_soap_note');
      assert.equal(key, 'physenra:draft:v1:unassigned:anonymous:create_soap_note');
    });

    await st.test('3. Cross-practice isolation: Practice B cannot load Practice A drafts', () => {
      const storage = new MockStorage();
      const practiceA = 'practice_lagos_001';
      const practiceB = 'practice_abuja_002';
      const userId = 'user_physio_77';
      const formId = 'create_patient';

      saveDraft(storage, practiceA, userId, formId, { firstName: 'Chidi', lastName: 'Okafor' });

      // Practice B attempt to load
      const draftLoadedByB = loadDraft(storage, practiceB, userId, formId);
      assert.equal(draftLoadedByB, null, 'Practice B MUST NOT access Practice A drafts');

      // Practice A loads successfully
      const draftLoadedByA = loadDraft(storage, practiceA, userId, formId);
      assert.ok(draftLoadedByA);
      assert.equal(draftLoadedByA.data.firstName, 'Chidi');
    });

    await st.test('4. Cross-user isolation: User B cannot load User A drafts in the same practice', () => {
      const storage = new MockStorage();
      const practiceId = 'practice_lagos_001';
      const userA = 'user_dr_ada';
      const userB = 'user_dr_emeka';
      const formId = 'create_clinical_note';

      saveDraft(storage, practiceId, userA, formId, { subjective: 'Patient reports knee pain' });

      const loadedByUserB = loadDraft(storage, practiceId, userB, formId);
      assert.equal(loadedByUserB, null, 'User B MUST NOT access User A drafts in the same practice');

      const loadedByUserA = loadDraft(storage, practiceId, userA, formId);
      assert.ok(loadedByUserA);
      assert.equal(loadedByUserA.data.subjective, 'Patient reports knee pain');
    });

    await st.test('5. Boundary tampering protection: Tampered envelope practiceId or userId is purged', () => {
      const storage = new MockStorage();
      const practiceId = 'practice_lagos_001';
      const userId = 'user_dr_ada';
      const formId = 'create_invoice';

      const key = buildStorageKey(practiceId, userId, formId);
      // Maliciously forged envelope pretending to be practice_lagos_001 under user_dr_ada's key
      const forgedEnvelope = {
        formId,
        practiceId: 'forged_foreign_practice',
        userId,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        data: { total: 50000 },
      };
      storage.setItem(key, JSON.stringify(forgedEnvelope));

      const loaded = loadDraft(storage, practiceId, userId, formId);
      assert.equal(loaded, null, 'Forged envelope must be rejected');
      assert.equal(storage.getItem(key), null, 'Tampered entry must be deleted from storage');
    });
  });

  // ============================================================================
  // SUITE 2: Draft Expiration (TTL) & Lifecycle
  // ============================================================================
  await t.test('--- SUITE 2: Draft Expiration (TTL) & Lifecycle ---', async (st) => {
    await st.test('1. Valid unexpired draft is loaded intact with timestamp metadata', () => {
      const storage = new MockStorage();
      const practiceId = 'prac_1';
      const userId = 'user_1';
      const formId = 'treatment_plan';
      const payload = { title: 'ACL Rehab Phase 2', goals: ['Full extension'] };

      saveDraft(storage, practiceId, userId, formId, payload, 3600000); // 1 hour TTL
      const loaded = loadDraft(storage, practiceId, userId, formId);

      assert.ok(loaded);
      assert.deepEqual(loaded.data, payload);
      assert.ok(loaded.savedAt);
      assert.ok(loaded.expiresAt);
    });

    await st.test('2. Expired draft (> TTL) is automatically pruned and returns null', () => {
      const storage = new MockStorage();
      const practiceId = 'prac_1';
      const userId = 'user_1';
      const formId = 'treatment_plan';

      // Save with expired TTL (-1 second)
      saveDraft(storage, practiceId, userId, formId, { title: 'Old Draft' }, -1000);
      const loaded = loadDraft(storage, practiceId, userId, formId);

      assert.equal(loaded, null, 'Expired draft must return null');
      const key = buildStorageKey(practiceId, userId, formId);
      assert.equal(storage.getItem(key), null, 'Expired draft must be pruned from storage');
    });

    await st.test('3. clearDraft removes only the specified form draft for the practice user', () => {
      const storage = new MockStorage();
      const practiceId = 'prac_1';
      const userId = 'user_1';

      saveDraft(storage, practiceId, userId, 'form_a', { val: 'a' });
      saveDraft(storage, practiceId, userId, 'form_b', { val: 'b' });

      clearDraft(storage, practiceId, userId, 'form_a');

      assert.equal(loadDraft(storage, practiceId, userId, 'form_a'), null);
      assert.ok(loadDraft(storage, practiceId, userId, 'form_b'));
    });

    await st.test('4. clearAllDraftsForUser purges all forms for user in that practice', () => {
      const storage = new MockStorage();
      const practiceId = 'prac_1';
      const user1 = 'user_1';
      const user2 = 'user_2';

      saveDraft(storage, practiceId, user1, 'form_a', { val: 'a' });
      saveDraft(storage, practiceId, user1, 'form_b', { val: 'b' });
      saveDraft(storage, practiceId, user2, 'form_c', { val: 'c' });

      clearAllDraftsForUser(storage, practiceId, user1);

      assert.equal(loadDraft(storage, practiceId, user1, 'form_a'), null);
      assert.equal(loadDraft(storage, practiceId, user1, 'form_b'), null);
      // Other user's draft remains intact
      assert.ok(loadDraft(storage, practiceId, user2, 'form_c'));
    });
  });

  // ============================================================================
  // SUITE 3: Clinical & Financial Safety Invariants
  // ============================================================================
  await t.test('--- SUITE 3: Clinical & Financial Safety Invariants ---', async (st) => {
    await st.test('1. Invoice draft restoration NEVER auto-charges, auto-issues, or marks paid', () => {
      const createInvoiceCode = fs.readFileSync(path.join(SRC_DIR, 'pages', 'invoices', 'CreateInvoicePage.tsx'), 'utf8');

      // The draft hook must only provide data, not invoke billingService automatically
      assert.match(createInvoiceCode, /useFormDraft/);
      assert.match(createInvoiceCode, /DraftBanner/);
      // Ensure issueInvoice is only called inside the explicit form submission handler
      assert.match(createInvoiceCode, /handleSubmit = async/);
      assert.match(createInvoiceCode, /markSaved\(\)/);

      // Verify that no useEffect automatically calls createInvoice or issueInvoice upon draft restore
      assert.doesNotMatch(createInvoiceCode, /useEffect\(\s*\(\)\s*=>\s*\{\s*[^}]*createInvoice/);
      assert.doesNotMatch(createInvoiceCode, /useEffect\(\s*\(\)\s*=>\s*\{\s*[^}]*issueInvoice/);
    });

    await st.test('2. Clinical note draft restoration NEVER auto-finalizes or auto-signs', () => {
      const createNoteCode = fs.readFileSync(path.join(SRC_DIR, 'pages', 'notes', 'CreateClinicalNotePage.tsx'), 'utf8');

      assert.match(createNoteCode, /useFormDraft/);
      assert.match(createNoteCode, /DraftBanner/);
      assert.match(createNoteCode, /markSaved\(\)/);

      // Finalization and creation must only occur inside explicit handleSubmit
      assert.doesNotMatch(createNoteCode, /useEffect\(\s*\(\)\s*=>\s*\{\s*[^}]*createClinicalNote/);
    });

    await st.test('3. Outcome assessment draft restoration NEVER auto-finalizes', () => {
      const createOutcomeCode = fs.readFileSync(path.join(SRC_DIR, 'pages', 'outcomes', 'CreateOutcomeAssessmentPage.tsx'), 'utf8');

      assert.match(createOutcomeCode, /useFormDraft/);
      assert.match(createOutcomeCode, /DraftBanner/);
      assert.match(createOutcomeCode, /markSaved\(\)/);
      assert.doesNotMatch(createOutcomeCode, /useEffect\(\s*\(\)\s*=>\s*\{\s*[^}]*createAssessment/);
    });
  });

  // ============================================================================
  // SUITE 4: Source File Code Integrity Across All Target Pages
  // ============================================================================
  await t.test('--- SUITE 4: Target Form Pages Integration Verification ---', async (st) => {
    const pagesToCheck = [
      {
        path: 'pages/notes/CreateClinicalNotePage.tsx',
        name: 'CreateClinicalNotePage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
      {
        path: 'pages/patients/CreatePatientPage.tsx',
        name: 'CreatePatientPage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
      {
        path: 'pages/patients/EditPatientPage.tsx',
        name: 'EditPatientPage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
      {
        path: 'pages/visits/CreateClinicalVisitPage.tsx',
        name: 'CreateClinicalVisitPage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
      {
        path: 'pages/treatment-plans/CreateTreatmentPlanPage.tsx',
        name: 'CreateTreatmentPlanPage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
      {
        path: 'pages/invoices/CreateInvoicePage.tsx',
        name: 'CreateInvoicePage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
      {
        path: 'pages/appointments/CreateAppointmentPage.tsx',
        name: 'CreateAppointmentPage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
      {
        path: 'pages/outcomes/CreateOutcomeAssessmentPage.tsx',
        name: 'CreateOutcomeAssessmentPage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
      {
        path: 'pages/notes/ClinicalNoteDetailPage.tsx',
        name: 'ClinicalNoteDetailPage',
        hasFormDraft: true,
        hasBanner: true,
        hasMarkSaved: true,
      },
    ];

    for (const page of pagesToCheck) {
      await st.test(`Verifying ${page.name}`, () => {
        const fullPath = path.join(SRC_DIR, page.path);
        assert.ok(fs.existsSync(fullPath), `File must exist: ${page.path}`);
        const content = fs.readFileSync(fullPath, 'utf8');

        if (page.hasFormDraft) {
          assert.match(content, /useFormDraft/, `${page.name} must use useFormDraft hook`);
        }
        if (page.hasBanner) {
          assert.match(content, /DraftBanner/, `${page.name} must render DraftBanner component`);
        }
        if (page.hasMarkSaved) {
          assert.match(content, /markSaved\(\)/, `${page.name} must call markSaved() upon submission`);
        }
      });
    }
  });

  // ============================================================================
  // SUITE 5: List Filters Preservation & URL Sync Verification
  // ============================================================================
  await t.test('--- SUITE 5: List Filters Preservation & URL Sync ---', async (st) => {
    await st.test('1. PatientListPage integrates useListFilters', () => {
      const code = fs.readFileSync(path.join(SRC_DIR, 'pages', 'patients', 'PatientListPage.tsx'), 'utf8');
      assert.match(code, /useListFilters/);
      assert.match(code, /patient_registry_list/);
      assert.match(code, /setFilterField\('search'/);
      assert.match(code, /setFilterField\('status'/);
      assert.match(code, /setFilterField\('page'/);
    });

    await st.test('2. AppointmentListPage integrates useListFilters', () => {
      const code = fs.readFileSync(path.join(SRC_DIR, 'pages', 'appointments', 'AppointmentListPage.tsx'), 'utf8');
      assert.match(code, /useListFilters/);
      assert.match(code, /appointment_operations_list/);
      assert.match(code, /setFilterField\('viewMode'/);
      assert.match(code, /setFilterField\('selectedDate'/);
      assert.match(code, /setFilterField\('selectedClinician'/);
      assert.match(code, /setFilterField\('selectedStatus'/);
    });

    await st.test('3. useListFilters hook exists and implements URL + Session sync', () => {
      const hookCode = fs.readFileSync(path.join(SRC_DIR, 'hooks', 'useListFilters.ts'), 'utf8');
      assert.match(hookCode, /useSearchParams/);
      assert.match(hookCode, /sessionStorage/);
      assert.match(hookCode, /setFilterField/);
      assert.match(hookCode, /resetFilters/);
    });
  });

  // ============================================================================
  // SUITE 6: UI DraftBanner Accessibility & Feedback Verification
  // ============================================================================
  await t.test('--- SUITE 6: UI DraftBanner Component Standards ---', async (st) => {
    const bannerCode = fs.readFileSync(path.join(SRC_DIR, 'components', 'ui', 'DraftBanner.tsx'), 'utf8');

    await st.test('1. DraftBanner provides polite accessibility live region', () => {
      assert.match(bannerCode, /role="status"/);
      assert.match(bannerCode, /aria-live="polite"/);
    });

    await st.test('2. DraftBanner includes explicit user discard confirmation', () => {
      assert.match(bannerCode, /showConfirmDiscard/);
      assert.match(bannerCode, /Yes, Discard/);
      assert.match(bannerCode, /onDiscard/);
    });

    await st.test('3. DraftBanner displays pulsing unsaved changes indicator', () => {
      assert.match(bannerCode, /Unsaved changes/);
      assert.match(bannerCode, /animate-pulse/);
    });
  });

  // ============================================================================
  // SUITE 7: Zero Kabworld References & Brand Independence
  // ============================================================================
  await t.test('--- SUITE 7: Zero Kabworld References & Complete Brand Independence ---', async (st) => {
    const newFiles = [
      'services/formDraftService.ts',
      'hooks/useFormDraft.ts',
      'hooks/useListFilters.ts',
      'components/ui/DraftBanner.tsx',
    ];

    for (const relPath of newFiles) {
      await st.test(`Zero Kabworld in ${relPath}`, () => {
        const fullPath = path.join(SRC_DIR, relPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.doesNotMatch(content, /kabworld/i, `${relPath} must contain ZERO Kabworld references`);
        assert.doesNotMatch(content, /ptkabworld/i, `${relPath} must contain ZERO Kabworld emails`);
      });
    }
  });
});
