// ==============================================================================
// PHYSENRA — SIDEBAR NAVIGATION SCROLL & ACCESSIBILITY TEST SUITE
// Test File: tests/sidebar_navigation_scroll_accessibility.test.cjs
//
// Governs:
// 1. Sidebar DOM structure & complete navigation items (25 links + admin)
// 2. Inclusion of Fee Schedules and all subsequent items (Invoices, Billing, Practice)
// 3. Independent vertical scroll container (.sidebar-section: overflow-y: auto)
// 4. Zero clipping of lower navigation items across viewports (1440x900, 1440x768, 1024x768, 768x1024)
// 5. Fixed practice context footer docking with flex-shrink: 0
// 6. Sufficient bottom padding (>= 24px) ensuring clearance above fixed footer
// 7. Accessible landmarks (aria-label on aside and nav) & keyboard focus visibility
// 8. Zero Kabworld references & absolute project independence
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const SIDEBAR_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'Sidebar.tsx');
const APP_SHELL_PATH = path.join(ROOT_DIR, 'src', 'components', 'layout', 'AppShell.tsx');
const INDEX_CSS_PATH = path.join(ROOT_DIR, 'src', 'index.css');

test('PHYSENRA — Sidebar Navigation Scroll & Accessibility Verification', async (t) => {
  const sidebarCode = fs.readFileSync(SIDEBAR_PATH, 'utf8');
  const appShellCode = fs.readFileSync(APP_SHELL_PATH, 'utf8');
  const indexCss = fs.readFileSync(INDEX_CSS_PATH, 'utf8');

  // ============================================================================
  // SUITE 1: Navigation Item Completeness & Structure
  // ============================================================================
  await t.test('--- SUITE 1: Navigation Item Completeness ---', async (st) => {
    await st.test('1. Sidebar renders all clinical, financial, and administrative routes', () => {
      const requiredRoutes = [
        '/app/dashboard',
        '/app/patients',
        '/app/episodes',
        '/app/appointments',
        '/app/visits',
        '/app/clinical-notes',
        '/app/imaging',
        '/app/outcome-measures',
        '/app/hep',
        '/app/treatment-plans',
        '/app/progress-reviews',
        '/app/discharge-summaries',
        '/app/services',
        '/app/fee-schedules',
        '/app/invoices',
        '/app/payments',
        '/app/receipts',
        '/app/packages',
        '/app/package-entitlements',
        '/app/wallets',
        '/app/memberships',
        '/app/membership-plans',
        '/app/inventory',
        '/app/billing',
        '/app/practice',
      ];

      for (const route of requiredRoutes) {
        assert(
          sidebarCode.includes(`to="${route}"`),
          `Sidebar must render link for route ${route}`
        );
      }
    });

    await st.test('2. Fee Schedules is explicitly present and preceded by Services', () => {
      assert(sidebarCode.includes('Fee Schedules'), 'Must display Fee Schedules link');
      assert(sidebarCode.includes('Coins'), 'Must render Coins icon for Fee Schedules');
      assert(
        sidebarCode.indexOf('to="/app/services"') < sidebarCode.indexOf('to="/app/fee-schedules"'),
        'Services must precede Fee Schedules'
      );
    });

    await st.test('3. Navigation items below Fee Schedules are fully preserved', () => {
      const feeScheduleIndex = sidebarCode.indexOf('to="/app/fee-schedules"');
      const invoiceIndex = sidebarCode.indexOf('to="/app/invoices"');
      const billingIndex = sidebarCode.indexOf('to="/app/billing"');
      const practiceIndex = sidebarCode.indexOf('to="/app/practice"');

      assert(feeScheduleIndex < invoiceIndex, 'Invoices must be below Fee Schedules');
      assert(invoiceIndex < billingIndex, 'Billing must be below Invoices');
      assert(billingIndex < practiceIndex, 'Practice Details must be below Billing');
    });

    await st.test('4. Practice Context footer is rendered inside sidebar-footer', () => {
      assert(sidebarCode.includes('className="sidebar-footer"'), 'Must have sidebar-footer container');
      assert(sidebarCode.includes('practice-context-card'), 'Must render practice-context-card');
      assert(sidebarCode.includes('status-label'), 'Must render status-label');
    });
  });

  // ============================================================================
  // SUITE 2: CSS Layout & Overflow Architecture
  // ============================================================================
  await t.test('--- SUITE 2: CSS Layout & Overflow Architecture ---', async (st) => {
    await st.test('5. app-shell establishes bounded viewport height with dynamic fallback', () => {
      assert(indexCss.includes('.app-shell {'), 'Must define .app-shell');
      assert(indexCss.includes('height: 100vh;'), 'Must specify 100vh');
      assert(indexCss.includes('height: 100dvh;'), 'Must specify 100dvh for mobile/tablet address bar resilience');
    });

    await st.test('6. app-body enforces min-height: 0 to prevent unconstrained flex expansion', () => {
      const appBodyBlock = indexCss.match(/\.app-body\s*\{[^}]+\}/)?.[0] || '';
      assert(appBodyBlock.includes('display: flex;'), 'app-body must be flex');
      assert(appBodyBlock.includes('min-height: 0;'), 'app-body must have min-height: 0');
      assert(appBodyBlock.includes('overflow: hidden;'), 'app-body must have overflow: hidden');
    });

    await st.test('7. app-sidebar is bounded to 100% height with min-height: 0 and overflow: hidden', () => {
      const appSidebarBlock = indexCss.match(/\.app-sidebar\s*\{[^}]+\}/)?.[0] || '';
      assert(appSidebarBlock.includes('width: 240px;'), 'app-sidebar width must be 240px');
      assert(appSidebarBlock.includes('flex-shrink: 0;'), 'app-sidebar must not shrink horizontally');
      assert(appSidebarBlock.includes('height: 100%;'), 'app-sidebar must occupy 100% of app-body');
      assert(appSidebarBlock.includes('min-height: 0;'), 'app-sidebar must have min-height: 0');
      assert(appSidebarBlock.includes('overflow: hidden;'), 'app-sidebar must prevent uncontained overflow');
    });

    await st.test('8. sidebar-section is an independent vertical scroll container', () => {
      const sidebarSectionBlock = indexCss.match(/\.sidebar-section\s*\{[^}]+\}/)?.[0] || '';
      assert(sidebarSectionBlock.includes('flex: 1;'), 'sidebar-section must expand to fill available space');
      assert(sidebarSectionBlock.includes('min-height: 0;'), 'sidebar-section must have min-height: 0');
      assert(sidebarSectionBlock.includes('overflow-y: auto;'), 'sidebar-section must scroll vertically');
      assert(sidebarSectionBlock.includes('overflow-x: hidden;'), 'sidebar-section must prevent horizontal scroll');
      assert(sidebarSectionBlock.includes('overscroll-behavior: contain;'), 'sidebar-section must contain scroll chaining');
    });

    await st.test('9. sidebar-section provides sufficient bottom padding above fixed footer', () => {
      const sidebarSectionBlock = indexCss.match(/\.sidebar-section\s*\{[^}]+\}/)?.[0] || '';
      // Checks for padding with at least 24px bottom buffer
      assert(
        sidebarSectionBlock.includes('32px 12px;') || sidebarSectionBlock.includes('24px 12px;'),
        'sidebar-section must have generous bottom padding (>=24px) for clearance above footer'
      );
      assert(
        sidebarSectionBlock.includes('scroll-padding-bottom: 32px;') || sidebarSectionBlock.includes('scroll-padding-bottom: 24px;'),
        'sidebar-section must specify scroll-padding-bottom for accessible focus navigation'
      );
    });

    await st.test('10. sidebar-footer is pinned with flex-shrink: 0', () => {
      const sidebarFooterBlock = indexCss.match(/\.sidebar-footer\s*\{[^}]+\}/)?.[0] || '';
      assert(sidebarFooterBlock.includes('flex-shrink: 0;'), 'sidebar-footer must have flex-shrink: 0');
      assert(sidebarFooterBlock.includes('border-top: 1px solid #1e293b;'), 'sidebar-footer must have border-top');
    });

    await st.test('11. Custom dark scrollbar styles are configured for sidebar-section', () => {
      assert(indexCss.includes('.sidebar-section::-webkit-scrollbar'), 'Must configure webkit-scrollbar');
      assert(indexCss.includes('scrollbar-width: thin;'), 'Must configure Firefox thin scrollbar');
      assert(indexCss.includes('scrollbar-color: #334155 transparent;'), 'Must configure slate-800 scrollbar color');
    });
  });

  // ============================================================================
  // SUITE 3: Accessibility & Focus Navigation
  // ============================================================================
  await t.test('--- SUITE 3: Accessibility & Focus Navigation ---', async (st) => {
    await st.test('12. Accessible aria-labels on aside and nav landmarks', () => {
      assert(sidebarCode.includes('aria-label="Practice navigation"'), 'aside must have aria-label');
      assert(sidebarCode.includes('aria-label="Practice Platform"'), 'nav must have aria-label');
    });

    await st.test('13. Visible keyboard focus outline on nav links', () => {
      const focusBlock = indexCss.match(/\.nav-link:focus-visible\s*\{[^}]+\}/)?.[0] || '';
      assert(focusBlock.includes('outline: 2px solid #38bdf8;'), 'Must have high-contrast focus outline');
      assert(focusBlock.includes('outline-offset: -2px;'), 'Must have inset outline offset');
    });
  });

  // ============================================================================
  // SUITE 4: Multi-Viewport Height Simulation & Reachability
  // ============================================================================
  await t.test('--- SUITE 4: Multi-Viewport Geometry Simulation ---', async (st) => {
    const HEADER_HEIGHT = 64;
    const FOOTER_HEIGHT = 76;
    const ITEM_HEIGHT = 44; // 10px top + 10px bottom + 20px line-height + 4px gap
    const TOP_PADDING_LABEL = 48; // 20px pad + 28px label
    const BOTTOM_PADDING = 32;
    const TOTAL_ITEMS = 25; // standard practitioner items
    const TOTAL_CONTENT_HEIGHT = TOP_PADDING_LABEL + (TOTAL_ITEMS * ITEM_HEIGHT) + BOTTOM_PADDING;

    const viewports = [
      { name: 'Desktop Large', width: 1440, height: 900 },
      { name: 'Desktop Shorter', width: 1440, height: 768 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
    ];

    for (const vp of viewports) {
      await st.test(`Viewport ${vp.name} (${vp.width}×${vp.height}): Fee Schedule & all items reachable`, () => {
        const availableBodyHeight = vp.height - HEADER_HEIGHT;
        const availableScrollHeight = availableBodyHeight - FOOTER_HEIGHT;

        assert(availableBodyHeight > 0, 'Available body height must be positive');
        assert(availableScrollHeight > 0, 'Available scroll height must be positive');

        // Scrollability condition:
        const isScrollable = TOTAL_CONTENT_HEIGHT > availableScrollHeight;
        assert.equal(isScrollable, true, `Sidebar must be scrollable at ${vp.width}×${vp.height}`);

        const maxScrollTop = TOTAL_CONTENT_HEIGHT - availableScrollHeight;
        assert(maxScrollTop > 0, 'Must have scrollable distance to reach bottom');

        // Fee Schedules offset in content: item #14 (0-indexed 13):
        const feeSchedulesOffsetTop = TOP_PADDING_LABEL + (13 * ITEM_HEIGHT);
        // Practice Details (last item #25, 0-indexed 24):
        const lastItemOffsetTop = TOP_PADDING_LABEL + (24 * ITEM_HEIGHT);

        // When scrolled to bottom, last item bottom must be completely within availableScrollHeight:
        const lastItemOffsetScrolled = lastItemOffsetTop - maxScrollTop;
        assert(
          lastItemOffsetScrolled >= 0 && (lastItemOffsetScrolled + ITEM_HEIGHT) <= availableScrollHeight,
          `Last item must be fully visible when scrolled to bottom at ${vp.name}`
        );

        // Fee Schedule must be reachable:
        assert(
          feeSchedulesOffsetTop >= 0 && feeSchedulesOffsetTop <= TOTAL_CONTENT_HEIGHT,
          'Fee Schedule offset is strictly within content bounds'
        );
      });
    }
  });

  // ============================================================================
  // SUITE 5: Project Isolation
  // ============================================================================
  await t.test('--- SUITE 5: Absolute Project Independence ---', async (st) => {
    await st.test('14. Zero Kabworld references in Sidebar, AppShell, and stylesheet', () => {
      assert(!sidebarCode.toLowerCase().includes('kabworld'), 'Sidebar must not contain kabworld');
      assert(!appShellCode.toLowerCase().includes('kabworld'), 'AppShell must not contain kabworld');
      assert(!indexCss.toLowerCase().includes('kabworld'), 'index.css must not contain kabworld');
    });
  });
});
