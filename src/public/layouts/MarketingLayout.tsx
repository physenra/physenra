// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — MARKETING LAYOUT WRAPPER (PHASE 1C ENHANCED)
// File: src/public/layouts/MarketingLayout.tsx
// ==============================================================================

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MarketingHeader } from '../components/MarketingHeader';
import { MarketingFooter } from '../components/MarketingFooter';
import { ROUTE_METADATA } from '../data/seo';

interface MarketingLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const MarketingLayout: React.FC<MarketingLayoutProps> = ({
  children,
  title,
  description,
}) => {
  const location = useLocation();

  useEffect(() => {
    // Dynamic SEO, Canonical & OpenGraph assignment
    const meta = ROUTE_METADATA[location.pathname];
    const resolvedTitle = title || meta?.title || 'Physenra | Physiotherapy EMR & Practice Management Platform';
    const resolvedDesc =
      description || meta?.description || 'The specialized clinical EMR and practice operating system for physical therapy clinics.';
    const resolvedCanonical = meta?.canonical || `https://physenra.com${location.pathname}`;
    const resolvedOgTitle = meta?.ogTitle || resolvedTitle;
    const resolvedOgDesc = meta?.ogDescription || resolvedDesc;
    const resolvedOgUrl = meta?.ogUrl || resolvedCanonical;
    const resolvedOgType = meta?.ogType || 'website';
    const resolvedOgImage = meta?.ogImage || 'https://physenra.com/images/og-physenra-platform.png';
    const resolvedTwitterCard = meta?.twitterCard || 'summary_large_image';

    // 1. Document Title
    document.title = resolvedTitle;

    // Helper: upsert meta tag by attribute name
    const upsertMeta = (attrKey: 'name' | 'property', attrVal: string, content: string) => {
      let tag = document.querySelector(`meta[${attrKey}="${attrVal}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrKey, attrVal);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // 2. Meta description & Canonical
    upsertMeta('name', 'description', resolvedDesc);

    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', resolvedCanonical);

    // 3. OpenGraph tags
    upsertMeta('property', 'og:title', resolvedOgTitle);
    upsertMeta('property', 'og:description', resolvedOgDesc);
    upsertMeta('property', 'og:url', resolvedOgUrl);
    upsertMeta('property', 'og:type', resolvedOgType);
    upsertMeta('property', 'og:image', resolvedOgImage);
    upsertMeta('property', 'og:site_name', 'Physenra');

    // 4. Twitter tags
    upsertMeta('name', 'twitter:card', resolvedTwitterCard);
    upsertMeta('name', 'twitter:title', resolvedOgTitle);
    upsertMeta('name', 'twitter:description', resolvedOgDesc);
    upsertMeta('name', 'twitter:image', resolvedOgImage);
  }, [location.pathname, title, description]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased selection:bg-teal-100 selection:text-teal-900 w-full overflow-x-hidden">
      <MarketingHeader />
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
};
