import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PracticeSettingsPage } from './pages/practice/PracticeSettingsPage';
import { NoPracticePage } from './pages/error/NoPracticePage';
import { NotFoundPage } from './pages/error/NotFoundPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated user with no practice assigned */}
      <Route path="/no-practice" element={<NoPracticePage />} />

      {/* Root redirection to dashboard */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      {/* Protected Practice Application Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="practice" element={<PracticeSettingsPage />} />
      </Route>

      {/* Unmatched 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
export default App;
