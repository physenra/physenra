// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — FOUNDATIONAL MARKETING HEADER
// File: src/public/components/MarketingHeader.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Menu, X, ChevronDown } from 'lucide-react';
import { PrimaryCTAButton } from './PrimaryCTAButton';
import { MAIN_NAV_ITEMS, FEATURE_SUB_NAV_ITEMS } from '../data/navigation';

export const MarketingHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const location = useLocation();

  // Close menus on route change or Escape key press
  useEffect(() => {
    setMobileMenuOpen(false);
    setFeaturesDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setFeaturesDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          {/* Brand Logo Anchor */}
          <div className="flex items-center gap-6">
            <BrandLogo size="md" to="/" />
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6" aria-label="Main Navigation">
              {/* Features Dropdown Menu */}
              <div
                className="relative"
                onMouseEnter={() => setFeaturesDropdownOpen(true)}
                onMouseLeave={() => setFeaturesDropdownOpen(false)}
              >
                <button
                  type="button"
                  aria-expanded={featuresDropdownOpen}
                  aria-haspopup="true"
                  onClick={() => setFeaturesDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-teal-800 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                >
                  <span>Features</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${featuresDropdownOpen ? 'rotate-180 text-teal-600' : 'text-slate-400'}`} />
                </button>

                {featuresDropdownOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-lg ring-1 ring-slate-900/5 grid gap-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                    role="menu"
                  >
                    <Link
                      to="/features"
                      className="block p-2 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-100 transition-colors"
                      role="menuitem"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-teal-800">
                        Features Overview
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Explore all specialized physiotherapy software modules
                      </div>
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <div className="grid gap-0.5 max-h-80 overflow-y-auto pr-1">
                      {FEATURE_SUB_NAV_ITEMS.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="p-2 rounded-lg hover:bg-slate-50 transition-colors group text-left"
                          role="menuitem"
                        >
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-700">
                            {item.label}
                          </div>
                          {item.description && (
                            <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Top-Level Links */}
              {MAIN_NAV_ITEMS.filter((item) => item.label !== 'Features').map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`text-sm font-semibold transition-colors py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded ${
                    location.pathname === item.href
                      ? 'text-teal-700'
                      : 'text-slate-700 hover:text-teal-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Desktop Conversion Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              Log In
            </Link>
            <PrimaryCTAButton size="md" to="/register-practice">
              Start 14-Day Free Trial
            </PrimaryCTAButton>
          </div>

          {/* Mobile Actions & Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-2 py-1.5 rounded transition-colors"
            >
              Log In
            </Link>
            <PrimaryCTAButton size="sm" to="/register-practice" showArrow={false}>
              Free Trial
            </PrimaryCTAButton>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-2 duration-150"
          role="dialog"
          aria-label="Mobile Navigation"
        >
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
              Navigation
            </div>
            <Link
              to="/"
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-900 hover:bg-slate-50 hover:text-teal-700"
            >
              Home
            </Link>
            <Link
              to="/features"
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-900 hover:bg-slate-50 hover:text-teal-700"
            >
              Features Overview
            </Link>
            <div className="pl-4 space-y-0.5 border-l-2 border-slate-100 ml-3 my-1">
              <Link
                to="/features/physiotherapy-emr"
                className="block py-1.5 text-sm font-medium text-slate-600 hover:text-teal-700"
              >
                Physiotherapy EMR
              </Link>
              <Link
                to="/features/medical-imaging"
                className="block py-1.5 text-sm font-medium text-slate-600 hover:text-teal-700"
              >
                DICOM Imaging & PACS
              </Link>
              <Link
                to="/features/treatment-packages"
                className="block py-1.5 text-sm font-medium text-slate-600 hover:text-teal-700"
              >
                Packages & Wallets
              </Link>
              <Link
                to="/features/billing"
                className="block py-1.5 text-sm font-medium text-slate-600 hover:text-teal-700"
              >
                Invoicing & Billing
              </Link>
              <Link
                to="/features/appointments"
                className="block py-1.5 text-sm font-medium text-slate-600 hover:text-teal-700"
              >
                Appointment Scheduling
              </Link>
            </div>
            <Link
              to="/pricing"
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-900 hover:bg-slate-50 hover:text-teal-700"
            >
              Pricing
            </Link>
            <Link
              to="/security"
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-900 hover:bg-slate-50 hover:text-teal-700"
            >
              Security Architecture
            </Link>
            <Link
              to="/about"
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-900 hover:bg-slate-50 hover:text-teal-700"
            >
              About Physenra
            </Link>
            <Link
              to="/faq"
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-900 hover:bg-slate-50 hover:text-teal-700"
            >
              FAQs
            </Link>
            <Link
              to="/contact"
              className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-900 hover:bg-slate-50 hover:text-teal-700"
            >
              Contact Support
            </Link>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <PrimaryCTAButton size="lg" to="/register-practice" className="w-full">
              Start 14-Day Free Trial
            </PrimaryCTAButton>
            <Link
              to="/login"
              className="w-full text-center py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign In to Your Practice
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
