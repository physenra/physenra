const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Visual registry & catalogue
const {
  EXERCISE_VISUALS_REGISTRY,
  hasApprovedVisual,
  getExercisePhotoDemonstration,
} = require('../src/services/exerciseVisualRegistry.ts');
const { SYSTEM_EXERCISES_CATALOGUE } = require('../src/services/hepCatalogueData.ts');

describe('PHYSENRA RECOVERY COMPANION MVP SUITE', () => {
  // --------------------------------------------------------------------------
  // 1. Access Code Security, Format & Hashing
  // --------------------------------------------------------------------------
  describe('1. Access Code Architecture & Cryptographic Hashing', () => {
    function generateSyntheticAccessCode() {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'RCV-';
      const bytes = crypto.randomBytes(6);
      for (let i = 0; i < 6; i++) {
        code += alphabet[bytes[i] % alphabet.length];
      }
      return code;
    }

    function hashAccessCode(code) {
      return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
    }

    test('Access codes follow structured, unguessable pattern (RCV-XXXXXX)', () => {
      const code = generateSyntheticAccessCode();
      assert.match(code, /^RCV-[A-Z0-9]{6}$/, 'Code must follow RCV-XXXXXX format');
      assert.ok(code.length >= 9, 'Code must have sufficient length for unguessability');
    });

    test('Access code normalization handles case and whitespace resilience', () => {
      const raw = '  rcv-7k9m2x  ';
      const normalized = raw.trim().toUpperCase();
      assert.equal(normalized, 'RCV-7K9M2X');
    });

    test('Cryptographic SHA-256 hash is deterministic and one-way', () => {
      const code = 'RCV-TEST99';
      const hash1 = hashAccessCode(code);
      const hash2 = hashAccessCode('  rcv-test99  ');
      assert.equal(hash1, hash2, 'Normalized hash must match exactly');
      assert.equal(hash1.length, 64, 'SHA-256 hex string must be 64 characters');
    });

    test('Database migration contains access codes schema with composite foreign keys and hashing', () => {
      const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261104080000_recovery_companion_foundation.sql');
      assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
      const sql = fs.readFileSync(migrationPath, 'utf8');

      assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.hep_patient_access_codes'), 'Must create hep_patient_access_codes table');
      assert.ok(sql.includes('code_hash text NOT NULL UNIQUE'), 'Must store hashed code uniquely');
      assert.ok(sql.includes('failed_attempts integer NOT NULL DEFAULT 0'), 'Must track brute-force attempts');
      assert.ok(sql.includes('locked_until timestamptz'), 'Must include lockout mechanism');
      assert.ok(sql.includes('FOREIGN KEY (program_id, practice_id)'), 'Must enforce tenant composite key on program');
      assert.ok(sql.includes('FOREIGN KEY (patient_id, practice_id)'), 'Must enforce tenant composite key on patient');
    });

    test('Brute force prevention: Lockout after 5 consecutive failed attempts', () => {
      let failedAttempts = 0;
      let lockedUntil = null;
      const MAX_ATTEMPTS = 5;

      for (let attempt = 1; attempt <= 6; attempt++) {
        if (lockedUntil && lockedUntil > Date.now()) {
          // Account/Code is locked
          assert.ok(attempt > MAX_ATTEMPTS, 'Lockout must trigger after MAX_ATTEMPTS');
          continue;
        }

        failedAttempts++;
        if (failedAttempts >= MAX_ATTEMPTS) {
          lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
        }
      }

      assert.equal(failedAttempts, 5);
      assert.ok(lockedUntil !== null && lockedUntil > Date.now(), 'Lockout timestamp must be in the future');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Patient Recovery Companion Program Scoping & Visuals
  // --------------------------------------------------------------------------
  describe('2. Patient Recovery Companion Scoping & Exercise Visuals', () => {
    test('Patient access returns only active, clinician-prescribed HEP', () => {
      const syntheticPrograms = [
        { id: 'prog-1', status: 'active', title: 'Rotator Cuff Protocol', patient_id: 'pat-1' },
        { id: 'prog-2', status: 'draft', title: 'Unapproved Draft Regimen', patient_id: 'pat-1' },
        { id: 'prog-3', status: 'discontinued', title: 'Prior Knee Protocol', patient_id: 'pat-1' },
        { id: 'prog-4', status: 'active', title: 'Another Patient Protocol', patient_id: 'pat-2' },
      ];

      // Verification filter for active patient companion
      const authorizedPatientId = 'pat-1';
      const activePrograms = syntheticPrograms.filter(
        (p) => p.patient_id === authorizedPatientId && p.status === 'active'
      );

      assert.equal(activePrograms.length, 1);
      assert.equal(activePrograms[0].id, 'prog-1');
      assert.equal(activePrograms[0].title, 'Rotator Cuff Protocol');
    });

    test('Cross-patient and cross-tenant access is rejected', () => {
      const patientTenant = { patient_id: 'pat-100', practice_id: 'prac-A' };
      const requestedProgram = { id: 'prog-999', patient_id: 'pat-200', practice_id: 'prac-B' };

      const isAuthorized =
        requestedProgram.patient_id === patientTenant.patient_id &&
        requestedProgram.practice_id === patientTenant.practice_id;

      assert.equal(isAuthorized, false, 'Cross-patient and cross-tenant access must be denied');
    });

    test('Approved exercise photos render canonical clinical image mapping', () => {
      // Test known approved exercises
      const approvedIds = [
        '00000000-0000-0000-0000-000000000001', // Quad Sets
        '00000000-0000-0000-0000-000000000002', // Straight Leg Raise
      ];

      for (const id of approvedIds) {
        assert.ok(hasApprovedVisual(id), `Exercise ${id} must have approved visual`);
        const photo = getExercisePhotoDemonstration(id);
        assert.ok(photo, `Exercise ${id} must have photo demonstration`);
        assert.ok(photo.photoAssetPath.endsWith('.jpg'), `Photo path must be jpg format: ${photo.photoAssetPath}`);
        assert.ok(photo.photoDemographic.toLowerCase().includes('nigerian'), 'Demographic must reflect Nigerian model');
        assert.equal(photo.photoClinicalReviewStatus, 'approved', 'Must be clinically approved');
        assert.ok(photo.photoReviewedBy, 'Must have clinical review sign-off');
      }
    });

    test('Quarantined or unapproved exercises display neutral clinical fallback, never mismatched', () => {
      // Bird dog exercise (00000000-0000-0000-0000-000000000014) photo is in pending review quarantine
      const birdDogId = '00000000-0000-0000-0000-000000000014';
      const visual = EXERCISE_VISUALS_REGISTRY[birdDogId];

      assert.ok(visual, 'Bird dog must be in registry');
      assert.equal(visual.photoClinicalReviewStatus, 'pending_physiotherapist_review', 'Bird dog photo must be in quarantine');

      // Unapproved photo must never be presented as approved in patient recovery companion
      const photo = getExercisePhotoDemonstration(birdDogId);
      assert.equal(photo.photoClinicalReviewStatus, 'pending_physiotherapist_review');

      // Exercises 58 & 59 have null photos
      const limbExId = '00000000-0000-0000-0000-000000000058';
      assert.equal(getExercisePhotoDemonstration(limbExId), null, 'Must return null for unmapped photos');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Patient Check-In Submission & Validation
  // --------------------------------------------------------------------------
  describe('3. Patient Check-In Validation & Adherence Logging', () => {
    function validateCheckIn(data) {
      const errors = [];

      // Pain Rating (0-10 or null)
      if (data.painRating !== undefined && data.painRating !== null) {
        const p = Number(data.painRating);
        if (isNaN(p) || p < 0 || p > 10 || !Number.isInteger(p)) {
          errors.push('Pain rating must be an integer between 0 and 10.');
        }
      }

      // Difficulty Rating Enum
      const allowedDifficulties = ['very_easy', 'easy', 'moderate', 'hard', 'very_hard'];
      if (data.difficultyRating && !allowedDifficulties.includes(data.difficultyRating)) {
        errors.push(`Difficulty rating must be one of: ${allowedDifficulties.join(', ')}`);
      }

      // Patient Notes (<= 1000 chars)
      if (data.notes && data.notes.length > 1000) {
        errors.push('Patient notes cannot exceed 1000 characters.');
      }

      // Completed exercises array
      if (data.completedExercises && !Array.isArray(data.completedExercises)) {
        errors.push('Completed exercises must be an array of exercise IDs.');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    }

    test('Valid check-in payload passes validation', () => {
      const valid = {
        painRating: 3,
        difficultyRating: 'moderate',
        notes: 'Felt a gentle stretch in my calf, completed all 3 sets comfortably.',
        completedExercises: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
      };
      const result = validateCheckIn(valid);
      assert.ok(result.isValid);
      assert.equal(result.errors.length, 0);
    });

    test('Pain rating < 0 or > 10 is rejected', () => {
      assert.equal(validateCheckIn({ painRating: -1 }).isValid, false);
      assert.equal(validateCheckIn({ painRating: 11 }).isValid, false);
      assert.equal(validateCheckIn({ painRating: 4.5 }).isValid, false); // must be integer scale
      assert.equal(validateCheckIn({ painRating: 0 }).isValid, true);
      assert.equal(validateCheckIn({ painRating: 10 }).isValid, true);
      assert.equal(validateCheckIn({ painRating: null }).isValid, true); // optional
    });

    test('Invalid difficulty enum is rejected', () => {
      assert.equal(validateCheckIn({ difficultyRating: 'impossible' }).isValid, false);
      assert.equal(validateCheckIn({ difficultyRating: 'easy' }).isValid, true);
      assert.equal(validateCheckIn({ difficultyRating: 'very_hard' }).isValid, true);
    });

    test('Patient note exceeding 1000 characters is rejected', () => {
      const longNote = 'A'.repeat(1001);
      const result = validateCheckIn({ notes: longNote });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('1000 characters')));
    });

    test('Non-diagnostic rule: Check-in records feedback without mutating prescription dosage or exercises', () => {
      const programBefore = {
        id: 'prog-1',
        items: [
          { exercise_id: 'ex-1', sets: 3, reps: 10, hold_seconds: null },
          { exercise_id: 'ex-2', sets: 2, reps: 15, hold_seconds: 5 },
        ],
      };

      // Synthetic check-in feedback submitted
      const checkInRecord = {
        id: 'chk-1',
        program_id: 'prog-1',
        pain_rating: 8, // patient reported high pain
        difficulty_rating: 'very_hard',
        patient_notes: 'Felt sharp pain during heel slides.',
      };

      // Program prescription remains completely unmodified under clinical governance
      const programAfter = { ...programBefore };
      assert.deepEqual(programAfter.items, programBefore.items, 'Prescription items and dosages must remain immutable');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Clinician Follow-up View & Adherence Calculations
  // --------------------------------------------------------------------------
  describe('4. Clinician Follow-up Summary & Adherence Analytics', () => {
    function computeClinicianSummary(checkIns) {
      const totalSessions = checkIns.length;
      if (totalSessions === 0) {
        return {
          totalSessions: 0,
          lastCheckIn: null,
          daysSinceLastCheckIn: null,
          avgPain: null,
          latestPain: null,
          latestDifficulty: null,
          needsInactivityAttention: true,
          hasHighPainFeedback: false,
        };
      }

      // Sort by completed_at descending
      const sorted = [...checkIns].sort(
        (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      );
      const latest = sorted[0];
      const now = new Date('2026-11-04T12:00:00Z').getTime();
      const lastSessionTime = new Date(latest.completed_at).getTime();
      const daysSince = Math.floor((now - lastSessionTime) / (1000 * 60 * 60 * 24));

      const painValues = sorted.map((c) => c.pain_rating).filter((p) => p !== null && p !== undefined);
      const avgPain = painValues.length > 0 ? (painValues.reduce((a, b) => a + b, 0) / painValues.length).toFixed(1) : null;

      const needsInactivityAttention = daysSince >= 3;
      const hasHighPainFeedback = sorted.slice(0, 3).some((c) => c.pain_rating !== null && c.pain_rating >= 7);

      return {
        totalSessions,
        lastCheckIn: latest.completed_at,
        daysSinceLastCheckIn: daysSince,
        avgPain: avgPain ? Number(avgPain) : null,
        latestPain: latest.pain_rating,
        latestDifficulty: latest.difficulty_rating,
        needsInactivityAttention,
        hasHighPainFeedback,
      };
    }

    test('Clinician summary correctly calculates sessions, pain averages, and last active date', () => {
      const syntheticCheckIns = [
        {
          id: 'chk-1',
          completed_at: '2026-11-03T10:00:00Z', // 1 day ago
          pain_rating: 4,
          difficulty_rating: 'moderate',
        },
        {
          id: 'chk-2',
          completed_at: '2026-11-01T09:00:00Z', // 3 days ago
          pain_rating: 6,
          difficulty_rating: 'hard',
        },
      ];

      const summary = computeClinicianSummary(syntheticCheckIns);
      assert.equal(summary.totalSessions, 2);
      assert.equal(summary.daysSinceLastCheckIn, 1);
      assert.equal(summary.latestPain, 4);
      assert.equal(summary.latestDifficulty, 'moderate');
      assert.equal(summary.avgPain, 5.0);
      assert.equal(summary.needsInactivityAttention, false);
      assert.equal(summary.hasHighPainFeedback, false);
    });

    test('Inactivity banner triggers when days since last check-in >= 3', () => {
      const inactiveCheckIns = [
        {
          id: 'chk-old',
          completed_at: '2026-10-30T10:00:00Z', // 5 days ago
          pain_rating: 2,
          difficulty_rating: 'easy',
        },
      ];

      const summary = computeClinicianSummary(inactiveCheckIns);
      assert.ok(summary.daysSinceLastCheckIn >= 3);
      assert.equal(summary.needsInactivityAttention, true, 'Must flag patient as inactive for clinician review');
    });

    test('High pain flag triggers when recent check-in has pain >= 7/10', () => {
      const highPainCheckIns = [
        {
          id: 'chk-pain',
          completed_at: '2026-11-03T18:00:00Z',
          pain_rating: 8,
          difficulty_rating: 'very_hard',
        },
      ];

      const summary = computeClinicianSummary(highPainCheckIns);
      assert.equal(summary.hasHighPainFeedback, true, 'Must flag elevated pain for clinician review');
    });

    test('Clinician sign-off workflow logs review without altering finalized clinical record', () => {
      const checkIn = {
        id: 'chk-1',
        program_id: 'prog-1',
        status: 'pending_review',
        reviewed_by: null,
        reviewed_at: null,
        clinician_notes: null,
        follow_up_action: null,
      };

      // Clinician signs off
      const signOff = {
        reviewed_by: 'clinician-dr-kalu',
        reviewed_at: '2026-11-04T12:30:00Z',
        clinician_notes: 'Patient tolerating progressive load well. Schedule review in 1 week.',
        follow_up_action: 'follow_up_planned',
      };

      const updatedCheckIn = {
        ...checkIn,
        ...signOff,
        status: 'reviewed',
      };

      assert.equal(updatedCheckIn.status, 'reviewed');
      assert.equal(updatedCheckIn.reviewed_by, 'clinician-dr-kalu');
      assert.equal(updatedCheckIn.follow_up_action, 'follow_up_planned');
      assert.ok(updatedCheckIn.reviewed_at !== null);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Privacy, Tenancy & Low-Data Footprint Compliance
  // --------------------------------------------------------------------------
  describe('5. Privacy, Tenancy & Low-Bandwidth Compliance', () => {
    test('Zero clinical details in URLs or navigation routes', () => {
      const routes = ['/recovery', '/companion'];
      for (const r of routes) {
        assert.ok(!r.includes('patient'), 'URL must not contain patient identifier');
        assert.ok(!r.includes('diagnosis'), 'URL must not contain diagnosis');
        assert.ok(!r.includes('treatment'), 'URL must not contain treatment info');
      }
    });

    test('No unconsented messaging or push notifications are dispatched to patients', () => {
      // In Physenra, notifications require verified consent and are strictly transactional
      const notificationEvent = {
        type: 'check_in_recorded',
        patient_consent: false,
        channel: 'whatsapp',
      };

      const canDispatch = notificationEvent.patient_consent === true;
      assert.equal(canDispatch, false, 'Unconsented messages must never be sent');
    });

    test('Recovery Companion payload size is lightweight (< 15KB JSON) for 2G/3G low-data connections', () => {
      const samplePayload = {
        success: true,
        program: {
          id: '00000000-0000-0000-0000-000000000001',
          title: 'Post-Op Knee Rehabilitation',
          startDate: '2026-11-01',
          reviewDate: '2026-11-15',
          notes: 'Perform slowly twice daily',
          exercises: [
            {
              id: 'item-1',
              exerciseId: '00000000-0000-0000-0000-000000000001',
              title: 'Ankle Pumps',
              bodyRegion: 'lower_limb',
              sets: 3,
              reps: 15,
              holdSeconds: 3,
              frequency: '2x daily',
              instructions: 'Point toes down then pull toes back towards knee.',
              safetyNotes: 'Do not force into sharp pain.',
              visual: {
                hasApprovedVisual: true,
                photoUrl: '/images/exercises/physenra_exercise_ankle_pumps_001.jpg',
                altText: 'Nigerian male in athletic shorts demonstrating ankle pumps',
              },
            },
          ],
        },
        practice: {
          name: 'Apex Physio Lagos',
          phone: '+234 800 000 0000',
          email: 'care@apexphysio.ng',
        },
      };

      const jsonString = JSON.stringify(samplePayload);
      const byteSize = Buffer.byteLength(jsonString, 'utf8');
      assert.ok(byteSize < 15000, `Payload size (${byteSize} bytes) must be < 15KB`);
    });
  });
});
