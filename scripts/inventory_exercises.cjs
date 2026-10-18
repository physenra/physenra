const { SYSTEM_EXERCISES_CATALOGUE } = require('../src/services/hepCatalogueData.ts');
const { EXERCISE_VISUALS_REGISTRY, getExercisePhotoDemonstration } = require('../src/services/exerciseVisualRegistry.ts');

console.log('Total catalog exercises:', SYSTEM_EXERCISES_CATALOGUE.length);

const approved = [];
const pending = [];
const missing = [];

SYSTEM_EXERCISES_CATALOGUE.forEach((ex, idx) => {
  const photo = getExercisePhotoDemonstration(ex.id);
  const status = photo?.photoClinicalReviewStatus || 'none';
  const entry = {
    num: idx + 1,
    id: ex.id,
    name: ex.name,
    body_region: ex.body_region,
    category: ex.category,
    equipment: ex.equipment,
    photoStatus: status,
    photoPath: photo?.photoAssetPath || null,
    reviewedBy: photo?.photoReviewedBy || null,
    instructions: ex.instructions,
    precautions: ex.precautions
  };
  if (status === 'approved') approved.push(entry);
  else if (status === 'pending_physiotherapist_review') pending.push(entry);
  else missing.push(entry);
});

console.log('Approved:', approved.length);
console.log('Pending:', pending.length);
console.log('Missing photo:', missing.length);

console.log('\n--- APPROVED (12) ---');
approved.forEach(a => console.log(`${a.num}. [${a.id}] ${a.name} (${a.body_region}) -> ${a.photoPath}`));

console.log('\n--- PENDING REVIEW (1) ---');
pending.forEach(p => console.log(`${p.num}. [${p.id}] ${p.name} (${p.body_region}) -> ${p.photoPath}`));

console.log('\n--- MISSING PHOTO (46) ---');
missing.forEach(m => console.log(`${m.num}. [${m.id}] ${m.name} (${m.body_region}) | Equip: ${m.equipment}`));
