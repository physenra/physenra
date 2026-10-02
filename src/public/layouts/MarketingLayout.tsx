// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — MARKETING LAYOUT WRAPPER
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
    // Dynamic SEO title & description assignment
    const meta = ROUTE_METADATA[location.pathname];
    const resolvedTitle = title || meta?.title || 'Physenra | Physiotherapy EMR & Practice Management Platform';
    const resolvedDesc = description || meta?.description || 'The specialized clinical EMR and practice operating system for physical therapy clinics.';

    document.title = resolvedTitle;

    let metaDescTag = document.querySelector('meta[name="description"]');
    if (!metaDescTag) {
      metaDescTag = document.createElement('meta');
      metaDescTag.setAttribute('name', 'description');
      document.head.appendChild(metaDescTag);
    }
    metaDescTag.setAttribute('content', resolvedDesc);
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
