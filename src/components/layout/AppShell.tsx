import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SubscriptionStatusBanner } from '../billing/SubscriptionStatusBanner';

export const AppShell: React.FC = () => {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <div className="main-content-container">
            <SubscriptionStatusBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
