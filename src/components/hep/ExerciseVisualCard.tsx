import React, { useState } from 'react';
import { ShieldCheck, Camera } from 'lucide-react';
import {
  getExerciseVisual,
  getExercisePhotoDemonstration,
} from '../../services/exerciseVisualRegistry';
import type { ExerciseBodyRegion, ExerciseCategory } from '../../types/models';

interface ExerciseVisualCardProps {
  exerciseId: string;
  exerciseName: string;
  bodyRegion: ExerciseBodyRegion;
  category?: ExerciseCategory;
  size?: 'thumbnail' | 'sm' | 'md' | 'lg';
  showPhases?: boolean;
  showApprovalBadge?: boolean;
  isPrintView?: boolean;
  /** @deprecated Vector illustrations have been retired; photo demonstrations are standard */
  allowPhotoToggle?: boolean;
  /** Clinician review preview mode (optional flag, still subject to clinical review status in production) */
  showPhotoReviewPreview?: boolean;
  style?: React.CSSProperties;
}

export const ExerciseVisualCard: React.FC<ExerciseVisualCardProps> = ({
  exerciseId,
  exerciseName,
  bodyRegion,
  category,
  size = 'md',
  showPhases = false,
  showApprovalBadge = false,
  isPrintView = false,
  style = {},
}) => {
  const [imageError, setImageError] = useState(false);
  const photo = getExercisePhotoDemonstration(exerciseId);
  const visual = getExerciseVisual(exerciseId);
  const isPhotoApproved = photo?.photoClinicalReviewStatus === 'approved';

  // Sizing definitions
  const dimensions = {
    thumbnail: { width: '80px', height: '60px', borderRadius: '4px' },
    sm: { width: '140px', height: '100px', borderRadius: '6px' },
    md: { width: '220px', height: '150px', borderRadius: '8px' },
    lg: { width: '100%', maxWidth: '340px', height: 'auto', borderRadius: '8px' },
  }[size];

  // Strictly enforce human physiotherapist clinical sign-off:
  // Only approved photos are rendered to patients and clinicians.
  const hasApprovedPhoto = photo !== null && isPhotoApproved && !imageError;

  if (hasApprovedPhoto && photo) {
    return (
      <div
        className="exercise-visual-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          ...style,
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: dimensions.borderRadius,
            width: dimensions.width,
            maxWidth: '100%',
          }}
        >
          <img
            src={photo.photoAssetPath}
            alt={photo.photoAltText || `${exerciseName} photographic demonstration`}
            loading="lazy"
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: size === 'thumbnail' ? '60px' : 'auto',
              display: 'block',
              objectFit: 'cover',
              aspectRatio: '320 / 220',
            }}
          />

          {/* Clinically Verified Photo Badge */}
          {showApprovalBadge && !isPrintView && size !== 'thumbnail' && (
            <div
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(4px)',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: '#0d9488',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                border: '1px solid #ccfbf1',
              }}
            >
              <ShieldCheck size={11} />
              <span>Clinically Verified Photo</span>
            </div>
          )}
        </div>

        {/* Movement phases / Technique guidance breakdown */}
        {showPhases && visual?.movementPhases && (
          <div
            style={{
              fontSize: '0.75rem',
              color: '#475569',
              lineHeight: 1.4,
              backgroundColor: '#f1f5f9',
              padding: '0.35rem 0.5rem',
              borderRadius: '4px',
              borderLeft: '2px solid #0d9488',
            }}
          >
            <strong style={{ color: '#0f766e', display: 'block', marginBottom: '0.1rem' }}>
              Technique Movement Arc:
            </strong>
            {visual.movementPhases}
          </div>
        )}
      </div>
    );
  }

  // Clean, neutral, patient-safe placeholder for exercises pending photo sign-off
  return (
    <div
      className="exercise-visual-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        ...style,
      }}
    >
      <div
        className="exercise-visual-placeholder"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: dimensions.borderRadius,
          padding: size === 'thumbnail' ? '0.25rem' : '0.75rem',
          width: dimensions.width,
          maxWidth: '100%',
          height: size === 'thumbnail' ? '60px' : size === 'sm' ? '100px' : size === 'md' ? '150px' : '180px',
          textAlign: 'center',
          color: '#64748b',
          boxSizing: 'border-box',
        }}
      >
        <Camera
          size={size === 'thumbnail' ? 14 : 20}
          style={{ color: '#94a3b8', marginBottom: '0.25rem' }}
          aria-hidden="true"
        />
        {size !== 'thumbnail' && (
          <>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#475569',
                textTransform: 'capitalize',
                lineHeight: 1.2,
              }}
            >
              {category ? `${category.replace('_', ' ')} • ` : ''}{bodyRegion.replace('_', ' ')}
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#64748b',
                marginTop: '0.25rem',
                fontWeight: 500,
              }}
            >
              Photo demonstration coming soon
            </span>
          </>
        )}
      </div>

      {/* Movement phases / Technique guidance breakdown if requested */}
      {showPhases && visual?.movementPhases && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#475569',
            lineHeight: 1.4,
            backgroundColor: '#f1f5f9',
            padding: '0.35rem 0.5rem',
            borderRadius: '4px',
            borderLeft: '2px solid #94a3b8',
          }}
        >
          <strong style={{ color: '#475569', display: 'block', marginBottom: '0.1rem' }}>
            Technique Movement Arc:
          </strong>
          {visual.movementPhases}
        </div>
      )}
    </div>
  );
};
