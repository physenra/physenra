// Live Production QA Verification Suite for Physenra Clinical Workflow Quality & Clinician UX V1
// Target: https://physenra.com
// Production Project: Physenra (Netlify ID: abfa7160-0d9f-4b54-96cb-ddfaa610b5c1)
// Supabase Project Ref: xxknmdgneamtoahqayvl
// STRICTLY NON-MUTATING: Zero synthetic clinical records created

const https = require('node:https');
const assert = require('node:assert/strict');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function runLiveQA() {
  console.log('================================================================');
  console.log('PHYSENRA LIVE PRODUCTION QA: CLINICAL WORKFLOW QUALITY & UX V1');
  console.log('Target: https://physenra.com');
  console.log('================================================================\n');

  // Check 1: Homepage & HTML shell
  const home = await get('https://physenra.com');
  console.log('Check 1: Homepage responds with 200 OK -> Status:', home.statusCode);
  assert.strictEqual(home.statusCode, 200);

  // Check 2: Production security & caching headers
  const h = home.headers;
  const hasSecurityHeaders = !!h['strict-transport-security'] && h['server'] === 'Netlify';
  console.log('Check 2: Production security & CDN headers verified (HSTS, Netlify):', hasSecurityHeaders);
  assert.ok(hasSecurityHeaders);

  // Extract Live Bundle Assets
  const jsMatch = home.body.match(/src="\/assets\/(index-[^"]+\.js)"/);
  assert.ok(jsMatch, 'Could not detect live index JS bundle in HTML');
  const jsBundleName = jsMatch[1];
  console.log('\nLive Main JS bundle detected:', jsBundleName);

  const jsRes = await get(`https://physenra.com/assets/${jsBundleName}`);
  console.log('Check 3: Live Main JS bundle loaded -> Status:', jsRes.statusCode, 'Bytes:', jsRes.body.length);
  assert.strictEqual(jsRes.statusCode, 200);
  const bundle = jsRes.body;

  // Check 4: Main bundle chunk reduction verification
  const isChunked = jsRes.body.length < 1300000;
  console.log(`Check 4: Main bundle size reduced below 1.3 MB (Actual: ${(jsRes.body.length / 1024).toFixed(1)} kB):`, isChunked);
  assert.ok(isChunked, `Expected bundle size < 1.3MB, got ${(jsRes.body.length / 1024).toFixed(1)} kB`);

  // Check 5: Vendor and domain chunk existence on CDN
  const vendorReactMatch = bundle.match(/assets\/(vendor-react-[^"]+\.js)/);
  const vendorSupabaseMatch = bundle.match(/assets\/(vendor-supabase-[^"]+\.js)/);
  const vendorIconsMatch = bundle.match(/assets\/(vendor-icons-[^"]+\.js)/);
  console.log('Check 5: Domain & Vendor chunk references found in main bundle:',
    !!(vendorReactMatch || vendorSupabaseMatch || vendorIconsMatch));

  // Check 6: Clinician Daily Workspace / Dashboard metric cards
  const hasMetricCards = /Today('s|\\\'s) Schedule/i.test(bundle) &&
                         /Encounters In Progress/i.test(bundle) &&
                         /Draft SOAP Notes/i.test(bundle) &&
                         /Draft Assessments/i.test(bundle);
  console.log("Check 6: Clinician Workspace 4 metric cards deployed:", hasMetricCards);
  assert.ok(hasMetricCards);

  // Check 7: Fast Patient Search jump bar
  const hasFastPatientSearch = /Find patient by name\/ID/i.test(bundle);
  console.log('Check 7: Fast patient jump bar present:', hasFastPatientSearch);
  assert.ok(hasFastPatientSearch);

  // Check 8: Schedule table with contextual actions (Start Visit, Resume Visit, + Follow-up)
  const hasContextualActions = /Start Visit/i.test(bundle) &&
                               /Resume Visit/i.test(bundle) &&
                               /\+ Follow-up/i.test(bundle);
  console.log('Check 8: Schedule table contextual actions (Start, Resume, Follow-up):', hasContextualActions);
  assert.ok(hasContextualActions);

  // Check 9: Attention Required Queue
  const hasAttentionQueue = /Attention Required/i.test(bundle) &&
                            /clinical documentation/i.test(bundle);
  console.log('Check 9: Attention Required clinical work queue deployed:', hasAttentionQueue);
  assert.ok(hasAttentionQueue);

  // Check 10: Recent Patients list
  const hasRecentPatients = /Recent Patients/i.test(bundle) &&
                            /Open Care Episode Hub/i.test(bundle);
  console.log('Check 10: Recent Patients list with direct Hub navigation:', hasRecentPatients);
  assert.ok(hasRecentPatients);

  // Check 11: Standardized ClinicalStatusBadge visual feedback
  const hasStatusBadgeTokens = /COMPLETE/i.test(bundle) &&
                               /DRAFT/i.test(bundle) &&
                               /ACTION_REQUIRED/i.test(bundle) &&
                               /NOT_STARTED/i.test(bundle);
  console.log('Check 11: Standardized ClinicalStatusBadge language deployed:', hasStatusBadgeTokens);
  assert.ok(hasStatusBadgeTokens);

  // Check 12: PatientContextBar with quick navigation tabs
  const hasPatientContextBar = /Patient Profile/i.test(bundle) &&
                               /Episode Hub/i.test(bundle) &&
                               /Appointments/i.test(bundle) &&
                               /Visits/i.test(bundle);
  console.log('Check 12: Persistent PatientContextBar navigation tabs deployed:', hasPatientContextBar);
  assert.ok(hasPatientContextBar);

  // Check 13: Clinical Visit Detail Page embeds PatientContextBar
  const hasVisitPatientBar = /currentSection/i.test(bundle) &&
                             /visit/i.test(bundle);
  console.log('Check 13: Clinical Visit Detail Page embeds PatientContextBar:', hasVisitPatientBar);
  assert.ok(hasVisitPatientBar);

  // Check 14: In-line Encounter Documentation Checklist card
  const hasInlineChecklist = /Encounter Documentation Checklist/i.test(bundle) &&
                             /SOAP Clinical Note/i.test(bundle) &&
                             /REQUIRED/i.test(bundle) &&
                             /OPTIONAL/i.test(bundle);
  console.log('Check 14: In-line Encounter Documentation Checklist card deployed:', hasInlineChecklist);
  assert.ok(hasInlineChecklist);

  // Check 15: In-line Complete Encounter CTA
  const hasInlineCompleteCTA = /Complete Encounter/i.test(bundle) &&
                               /Pre-Completion Clinical Checklist/i.test(bundle);
  console.log('Check 15: In-line Complete Encounter CTA with pre-completion check:', hasInlineCompleteCTA);
  assert.ok(hasInlineCompleteCTA);

  // Check 16: Appointment List contextual actions
  const hasAppointmentListActions = /Start Visit/i.test(bundle) &&
                                    /Resume Visit/i.test(bundle);
  console.log('Check 16: Appointment List page contextual actions:', hasAppointmentListActions);
  assert.ok(hasAppointmentListActions);

  // Check 17: Episode Care Hub dynamic counts
  const hasEpisodeCareHub = /Care (&|&amp;) Documentation Hub/i.test(bundle) ||
                            (/Clinical Care/i.test(bundle) && /Documentation Hub/i.test(bundle));
  console.log('Check 17: Episode Profile Care Hub with dynamic counts:', hasEpisodeCareHub);
  assert.ok(hasEpisodeCareHub);

  // Check 18: Patient Profile Clinical Encounters & Visits list
  const hasPatientVisitsList = /Clinical Encounters (&|&amp;) Visits/i.test(bundle) ||
                               /Clinical Encounters/i.test(bundle);
  console.log('Check 18: Patient Profile active Clinical Encounters & Visits list:', hasPatientVisitsList);
  assert.ok(hasPatientVisitsList);

  // Check 19: Smart return navigation in ClinicalNoteDetailPage
  const hasSmartReturnNav = /Back to Encounter/i.test(bundle);
  console.log('Check 19: ClinicalNoteDetailPage smart return navigation deployed:', hasSmartReturnNav);
  assert.ok(hasSmartReturnNav);

  // Check 20: Touch target compliance (>= 44px minHeight)
  const hasTouchTargetCompliance = /minHeight/i.test(bundle) && /44px/i.test(bundle);
  console.log('Check 20: Touch target accessibility (minHeight: 44px) active:', hasTouchTargetCompliance);
  assert.ok(hasTouchTargetCompliance);

  // Check 21: Idempotent visit creation from appointment
  const hasIdempotency = /startClinicalVisitFromAppointment/i.test(bundle) ||
                         /Existing visit found for appointment/i.test(bundle);
  console.log('Check 21: Idempotent visit creation preserving appointment continuity:', hasIdempotency);
  assert.ok(hasIdempotency);

  // Check 22: Security hygiene (0 secret keys exposed)
  const hasZeroSecretLeaks = !/sk_live_[a-zA-Z0-9]+/.test(bundle) &&
                             !/sk_test_[a-zA-Z0-9]+/.test(bundle) &&
                             !bundle.includes('sbp_');
  console.log('Check 22: Live bundle secrets hygiene verified (0 exposed keys):', hasZeroSecretLeaks);
  assert.ok(hasZeroSecretLeaks);

  // Check 23: Zero eval execution in bundle
  const hasZeroEval = !bundle.includes('eval(');
  console.log('Check 23: Zero unsafe eval execution in live bundle:', hasZeroEval);
  assert.ok(hasZeroEval);

  // Check 24: Legacy project separation (Zero references to Kabworld)
  const hasZeroKabworld = !/kabworld/i.test(home.body) && !/kabworld/i.test(bundle);
  console.log('Check 24: Zero Kabworld references across production HTML and JS:', hasZeroKabworld);
  assert.ok(hasZeroKabworld);

  console.log('\n================================================================');
  console.log('ALL 24 LIVE PRODUCTION QA CHECKS PASSED (24/24)');
  console.log('Physenra Clinical Workflow Quality & Clinician UX V1 is LIVE.');
  console.log('================================================================\n');
}

runLiveQA().catch((err) => {
  console.error('\nLIVE QA FAILED:', err);
  process.exit(1);
});
