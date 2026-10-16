const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = 'C:\\Users\\Surface\\.gemini\\antigravity\\brain\\cf20dba9-e165-45c5-a8c5-8413cbbfb6aa';
const outDir = path.join(__dirname, '..', 'public', 'images', 'exercises', 'photographs');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const photoSpecs = [
  {
    src: path.join(brainDir, 'physenra_quad_sets_exercise_1792187643359.jpg'),
    dest: path.join(outDir, 'quad-sets.jpg'),
    name: 'Quad Sets'
  },
  {
    src: path.join(brainDir, 'physenra_straight_leg_raise_proper_supine_1792187729942.jpg'),
    dest: path.join(outDir, 'straight-leg-raise.jpg'),
    name: 'Straight Leg Raise'
  },
  {
    src: path.join(brainDir, 'physenra_glute_bridge_female_1792187710061.jpg'),
    dest: path.join(outDir, 'glute-bridge.jpg'),
    name: 'Glute Bridge'
  },
  {
    src: path.join(brainDir, 'nigerian_senior_sit_to_stand_dynamic_armless_1792187747985.jpg'),
    dest: path.join(outDir, 'sit-to-stand.jpg'),
    name: 'Sit-to-Stand / 30CST'
  },
  {
    src: path.join(brainDir, 'prone_on_elbows_exercise_1792187823627.jpg'),
    dest: path.join(outDir, 'prone-on-elbows.jpg'),
    name: 'Prone On Elbows'
  },
  {
    src: path.join(brainDir, 'seated_chin_tuck_cervical_retraction_1792187825175.jpg'),
    dest: path.join(outDir, 'seated-chin-tuck.jpg'),
    name: 'Seated Chin Tuck'
  },
  {
    src: path.join(brainDir, 'standing_calf_stretch_gastrocnemius_v2_1792187732337.jpg'),
    dest: path.join(outDir, 'standing-calf-stretch.jpg'),
    name: 'Standing Calf Stretch'
  }
];

async function optimizePhotos() {
  console.log(`Starting photo optimization for ${photoSpecs.length} clinical demonstration assets...`);
  for (const spec of photoSpecs) {
    if (!fs.existsSync(spec.src)) {
      console.warn(`Source not found: ${spec.src}`);
      continue;
    }
    const origStats = fs.statSync(spec.src);
    // Resize to max 960px width/height while maintaining aspect ratio, JPEG 82% quality with mozjpeg
    await sharp(spec.src)
      .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toFile(spec.dest);
    
    const newStats = fs.statSync(spec.dest);
    const savings = Math.round((1 - newStats.size / origStats.size) * 100);
    console.log(`Optimized ${spec.name}: ${(origStats.size / 1024).toFixed(1)} KB -> ${(newStats.size / 1024).toFixed(1)} KB (${savings}% savings) -> ${path.basename(spec.dest)}`);
  }
  console.log('Optimization complete!');
}

optimizePhotos().catch(err => {
  console.error('Error optimizing photos:', err);
  process.exit(1);
});
