// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FOUNDATIONAL MARKETING FOOTER
// File: src/public/components/MarketingFooter.tsx
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { ShieldCheck, Lock } from 'lucide-react';
import { FOOTER_SECTIONS } from '../data/navigation';

export const MarketingFooter: React.FC = () => {
  return (
    <footer className="w-full bg-slate-950 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand & Platform Summary */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <BrandLogo size="md" theme="dark" to="/" />
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-sm">
              The specialized clinical EMR and practice operating system engineered exclusively for physiotherapy clinics, rehabilitation departments, and private clinicians.
            </p>
            <div className="mt-6 flex flex-col gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Strict PostgreSQL Multi-Tenant Row-Level Security</span>
              </div>
              <div className="flex items-center gap-2 text-teal-400 font-medium">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Architectural Platform Admin Privacy Firewall</span>
              </div>
            </div>
          </div>

          {/* Categorized Footer Sections */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="col-span-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">
                {section.title}
              </div>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; 2026 Physenra Platform Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-slate-400 transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-slate-400 transition-colors">
              Privacy Commitment
            </Link>
            <Link to="/security" className="hover:text-slate-400 transition-colors">
              Security Overview
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
