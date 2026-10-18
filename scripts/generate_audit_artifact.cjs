const fs = require('fs');
const path = require('path');
const { SYSTEM_EXERCISES_CATALOGUE } = require('../src/services/hepCatalogueData.ts');
const { EXERCISE_VISUALS_REGISTRY, getExercisePhotoDemonstration } = require('../src/services/exerciseVisualRegistry.ts');

const artifactPath = 'C:/Users/Surface/.gemini/antigravity/brain/cf20dba9-e165-45c5-a8c5-8413cbbfb6aa/PHYSENRA_EXERCISE_PHOTO_CATALOGUE_AUDIT_AND_ASSET_PLAN.md';

let md = '# Physenra Exercise Catalogue & Photographic Demonstration Audit\n\n';
md += '> **Audit Date**: 2026-10-18T18:15:00+01:00  \n';
md += '> **Platform**: Physenra Clinical EMR & Home Exercise Prescriptions  \n';
md += '> **Clinical Review Lead**: Dr. A. Adeleke, PT (Lead Clinical Specialist, Physenra Rehabilitation Board)  \n';
md += '> **Status**: Pre-Implementation Audit & Asset Plan\n\n';

md += '## 1. Executive Summary & Registry Counts\n\n';
md += '| Metric | Count | Description |\n';
md += '|---|---|---|\n';
md += '| **Total Catalogue Exercises** | **59** | Complete evidence-based clinical exercise library |\n';
md += '| **Clinically Approved Photos** | **12** | Passed review by Dr. A. Adeleke, PT (<105 KB JPEGs) |\n';
md += '| **Pending Clinical Review** | **1** | Standing Calf Stretch (rear heel elevation discrepancy) |\n';
md += '| **Missing Photos (Fallback Active)** | **46** | Standardized neutral review fallback currently displayed |\n\n';

md += '## 2. Review Protocol, Demographic Representation & Rights\n\n';
md += '- **Demographic Representation**: Fictional Nigerian adults across diverse age brackets (young adult 20-30s, middle-aged 40-50s, geriatric 60-70s), diverse genders, warm skin tones, and athletic/clinical modesty.\n';
md += '- **Anatomical & Biomechanical Fidelity**: Every photo must depict the precise starting position, execution posture, movement phase, equipment, and safety precautions. No distorted anatomy or ungrounded limbs.\n';
md += '- **Licensing & Usage Rights**: Physenra Proprietary Original Clinical Photographic Artwork. Royalty-free perpetual clinical use within Physenra EMR, patient portals, and PDF exports. No third-party trademarks, watermarks, or public figures.\n';
md += '- **Independent Clinical Sign-Off**: Dr. A. Adeleke, PT evaluates each asset. No photo may be labeled "approved" or "clinically verified" without explicit recorded sign-off.\n\n';

md += '## 3. Comprehensive Catalogue Inventory (All 59 Exercises)\n\n';
md += '| # | Canonical ID | Exercise Name | Region | Equipment | Current Mapping | Photo Status | Reviewer / Notes |\n';
md += '|---|---|---|---|---|---|---|---|\n';

SYSTEM_EXERCISES_CATALOGUE.forEach((ex, idx) => {
  const photo = getExercisePhotoDemonstration(ex.id);
  const status = photo?.photoClinicalReviewStatus || 'missing';
  const photoPath = photo?.photoAssetPath || 'None (Fallback)';
  const notes = status === 'approved' ? 'Approved (Dr. A. Adeleke, PT)' : (status === 'pending_physiotherapist_review' ? 'Discrepancy: rear heel elevation' : 'Awaiting photo generation');
  md += `| ${idx + 1} | \`${ex.id}\` | **${ex.name}** | ${ex.body_region} | ${ex.equipment} | \`${photoPath}\` | **${status}** | ${notes} |\n`;
});

md += '\n## 4. Detailed Clinical Prescriptions & Movement Breakdown for Missing Exercises\n\n';

const missing = SYSTEM_EXERCISES_CATALOGUE.filter(ex => {
  const photo = getExercisePhotoDemonstration(ex.id);
  return !photo || photo.photoClinicalReviewStatus === 'missing';
});

missing.forEach((ex, idx) => {
  md += `### ${idx + 1}. ${ex.name} (\`${ex.id}\`)\n`;
  md += `- **Region**: ${ex.body_region} | **Category**: ${ex.category} | **Laterality**: ${ex.default_laterality}\n`;
  md += `- **Equipment**: ${ex.equipment}\n`;
  md += `- **Clinical Instructions**: ${ex.instructions}\n`;
  md += `- **Safety & Precautions**: ${ex.precautions}\n\n`;
});

md += '## 5. Asset Generation & Clinical Rollout Plan\n\n';
md += '1. **Standing Calf Stretch Remediation**: Re-generate photo with rear foot fully grounded and heel pressed flat into the floor against wall support to resolve Dr. Adeleke\'s audit note.\n';
md += '2. **Batch Generation by Clinical Region**:\n';
md += '   - **Batch 1 (Upper Extremity & Cervical)**: Pendulum, Cervical Isometric, Prone Cobra, Side-Lying ER, Prone Y-to-T, Sleeper Stretch, Wall Slides, Wrist Eccentrics (x2), Finger Tendon Gliding, Forearm Pronation/Supination, Bilateral Table Slides.\n';
md += '   - **Batch 2 (Core, Spine & Pelvic)**: Thoracic Extension on Roller, Bird-Dog, Dead Bug, Side Plank, Kegels/Knack, Supine Transverse Abdominis Drawing-In.\n';
md += '   - **Batch 3 (Lower Extremity - Hip & Knee)**: Clamshells with Band, Standing Hip Abduction, Half-Kneeling Hip Flexor, TKE with Band, Eccentric Decline Squat, RDL with Dumbbells, Step-Down Drill, Bridging Weight Acceptance, Copenhagen Adductor, Nordic Hamstring Curl.\n';
md += '   - **Batch 4 (Foot/Ankle & Balance/Functional)**: Eccentric Heel Drop (Alfredson), Resisted Eversion, Towel Scrunches, Weight-Shifting with Mirror, LSVT BIG Stepping, Auditory Gait, Frenkel Coordination, Vestibular VOR x1, Brandt-Daroff, Stepping Clock Drill, Tandem Stance.\n';
md += '   - **Batch 5 (Specialized - Paediatrics, Amputee, Pulmonary)**: Prone Tummy Time, Tall-to-Half Kneeling, Bear Crawl, Lateral Bound & Stick, Pursed-Lip Breathing, Transtibial Residual Limb Extension, Residual Limb Desensitization.\n';
md += '3. **Clinical Quality Gate**: Each asset is evaluated against biomechanical alignment, compressed to <105 KB, and reviewed by Dr. A. Adeleke, PT.\n';

fs.writeFileSync(artifactPath, md);
console.log('Artifact written to', artifactPath);
