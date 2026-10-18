const { SYSTEM_EXERCISES_CATALOGUE } = require('../src/services/hepCatalogueData.ts');
const { EXERCISE_VISUALS_REGISTRY } = require('../src/services/exerciseVisualRegistry.ts');

console.log('Total Exercises in Catalogue:', SYSTEM_EXERCISES_CATALOGUE.length);

const inventory = SYSTEM_EXERCISES_CATALOGUE.map(ex => {
  const meta = EXERCISE_VISUALS_REGISTRY[ex.id];
  return {
    id: ex.id,
    name: ex.name,
    body_region: ex.body_region,
    category: ex.category,
    equipment: ex.equipment,
    hasIllustration: !!(meta && meta.assetPath),
    illustrationPath: meta ? meta.assetPath : null,
    illustrationStatus: meta ? meta.clinicalReviewStatus : null,
    hasPhoto: !!(meta && meta.photoAssetPath),
    photoPath: meta ? meta.photoAssetPath : null,
    photoStatus: meta ? meta.photoClinicalReviewStatus : null,
    photoDemographic: meta ? meta.photoDemographic : null,
    photoReviewedBy: meta ? meta.photoReviewedBy : null,
  };
});

const withPhoto = inventory.filter(i => i.hasPhoto);
const approvedPhoto = inventory.filter(i => i.photoStatus === 'approved');
const pendingPhoto = inventory.filter(i => i.photoStatus === 'pending_physiotherapist_review');
const withoutPhoto = inventory.filter(i => !i.hasPhoto);

console.log('With Photo Metadata:', withPhoto.length);
console.log('Approved Photos:', approvedPhoto.length);
console.log('Pending Review Photos:', pendingPhoto.length);
console.log('Without Photo:', withoutPhoto.length);

console.log('\n--- APPROVED PHOTOS ---');
approvedPhoto.forEach(p => console.log(`[${p.id}] ${p.name} (${p.body_region}) -> ${p.photoPath} | ${p.photoDemographic}`));

console.log('\n--- PENDING REVIEW PHOTOS ---');
pendingPhoto.forEach(p => console.log(`[${p.id}] ${p.name} (${p.body_region}) -> ${p.photoPath} | ${p.photoDemographic}`));

console.log('\n--- BREAKDOWN BY BODY REGION ---');
const byRegion = {};
SYSTEM_EXERCISES_CATALOGUE.forEach(e => {
  byRegion[e.body_region] = (byRegion[e.body_region] || 0) + 1;
});
console.table(byRegion);
