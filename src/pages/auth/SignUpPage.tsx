import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Mail, User, AlertCircle, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated and not in success state, redirect to practice registration or dashboard
  useEffect(() => {
    if (!loading && user && !success) {
      navigate('/register-practice', { replace: true });
    }
  }, [user, loading, success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (!cleanFirstName) {
      setError('Please provide your first name.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    try {
      setSubmitting(true);
      const { error: signUpError } = await signUp(cleanEmail, password, {
        first_name: cleanFirstName,
        last_name: cleanLastName,
        display_name: `${cleanFirstName} ${cleanLastName}`.trim(),
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setError('An account with this email address already exists. Please sign in instead.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Account creation failed. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
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
          {success ? (
            <div className="text-center py-4" style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: '#10b981',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h2 className="auth-heading" style={{ color: '#0f172a', marginBottom: '0.5rem' }}>
                Account Created Successfully!
              </h2>
              <p className="auth-description" style={{ marginBottom: '1.5rem' }}>
                Your Physenra credentials are ready. You can now register a practice workspace with a 14-day free trial.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  to="/register-practice"
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '0.5rem',
                  }}
                >
                  <Building2 size={18} />
                  <span>Register Your Practice Workspace</span>
                  <ArrowRight size={16} />
                </Link>

                <Link
                  to="/login"
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.5rem',
                  }}
                >
                  <span>Go to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="auth-heading">Create your Physenra account</h2>
              <p className="auth-description">
                Enter your details to create an account and access or initialize a practice.
              </p>

              {error && (
                <div className="auth-error-banner" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <div className="input-with-icon">
                      <User size={18} className="input-icon" />
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ada"
                        autoComplete="given-name"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <div className="input-with-icon">
                      <User size={18} className="input-icon" />
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Okonkwo"
                        autoComplete="family-name"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Work Email</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ada@lagosphysio.com"
                      autoComplete="email"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password (min. 8 characters)</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      minLength={8}
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
                  <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>

              <div
                className="auth-footer-actions"
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.625rem' }}>
                  Registering a new physiotherapy practice?
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
                  <span>Use 1-Step Practice Onboarding</span>
                  <ArrowRight size={14} />
                </Link>
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Already have an account? </span>
                  <Link
                    to="/login"
                    style={{ color: '#0284c7', fontWeight: 500, textDecoration: 'none' }}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </>
          )}
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
