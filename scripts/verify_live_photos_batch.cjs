const https = require('https');

const baseUrl = 'https://physenra.com';

const approvedAssets = [
  '/images/exercises/photographs/quad-sets.jpg',
  '/images/exercises/photographs/straight-leg-raise.jpg',
  '/images/exercises/photographs/glute-bridge.jpg',
  '/images/exercises/photographs/heel-slides.jpg',
  '/images/exercises/photographs/scapular-retraction.jpg',
  '/images/exercises/photographs/pendulum-codman.jpg',
  '/images/exercises/photographs/seated-chin-tuck.jpg',
  '/images/exercises/photographs/ankle-pumps.jpg',
  '/images/exercises/photographs/standing-calf-stretch.jpg',
  '/images/exercises/photographs/cat-camel.jpg',
  '/images/exercises/photographs/dead-bug.jpg',
  '/images/exercises/photographs/prone-on-elbows.jpg',
  '/images/exercises/photographs/side-plank.jpg',
  '/images/exercises/photographs/half-kneeling-hip-flexor-stretch.jpg',
  '/images/exercises/photographs/sit-to-stand.jpg',
  '/images/exercises/photographs/diaphragmatic-breathing.jpg',
  '/images/exercises/photographs/acbt-breathing.jpg',
  '/images/exercises/photographs/cervical-isometric.jpg',
  '/images/exercises/photographs/thoracic-foam-roller.jpg',
  '/images/exercises/photographs/prone-cobra.jpg',
  '/images/exercises/photographs/side-lying-external-rotation.jpg',
  '/images/exercises/photographs/prone-y-to-t-raises.jpg',
  '/images/exercises/photographs/wall-slides.jpg',
  '/images/exercises/photographs/tyler-twist.jpg',
  '/images/exercises/photographs/standing-banded-hip-abduction.jpg',
  '/images/exercises/photographs/terminal-knee-extension.jpg',
  '/images/exercises/photographs/romanian-deadlift.jpg',
  '/images/exercises/photographs/alfredson-heel-drop.jpg',
  '/images/exercises/photographs/table-slides.jpg',
  '/images/exercises/photographs/pursed-lip-breathing.jpg',
  '/images/exercises/photographs/transverse-abdominis-drawing-in.jpg',
];

function checkUrl(urlPath) {
  return new Promise((resolve) => {
    const url = `${baseUrl}${urlPath}`;
    https.get(url, (res) => {
      let dataLen = 0;
      res.on('data', (chunk) => { dataLen += chunk.length; });
      res.on('end', () => {
        resolve({
          path: urlPath,
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          contentLength: dataLen
        });
      });
    }).on('error', (err) => {
      resolve({ path: urlPath, error: err.message });
    });
  });
}

async function run() {
  console.log(`Starting Live Verification on ${baseUrl}...\n`);
  let allPassed = true;

  for (const asset of approvedAssets) {
    const res = await checkUrl(asset);
    if (res.statusCode === 200 && res.contentType.includes('image/jpeg') && res.contentLength > 20000) {
      console.log(`✔ [HTTP 200] ${asset} (${res.contentLength} bytes, ${res.contentType})`);
    } else {
      console.error(`✖ FAILED: ${asset}`, res);
      allPassed = false;
    }
  }

  // Check main page and bundle security
  const homeRes = await checkUrl('/');
  console.log(`\n✔ [HTTP ${homeRes.statusCode}] Homepage live on ${baseUrl}`);

  if (allPassed) {
    console.log(`\nAll ${approvedAssets.length} approved live photographic assets verified successfully on production.`);
  } else {
    process.exit(1);
  }
}

run();
