import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Compass, Home, LogIn } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { session } = useAuth();

  return (
    <div className="fullscreen-center-page">
      <div className="not-found-card">
        <div className="not-found-icon-wrapper">
          <Compass size={48} className="not-found-icon" />
        </div>
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-desc">
          The requested page or resource could not be found within the Physenra workspace.
        </p>

        <div className="not-found-actions">
          {session ? (
            <Link to="/app/dashboard" className="btn-primary">
              <Home size={16} />
              <span>Return to Dashboard</span>
            </Link>
          ) : (
            <Link to="/login" className="btn-primary">
              <LogIn size={16} />
              <span>Go to Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
