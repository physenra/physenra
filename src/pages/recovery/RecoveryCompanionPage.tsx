import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Calendar,
  Clock,
  Shield,
  Phone,
  Mail,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  LogOut,
  Info,
} from 'lucide-react';
import {
  recoveryCompanionService,
  RecoveryProgramPayload,
  DifficultyRating,
} from '../../services/recoveryCompanionService';
import { ExerciseVisualCard } from '../../components/hep/ExerciseVisualCard';

export const RecoveryCompanionPage: React.FC = () => {
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [programData, setProgramData] = useState<RecoveryProgramPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check-in form state
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);
  const [painRating, setPainRating] = useState<number | null>(null);
  const [difficultyRating, setDifficultyRating] = useState<DifficultyRating | null>(null);
  const [patientNotes, setPatientNotes] = useState('');

  // History expansion
  const [showHistory, setShowHistory] = useState(false);

  // Handle access code verification
  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || accessCodeInput;
    if (!code || !code.trim()) {
      setError('Please enter your access code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await recoveryCompanionService.verifyAccessCode(code);
      setProgramData(data);
      setActiveCode(recoveryCompanionService.normalizeCode(code));
      // Pre-select all prescribed exercises in check-in form
      setCompletedExerciseIds(data.items.map((i) => i.exercise_id));
    } catch (err: any) {
      setError(err.message || 'Unable to load your exercise program. Please verify your code.');
      setProgramData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session check-in submission
  const handleSubmitCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCode) return;

    setIsSubmittingCheckIn(true);
    setError(null);

    try {
      await recoveryCompanionService.submitCheckIn(activeCode, {
        painRating,
        difficultyRating,
        notes: patientNotes,
        completedExercises: completedExerciseIds,
      });

      setCheckInSuccess(true);
      setIsCheckInOpen(false);

      // Re-fetch program to get updated history
      const refreshed = await recoveryCompanionService.verifyAccessCode(activeCode);
      setProgramData(refreshed);

      // Reset form
      setPatientNotes('');
      setPainRating(null);
      setDifficultyRating(null);

      setTimeout(() => setCheckInSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to record session check-in. Please try again.');
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const handleToggleExerciseCompletion = (exerciseId: string) => {
    setCompletedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const handleSignOut = () => {
    setActiveCode(null);
    setProgramData(null);
    setAccessCodeInput('');
    setError(null);
  };

  // ----------------------------------------------------------------------------
  // VIEW 1: Access Code Entry Screen (Mobile-First, Low Data)
  // ----------------------------------------------------------------------------
  if (!programData || !activeCode) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '2rem 1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                marginBottom: '1rem',
              }}
            >
              <Activity size={28} />
            </div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: '0 0 0.5rem 0',
              }}
            >
              Physenra Recovery Companion
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              Access your personalized clinical exercise program and record your recovery progress.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1.25rem',
                color: '#b91c1c',
                fontSize: '0.875rem',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Access Code Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
          >
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="accessCode"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.375rem',
                }}
              >
                Access Code
              </label>
              <input
                id="accessCode"
                type="text"
                autoComplete="off"
                autoFocus
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. RCV-7K9M2"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                  textTransform: 'uppercase',
                }}
              />
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
                Provided on your exercise prescription or clinic confirmation.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !accessCodeInput.trim()}
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading || !accessCodeInput.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !accessCodeInput.trim() ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isLoading ? 'Verifying...' : 'View My Program'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Privacy & Security Safeguard Reassurance */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#64748b',
              fontSize: '0.75rem',
              lineHeight: 1.4,
            }}
          >
            <Shield size={18} style={{ color: '#059669', flexShrink: 0 }} />
            <span>
              Secure, private clinical connection. No app installation or account password required.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // VIEW 2: Patient Active Program & Check-In Experience
  // ----------------------------------------------------------------------------
  const program = programData.program;
  const clinician = programData.clinician;
  const practice = programData.practice;
  const items = programData.items || [];
  const checkIns = programData.recent_check_ins || [];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        paddingBottom: '3rem',
      }}
    >
      {/* Top Mobile Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
              Physenra Recovery
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
              {practice.name}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          title="Exit Session"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.625rem',
            backgroundColor: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          <LogOut size={14} />
          Exit
        </button>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem' }}>
        {/* Success Alert */}
        {checkInSuccess && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              padding: '0.875rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#065f46',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={20} style={{ color: '#059669', flexShrink: 0 }} />
            <div>
              <strong>Session Recorded!</strong> Your check-in has been sent to your physiotherapist.
            </div>
          </div>
        )}

        {/* Program Header Card */}
        <section
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            <CheckCircle2 size={12} /> Active Prescription
          </div>

          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 0.5rem 0',
              lineHeight: 1.3,
            }}
          >
            {program.title}
          </h2>

          <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '0.75rem' }}>
            Prescribed by: <strong>{clinician.display_name}</strong>
          </div>

          {program.instructions && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderLeft: '3px solid #2563eb',
                padding: '0.625rem 0.875rem',
                borderRadius: '0 6px 6px 0',
                fontSize: '0.8125rem',
                color: '#334155',
                lineHeight: 1.5,
                marginBottom: '0.875rem',
              }}
            >
              {program.instructions}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.75rem',
              color: '#64748b',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Calendar size={14} /> Start: {program.start_date}
            </div>
            {program.review_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Clock size={14} /> Next Review: {program.review_date}
              </div>
            )}
          </div>
        </section>

        {/* Check-In Action Card */}
        <section
          style={{
            backgroundColor: '#2563eb',
            borderRadius: '12px',
            padding: '1.25rem',
            color: '#ffffff',
            marginBottom: '1.25rem',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Session Progress
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {checkIns.length} {checkIns.length === 1 ? 'Session' : 'Sessions'} Completed
              </div>
            </div>

            <button
              onClick={() => setIsCheckInOpen(!isCheckInOpen)}
              style={{
                backgroundColor: '#ffffff',
                color: '#2563eb',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {isCheckInOpen ? 'Close Form' : 'Record Session'}
            </button>
          </div>

          {/* Interactive Check-In Form Drawer */}
          {isCheckInOpen && (
            <form
              onSubmit={handleSubmitCheckIn}
              style={{
                marginTop: '1.25rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Completed Exercises:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {items.map((item) => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={completedExerciseIds.includes(item.exercise_id)}
                      onChange={() => handleToggleExerciseCompletion(item.exercise_id)}
                      style={{ width: '16px', height: '16px', accentColor: '#ffffff' }}
                    />
                    <span>{item.exercise_name}</span>
                  </label>
                ))}
              </div>

              {/* Optional Pain Rating (0-10) */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Current Pain Level (Optional: 0 = None, 10 = Severe):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setPainRating(painRating === num ? null : num)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        backgroundColor: painRating === num ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                        color: painRating === num ? '#2563eb' : '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Difficulty Rating */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Session Difficulty (Optional):
                </label>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'very_easy', label: 'Very Easy' },
                    { key: 'easy', label: 'Easy' },
                    { key: 'moderate', label: 'Moderate' },
                    { key: 'hard', label: 'Hard' },
                    { key: 'very_hard', label: 'Very Hard' },
                  ].map((diff) => (
                    <button
                      type="button"
                      key={diff.key}
                      onClick={() =>
                        setDifficultyRating(difficultyRating === diff.key ? null : (diff.key as DifficultyRating))
                      }
                      style={{
                        padding: '0.375rem 0.625rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        backgroundColor: difficultyRating === diff.key ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                        color: difficultyRating === diff.key ? '#2563eb' : '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Notes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                  Note for your physiotherapist (Optional):
                </label>
                <textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  maxLength={1000}
                  placeholder="e.g. Completed all sets, felt slight hamstring tightness on final rep."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.8125rem',
                    boxSizing: 'border-box',
                    minHeight: '60px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingCheckIn}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#ffffff',
                  color: '#2563eb',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isSubmittingCheckIn ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmittingCheckIn ? 'Submitting...' : 'Save Completed Session'}
              </button>
            </form>
          )}
        </section>

        {/* Prescribed Exercises Section */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Prescribed Exercises ({items.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item, idx) => (
              <article
                key={item.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Exercise Title and Order */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        marginBottom: '0.25rem',
                      }}
                    >
                      EXERCISE #{idx + 1}
                    </span>
                    <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {item.exercise_name}
                    </h4>
                  </div>
                </div>

                {/* Approved Photographic Demonstration Area */}
                <div style={{ marginBottom: '1rem' }}>
                  <ExerciseVisualCard
                    exerciseId={item.exercise_id}
                    exerciseName={item.exercise_name}
                    bodyRegion={item.body_region}
                    category={item.category}
                    size="lg"
                    showPhases={true}
                    showApprovalBadge={true}
                  />
                </div>

                {/* Dosage Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                    gap: '0.5rem',
                    backgroundColor: '#f8fafc',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem',
                  }}
                >
                  {item.sets && (
                    <div>
                      <div style={{ color: '#64748b' }}>Sets</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.sets}</div>
                    </div>
                  )}
                  {item.repetitions && (
                    <div>
                      <div style={{ color: '#64748b' }}>Reps</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.repetitions}</div>
                    </div>
                  )}
                  {item.hold_seconds && (
                    <div>
                      <div style={{ color: '#64748b' }}>Hold</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.hold_seconds}s</div>
                    </div>
                  )}
                  {item.duration_minutes && (
                    <div>
                      <div style={{ color: '#64748b' }}>Duration</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.duration_minutes} min</div>
                    </div>
                  )}
                  {item.frequency && (
                    <div>
                      <div style={{ color: '#64748b' }}>Frequency</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.frequency}</div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                {item.instructions && (
                  <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                    <strong>Instructions:</strong> {item.instructions}
                  </div>
                )}

                {/* Precautions */}
                {item.precautions && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#b45309',
                      backgroundColor: '#fffbeb',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.375rem',
                    }}
                  >
                    <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>{item.precautions}</div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* History Accordion */}
        {checkIns.length > 0 && (
          <section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                My Completed Sessions History ({checkIns.length})
              </div>
              {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showHistory && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {checkIns.map((ci) => (
                  <div
                    key={ci.id}
                    style={{
                      borderLeft: '3px solid #059669',
                      padding: '0.625rem 0.875rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem' }}>
                      <span>{new Date(ci.completed_at).toLocaleDateString()} at {new Date(ci.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {ci.pain_rating !== null && <span>Pain: {ci.pain_rating}/10</span>}
                    </div>
                    {ci.difficulty_rating && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#475569' }}>
                        Effort: <strong>{ci.difficulty_rating.replace('_', ' ')}</strong>
                      </div>
                    )}
                    {ci.patient_notes && (
                      <div style={{ marginTop: '0.375rem', color: '#334155', fontStyle: 'italic' }}>
                        "{ci.patient_notes}"
                      </div>
                    )}
                    {ci.clinician_reviewed_at && (
                      <div style={{ marginTop: '0.5rem', color: '#059669', fontSize: '0.6875rem', fontWeight: 600 }}>
                        ? Reviewed by Physiotherapist
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Clinic Contact & Safety Support */}
        <section
          style={{
            backgroundColor: '#f1f5f9',
            borderRadius: '12px',
            padding: '1rem',
            fontSize: '0.75rem',
            color: '#475569',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem' }}>
            Need to reach your physiotherapist?
          </div>
          <div>Contact {practice.name}:</div>
          <div style={{ marginTop: '0.375rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {practice.phone && (
              <a
                href={`tel:${practice.phone}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
              >
                <Phone size={12} /> {practice.phone}
              </a>
            )}
            {practice.email && (
              <a
                href={`mailto:${practice.email}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
              >
                <Mail size={12} /> {practice.email}
              </a>
            )}
          </div>

          <div
            style={{
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e2e8f0',
              fontSize: '0.6875rem',
              color: '#64748b',
            }}
          >
            Clinical Safety Notice: This program is prescribed specifically for your rehabilitation plan. It does not provide medical diagnosis. If you experience acute pain, dizziness, or chest discomfort, stop immediately and contact your clinic.
          </div>
        </section>
      </main>
    </div>
  );
};
