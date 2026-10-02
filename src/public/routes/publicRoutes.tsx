// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — ROUTE DEFINITIONS & LAZY LOADERS
// File: src/public/routes/publicRoutes.tsx
// ==============================================================================

import React, { lazy, Suspense } from 'react';

// Code-split public page components
export const HomePageShell = lazy(() =>
  import('../pages/HomePageShell').then((m) => ({ default: m.HomePageShell }))
);
export const FeaturesHubShell = lazy(() =>
  import('../pages/FeaturesHubShell').then((m) => ({ default: m.FeaturesHubShell }))
);
export const FeatureDetailShell = lazy(() =>
  import('../pages/FeatureDetailShell').then((m) => ({ default: m.FeatureDetailShell }))
);
export const SecurityPageShell = lazy(() =>
  import('../pages/SecurityPageShell').then((m) => ({ default: m.SecurityPageShell }))
);
export const AboutPageShell = lazy(() =>
  import('../pages/AboutPageShell').then((m) => ({ default: m.AboutPageShell }))
);
export const ContactPageShell = lazy(() =>
  import('../pages/ContactPageShell').then((m) => ({ default: m.ContactPageShell }))
);
export const FAQPageShell = lazy(() =>
  import('../pages/FAQPageShell').then((m) => ({ default: m.FAQPageShell }))
);
export const TermsPageShell = lazy(() =>
  import('../pages/TermsPageShell').then((m) => ({ default: m.TermsPageShell }))
);
export const PrivacyPageShell = lazy(() =>
  import('../pages/PrivacyPageShell').then((m) => ({ default: m.PrivacyPageShell }))
);

export const PublicLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-white flex items-center justify-center text-teal-800">
    <div className="inline-flex items-center gap-2 font-medium text-sm animate-pulse">
      Loading Physenra...
    </div>
  </div>
);

/**
 * Public website route definitions helper for React Router
 */
export const withPublicSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PublicLoadingFallback />}>
    <Component />
  </Suspense>
);
