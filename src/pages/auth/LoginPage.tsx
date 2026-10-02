import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Mail, AlertCircle, ArrowRight, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app/dashboard';

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError.message);
      }
      // Navigation is triggered by the effect when auth state updates
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-brand-header">
          <img
            src="/branding/physenra-logo-dark.png"
            alt="Physenra"
            className="auth-logo-img"
          />
          <p className="auth-subtitle">
            Physiotherapy EMR &amp; Practice Management Platform
          </p>
        </div>

        <div className="auth-card-body">
          <h2 className="auth-heading">Sign in to your practice</h2>
          <p className="auth-description">
            Enter your credentials to access your clinical tenant workspace.
          </p>

          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@practice.com"
                  autoComplete="email"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary btn-auth-submit"
              disabled={submitting || loading}
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-footer-actions" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.625rem' }}>
              Setting up a new physiotherapy practice?
            </p>
            <Link
              to="/register-practice"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: '#059669',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Building2 size={16} />
              <span>Start 14-Day Free Practice Trial</span>
              <ArrowRight size={14} />
            </Link>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>Need an individual account? </span>
              <Link
                to="/signup"
                style={{ color: '#0284c7', fontWeight: 500, textDecoration: 'none' }}
              >
                Create account
              </Link>
            </div>
          </div>
        </div>

        <div className="auth-card-footer">
          <div className="security-notice">
            <Lock size={14} />
            <span>Secure Multi-Tenant Healthcare Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
