const https = require('https');

const photos = [
  'quad-sets.jpg',
  'straight-leg-raise.jpg',
  'glute-bridge.jpg',
  'sit-to-stand.jpg',
  'prone-on-elbows.jpg',
  'seated-chin-tuck.jpg',
  'standing-calf-stretch.jpg',
];

const baseUrl = 'https://physenra.com';

function checkUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let bytes = 0;
      res.on('data', (chunk) => {
        bytes += chunk.length;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          contentLength: bytes,
        });
      });
    }).on('error', reject);
  });
}

async function verifyAll() {
  console.log(`Starting live production verification on ${baseUrl}...`);
  let allPass = true;

  // 1. Verify index
  const indexRes = await checkUrl(`${baseUrl}/`);
  console.log(`Index ${baseUrl}/ -> HTTP ${indexRes.statusCode} (${indexRes.contentType})`);
  if (indexRes.statusCode !== 200) allPass = false;

  // 2. Verify all photos
  for (const photo of photos) {
    const url = `${baseUrl}/images/exercises/photographs/${photo}`;
    const res = await checkUrl(url);
    const isOk = res.statusCode === 200 && res.contentType && res.contentType.includes('image/jpeg');
    console.log(`Photo ${photo} -> HTTP ${res.statusCode} | Content-Type: ${res.contentType} | Size: ${(res.contentLength / 1024).toFixed(1)} KB [${isOk ? 'PASS' : 'FAIL'}]`);
    if (!isOk) allPass = false;
  }

  if (allPass) {
    console.log('\n✓ ALL LIVE PRODUCTION CHECKS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n✖ SOME LIVE PRODUCTION CHECKS FAILED!');
    process.exit(1);
  }
}

verifyAll().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
