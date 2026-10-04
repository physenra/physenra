import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SubscriptionStatusBanner } from '../billing/SubscriptionStatusBanner';
import { ErrorBoundary } from '../common/ErrorBoundary';

export const AppShell: React.FC = () => {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <div className="main-content-container">
            <SubscriptionStatusBanner />
            <ErrorBoundary
              fallbackTitle="Unable to load view"
              fallbackMessage="An unexpected error occurred while rendering this application screen. Your clinical and administrative data are completely safe. Please try again or return to the dashboard."
            >
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
