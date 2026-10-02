// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — DESIGN SYSTEM TOKENS
// File: src/public/styles/tokens.ts
// ==============================================================================

export const DESIGN_TOKENS = {
  colors: {
    brandTeal: {
      900: '#134E4A',
      800: '#115E59',
      700: '#0F766E',
      600: '#0D9488', // Primary Physenra Teal
      500: '#14B8A6',
      100: '#CCFBF1',
      50: '#F0FDFA',
    },
    accentEmerald: {
      700: '#047857',
      600: '#059669', // Primary Conversion Action
      500: '#10B981',
      100: '#D1FAE5',
      50: '#ECFDF5',
    },
    neutralSlate: {
      950: '#020617', // Dark Platform Footer
      900: '#0F172A', // Main Headings & Dark Anchors
      800: '#1E293B',
      700: '#334155', // Body Text (WCAG AAA)
      600: '#475569',
      500: '#64748B', // Metadata & Secondary Text
      400: '#94A3B8',
      300: '#CBD5E1', // Inactive Borders
      200: '#E2E8F0', // Card Borders & Table Lines
      100: '#F1F5F9', // Subtle Backgrounds
      50: '#F8FAFC',  // Light Card Canvas
    },
    canvasWhite: '#FFFFFF',
    status: {
      active: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
      scheduled: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
      warning: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
      critical: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
    },
  },
  typography: {
    heroHeading: 'text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight',
    sectionHeading: 'text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight',
    cardHeading: 'text-lg sm:text-xl font-bold text-slate-900',
    bodyLead: 'text-base sm:text-lg text-slate-600 leading-relaxed',
    bodyStandard: 'text-sm sm:text-base text-slate-700 leading-normal',
    caption: 'text-xs text-slate-500',
    kicker: 'text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200/60 rounded-full px-3 py-1 inline-flex items-center gap-1.5',
  },
  radius: {
    button: 'rounded-lg',
    card: 'rounded-xl sm:rounded-2xl',
    pill: 'rounded-full',
    browserFrame: 'rounded-xl sm:rounded-2xl',
  },
  shadows: {
    card: 'shadow-2xs hover:shadow-sm transition-shadow duration-200',
    elevated: 'shadow-md ring-1 ring-slate-900/5',
    productPreview: 'shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/10',
  },
  containers: {
    maxWidth: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    proseWidth: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
    sectionPadding: 'py-16 sm:py-24',
  },
};
