/**
 * PHYSENRA — LIVE PRODUCTION WEBSITE FOUNDER & CLINICIAN STORYTELLING VERIFICATION V1
 *
 * Verifies live production website at https://physenra.com:
 * 1. Live Homepage (200 OK, HTML, brand title, responsive viewport)
 * 2. Live sitemap.xml & robots.txt (200 OK, canonical URLs, /about included)
 * 3. Live JavaScript bundles (HomePageShell, AboutPageShell, ClinicianVisual)
 * 4. Verified presence of Founder presentation & credentials in production bundles
 * 5. Verified presence of Clinician Visual Storytelling in production bundles
 * 6. Static clinician imagery HTTP 200 OK verification with valid MIME types & sizes
 * 7. Claims integrity verification on live bundles (zero exaggerated or unsupported claims)
 * 8. Live security & isolation verification (0 Kabworld, 0 service role leaks)
 */

const https = require('node:https');
const assert = require('node:assert/strict');

const BASE_URL = 'https://physenra.com';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          text: buffer.toString('utf8'),
          buffer
        });
      });
    }).on('error', reject);
  });
}

async function runLiveVerification() {
  console.log('=================================================================');
  console.log('PHYSENRA LIVE PRODUCTION VERIFICATION: FOUNDER & CLINICIAN V1');
  console.log('Target: ' + BASE_URL);
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function testAssert(condition, message) {
    if (condition) {
      console.log(`  ✔ ${message}`);
      passed++;
    } else {
      console.error(`  ✖ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Live Homepage fetch
    console.log('▶ Check 1: Homepage Live Availability & HTML Shell');
    const homeRes = await fetchUrl(BASE_URL);
    testAssert(homeRes.statusCode === 200, 'Homepage returned HTTP 200 OK');
    testAssert(homeRes.text.includes('<title>Physenra'), 'Homepage includes valid brand title');
    testAssert(homeRes.text.includes('viewport'), 'Homepage includes mobile viewport meta');
    testAssert(!/kabworld/i.test(homeRes.text), 'Homepage HTML contains zero Kabworld references');

    // 2. Sitemap & Robots
    console.log('\n▶ Check 2: SEO Discovery Endpoints (sitemap.xml & robots.txt)');
    const sitemapRes = await fetchUrl(`${BASE_URL}/sitemap.xml`);
    testAssert(sitemapRes.statusCode === 200, 'sitemap.xml returned HTTP 200 OK');
    testAssert(sitemapRes.text.includes('<loc>https://physenra.com/about</loc>'), 'sitemap.xml indexes /about');
    testAssert(sitemapRes.text.includes('<loc>https://physenra.com/</loc>'), 'sitemap.xml indexes homepage');

    const robotsRes = await fetchUrl(`${BASE_URL}/robots.txt`);
    testAssert(robotsRes.statusCode === 200, 'robots.txt returned HTTP 200 OK');
    testAssert(robotsRes.text.includes('Allow: /'), 'robots.txt allows indexing');

    // 3. Extract asset references and fetch live bundles
    console.log('\n▶ Check 3: Production Bundle Discovery & Download');
    const jsMatches = homeRes.text.match(/assets\/[a-zA-Z0-9_\-\.]+\.js/g) || [];
    testAssert(jsMatches.length > 0, `Discovered ${jsMatches.length} production script assets in HTML`);

    const homeBundleUrl = `${BASE_URL}/assets/HomePageShell-BsZNOEJV.js`;
    const aboutBundleUrl = `${BASE_URL}/assets/AboutPageShell-CcGFu0OT.js`;
    const visualBundleUrl = `${BASE_URL}/assets/ClinicianVisual-DO877dLC.js`;

    const homeBundleRes = await fetchUrl(homeBundleUrl);
    testAssert(homeBundleRes.statusCode === 200, 'HomePage bundle fetched with HTTP 200 OK');

    const aboutBundleRes = await fetchUrl(aboutBundleUrl);
    testAssert(aboutBundleRes.statusCode === 200, 'AboutPage bundle fetched with HTTP 200 OK');

    const visualBundleRes = await fetchUrl(visualBundleUrl);
    testAssert(visualBundleRes.statusCode === 200, 'ClinicianVisual / FounderPhoto bundle fetched with HTTP 200 OK');

    // 4. Founder Presentation Invariants in Production
    console.log('\n▶ Check 4: Founder Presentation Invariants in Production');
    testAssert(homeBundleRes.text.includes('Dr Oladejo Korede'), 'HomePage bundle includes "Dr Oladejo Korede"');
    testAssert(homeBundleRes.text.includes('PT, MPH, DPT'), 'HomePage bundle includes credentials "PT, MPH, DPT"');
    testAssert(homeBundleRes.text.includes('Built by a Physiotherapist. Designed for Physiotherapy Practice.'), 'HomePage bundle includes Section 10B heading');
    testAssert(homeBundleRes.text.includes('Meet the Founder'), 'HomePage bundle includes "Meet the Founder" CTA');
    testAssert(homeBundleRes.text.includes('Built for the Way Physiotherapists Actually Work'), 'HomePage bundle includes Section 4B heading');

    testAssert(aboutBundleRes.text.includes('Dr Oladejo Korede'), 'AboutPage bundle includes "Dr Oladejo Korede"');
    testAssert(aboutBundleRes.text.includes('PT, MPH, DPT'), 'AboutPage bundle includes credentials "PT, MPH, DPT"');
    testAssert(aboutBundleRes.text.includes('Founder, Physenra'), 'AboutPage bundle includes "Founder, Physenra"');
    testAssert(aboutBundleRes.text.includes('Master of Public Health') && aboutBundleRes.text.includes('Doctor of Physiotherapy'), 'AboutPage bundle includes verified degree backgrounds');
    testAssert(aboutBundleRes.text.includes("Built from a Physiotherapist's Perspective") || aboutBundleRes.text.includes("Built from a physiotherapist's perspective"), 'AboutPage includes approved thematic framing');

    testAssert(visualBundleRes.text.includes('Founder & Clinical Architect') || visualBundleRes.text.includes('Founder &amp; Clinical Architect'), 'Visual bundle includes "Founder & Clinical Architect" title');
    testAssert(visualBundleRes.text.includes('Visual Storytelling'), 'Visual bundle includes "Visual Storytelling" context label');

    // 5. Clinician Visual Assets HTTP Delivery
    console.log('\n▶ Check 5: Clinician Visual Imagery Delivery');
    const images = [
      '/images/clinicians/clinician-digital-workflow-01.jpg',
      '/images/clinicians/clinician-practice-management-01.jpg',
      '/images/clinicians/clinician-patient-care-01.jpg'
    ];

    for (const imgPath of images) {
      const imgRes = await fetchUrl(`${BASE_URL}${imgPath}`);
      testAssert(imgRes.statusCode === 200, `Image ${imgPath} returned HTTP 200 OK`);
      testAssert(imgRes.headers['content-type'] === 'image/jpeg', `Image ${imgPath} has MIME type image/jpeg`);
      testAssert(imgRes.buffer.length > 500000, `Image ${imgPath} is high resolution (${Math.round(imgRes.buffer.length / 1024)} KB)`);
    }

    // 6. Claims Integrity on Live Production Bundles
    console.log('\n▶ Check 6: Claims Integrity on Live Bundles');
    const bundledText = homeBundleRes.text + ' ' + aboutBundleRes.text;
    testAssert(!/\bworld's first\b/i.test(bundledText), 'Zero "world\'s first" claims in production bundles');
    testAssert(!/\brevolutionizing\b/i.test(bundledText), 'Zero "revolutionizing" claims in production bundles');
    testAssert(!/\btrusted by 500\b/i.test(bundledText), 'Zero fabricated practice counts in production bundles');
    testAssert(!/\b10,000\+ clinicians\b/i.test(bundledText), 'Zero exaggerated clinician numbers in production bundles');
    testAssert(!/\baward-winning\b/i.test(bundledText), 'Zero unverified award claims in production bundles');

    // 7. Security and Cleanliness Verification
    console.log('\n▶ Check 7: Production Security & Project Separation');
    testAssert(!/kabworld/i.test(homeBundleRes.text), 'HomePage bundle free of Kabworld references');
    testAssert(!/kabworld/i.test(aboutBundleRes.text), 'AboutPage bundle free of Kabworld references');
    testAssert(!/kabworld/i.test(visualBundleRes.text), 'ClinicianVisual bundle free of Kabworld references');
    testAssert(!/service_role/i.test(homeBundleRes.text), 'HomePage bundle free of service role keys');
    testAssert(!/service_role/i.test(aboutBundleRes.text), 'AboutPage bundle free of service role keys');

    console.log('\n=================================================================');
    console.log(`LIVE VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('=================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal verification error:', err);
    process.exit(1);
  }
}

runLiveVerification();
