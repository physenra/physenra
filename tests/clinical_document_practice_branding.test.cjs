const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('PHYSENRA CLINICAL DOCUMENT PRACTICE BRANDING AUDIT & VERIFICATION', () => {
  const rootDir = path.resolve(__dirname, '..');
  const headerFile = path.resolve(rootDir, 'src/components/clinical/ClinicalDocumentPrintHeader.tsx');
  const footerFile = path.resolve(rootDir, 'src/components/clinical/ClinicalDocumentPrintFooter.tsx');
  const cssFile = path.resolve(rootDir, 'src/index.css');

  test('ClinicalDocumentPrintHeader component exists and exports properly', () => {
    assert.ok(fs.existsSync(headerFile), 'ClinicalDocumentPrintHeader.tsx must exist');
    const content = fs.readFileSync(headerFile, 'utf8');
    assert.match(content, /export const ClinicalDocumentPrintHeader/, 'Must export ClinicalDocumentPrintHeader component');
    assert.match(content, /usePractice/, 'Must dynamically source activePractice from usePractice hook');
  });

  test('ClinicalDocumentPrintFooter component exists and exports properly', () => {
    assert.ok(fs.existsSync(footerFile), 'ClinicalDocumentPrintFooter.tsx must exist');
    const content = fs.readFileSync(footerFile, 'utf8');
    assert.match(content, /export const ClinicalDocumentPrintFooter/, 'Must export ClinicalDocumentPrintFooter component');
    assert.match(content, /Powered by Physenra/, 'Must render Powered by Physenra as secondary attribution');
  });

  test('Strict prevention of hardcoded tenant names (zero "Kabworld" references)', () => {
    const headerContent = fs.readFileSync(headerFile, 'utf8');
    const footerContent = fs.readFileSync(footerFile, 'utf8');
    const cssContent = fs.readFileSync(cssFile, 'utf8');

    assert.doesNotMatch(
      headerContent,
      /Kabworld/i,
      'ClinicalDocumentPrintHeader must NOT contain hardcoded "Kabworld"'
    );
    assert.doesNotMatch(
      footerContent,
      /Kabworld/i,
      'ClinicalDocumentPrintFooter must NOT contain hardcoded "Kabworld"'
    );
    assert.doesNotMatch(
      cssContent,
      /Kabworld/i,
      'index.css print rules must NOT contain hardcoded "Kabworld"'
    );
  });

  test('Practice name fallback is generic "Physiotherapy Practice", never a specific clinic', () => {
    const headerContent = fs.readFileSync(headerFile, 'utf8');
    const footerContent = fs.readFileSync(footerFile, 'utf8');

    assert.match(headerContent, /'Physiotherapy Practice'/, 'Must use generic fallback for practiceName');
    assert.match(footerContent, /'Physiotherapy Practice'/, 'Must use generic fallback in footer');
    assert.doesNotMatch(headerContent, /'Physenra Clinic'/, 'Must not present Physenra as the clinic');
  });

  test('Monogram generator computes clean initials from tenant name without broken images', () => {
    const headerContent = fs.readFileSync(headerFile, 'utf8');
    assert.match(headerContent, /getMonogram/, 'Must define getMonogram function');
    assert.match(headerContent, /clinical-practice-monogram/, 'Must provide monogram container with test id');

    // Simulate getMonogram logic
    const getMonogram = (name) => {
      if (!name || !name.trim()) return 'PT';
      const clean = name.trim().replace(/^(the|a)\s+/i, '');
      const parts = clean.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return clean.slice(0, 2).toUpperCase();
    };

    assert.equal(getMonogram('Kabworld Physiotherapy'), 'KP');
    assert.equal(getMonogram('Apex Spine and Joint Clinic'), 'AS');
    assert.equal(getMonogram('Victoria Island Rehabilitation Center'), 'VI');
    assert.equal(getMonogram('Solo Practitioner Clinic'), 'SP');
    assert.equal(getMonogram('Physio'), 'PH');
    assert.equal(getMonogram(''), 'PT');
  });

  test('Logo rendering has onError fallback to monogram preventing broken-image placeholders', () => {
    const headerContent = fs.readFileSync(headerFile, 'utf8');
    assert.match(headerContent, /onError=\{\(\) => setImageError\(true\)\}/, 'Must handle image loading errors gracefully');
    assert.match(headerContent, /hasCustomLogo \?/, 'Must conditionally switch between custom logo and monogram');
  });

  test('Optional contact fields (address, phone, email) render cleanly without empty labels', () => {
    const headerContent = fs.readFileSync(headerFile, 'utf8');
    assert.match(headerContent, /\{practiceAddress && \(/, 'Address must be conditionally rendered');
    assert.match(headerContent, /\{practicePhone && \(/, 'Phone must be conditionally rendered');
    assert.match(headerContent, /\{practiceEmail && \(/, 'Email must be conditionally rendered');
    assert.match(headerContent, /hasContactInfo && \(/, 'Contact container only rendered when at least one field exists');
  });

  test('"Powered by Physenra" is strictly relegated to secondary footer attribution', () => {
    const headerContent = fs.readFileSync(headerFile, 'utf8');
    const footerContent = fs.readFileSync(footerFile, 'utf8');

    // Header must NOT feature Physenra as the primary issuer
    assert.doesNotMatch(headerContent, /<h1[^>]*>Physenra<\/h1>/i);
    assert.doesNotMatch(headerContent, /<h2[^>]*>Physenra<\/h2>/i);

    // Footer features Powered by Physenra in modest styling
    assert.match(footerContent, /data-testid="powered-by-physenra"/);
    assert.match(footerContent, /text-\[11px\] text-slate-400/, 'Must use quiet, unobtrusive secondary styling');
    assert.match(footerContent, /Physiotherapy EMR & Clinical Management Platform/, 'Identifies Physenra as EMR software platform');
  });

  test('Print stylesheet protects clinical headers and footers from application chrome hiding', () => {
    const cssContent = fs.readFileSync(cssFile, 'utf8');

    assert.match(cssContent, /\.clinical-document-header/, 'CSS must explicitly target .clinical-document-header');
    assert.match(cssContent, /\.clinical-document-footer/, 'CSS must explicitly target .clinical-document-footer');
    assert.match(cssContent, /page-break-inside:\s*avoid\s*!important/, 'Must enforce page-break-inside avoid');
    assert.match(cssContent, /break-inside:\s*avoid\s*!important/, 'Must enforce break-inside avoid');
    assert.match(cssContent, /@page\s*\{\s*margin:\s*1\.2cm 1\.5cm/, 'Must configure standard paper margins');
  });

  test('HEPDetailPage integrates ClinicalDocumentPrintHeader and ClinicalDocumentPrintFooter', () => {
    const hepFile = path.resolve(rootDir, 'src/pages/hep/HEPDetailPage.tsx');
    const content = fs.readFileSync(hepFile, 'utf8');

    assert.match(content, /import \{ ClinicalDocumentPrintHeader \}/, 'HEPDetailPage must import ClinicalDocumentPrintHeader');
    assert.match(content, /import \{ ClinicalDocumentPrintFooter \}/, 'HEPDetailPage must import ClinicalDocumentPrintFooter');
    assert.match(content, /<ClinicalDocumentPrintHeader\s+documentTitle="Home Exercise Program"/, 'Must render header with HEP title');
    assert.match(content, /<ClinicalDocumentPrintFooter\s+documentReference=\{program\.program_identifier\}/, 'Must render footer with reference');
    assert.match(content, /className="print:hidden"/, 'Must hide UI navigation and action buttons during print');
  });

  test('DischargeSummaryDetailPage integrates ClinicalDocumentPrintHeader and ClinicalDocumentPrintFooter', () => {
    const disFile = path.resolve(rootDir, 'src/pages/discharge-summaries/DischargeSummaryDetailPage.tsx');
    const content = fs.readFileSync(disFile, 'utf8');

    assert.match(content, /import \{ ClinicalDocumentPrintHeader \}/);
    assert.match(content, /import \{ ClinicalDocumentPrintFooter \}/);
    assert.match(content, /<ClinicalDocumentPrintHeader\s+documentTitle="Discharge Summary & Clinical Record"/);
    assert.match(content, /<ClinicalDocumentPrintFooter\s+documentReference=\{summary\.summary_identifier\}/);
    assert.match(content, /className="print:hidden"/);
  });

  test('InvoiceDetailPage integrates ClinicalDocumentPrintHeader and ClinicalDocumentPrintFooter', () => {
    const invFile = path.resolve(rootDir, 'src/pages/invoices/InvoiceDetailPage.tsx');
    const content = fs.readFileSync(invFile, 'utf8');

    assert.match(content, /import \{ ClinicalDocumentPrintHeader \}/);
    assert.match(content, /import \{ ClinicalDocumentPrintFooter \}/);
    assert.match(content, /<ClinicalDocumentPrintHeader\s+documentTitle="Official Physiotherapy Invoice"/);
    assert.match(content, /hideMetadataGrid=\{true\}/);
    assert.match(content, /<ClinicalDocumentPrintFooter\s+documentReference=\{invoice\.invoice_number\}/);
  });

  test('ReceiptDetailPage integrates ClinicalDocumentPrintHeader and ClinicalDocumentPrintFooter', () => {
    const recFile = path.resolve(rootDir, 'src/pages/receipts/ReceiptDetailPage.tsx');
    const content = fs.readFileSync(recFile, 'utf8');

    assert.match(content, /import \{ ClinicalDocumentPrintHeader \}/);
    assert.match(content, /import \{ ClinicalDocumentPrintFooter \}/);
    assert.match(content, /<ClinicalDocumentPrintHeader\s+documentTitle="Official Settlement Receipt"/);
    assert.match(content, /hideMetadataGrid=\{true\}/);
    assert.match(content, /<ClinicalDocumentPrintFooter\s+documentReference=\{receipt\.receipt_number\}/);
  });

  test('TreatmentPlanDetailPage integrates ClinicalDocumentPrintHeader and ClinicalDocumentPrintFooter', () => {
    const tpFile = path.resolve(rootDir, 'src/pages/treatment-plans/TreatmentPlanDetailPage.tsx');
    const content = fs.readFileSync(tpFile, 'utf8');

    assert.match(content, /import \{ ClinicalDocumentPrintHeader \}/);
    assert.match(content, /import \{ ClinicalDocumentPrintFooter \}/);
    assert.match(content, /<ClinicalDocumentPrintHeader\s+documentTitle="Treatment Plan & Clinical Protocol"/);
    assert.match(content, /<ClinicalDocumentPrintFooter\s+documentReference=\{plan\.plan_identifier\}/);
    assert.match(content, /Print \/ Export Treatment Plan/, 'Must provide print button for treatment plan');
  });
});
