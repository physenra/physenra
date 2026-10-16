import React, { useState } from 'react';
import { Dumbbell, ShieldCheck, Clock, Camera, AlertCircle } from 'lucide-react';
import {
  getExerciseVisual,
  getExercisePhotoDemonstration,
  ExerciseVisualMetadata,
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
  allowPhotoToggle?: boolean;
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
  allowPhotoToggle = false,
  showPhotoReviewPreview = false,
  style = {},
}) => {
  const [imageError, setImageError] = useState(false);
  const visual: ExerciseVisualMetadata | null = getExerciseVisual(exerciseId);
  const photo = getExercisePhotoDemonstration(exerciseId);
  const isPhotoApproved = photo?.photoClinicalReviewStatus === 'approved';

  // Sizing definitions
  const dimensions = {
    thumbnail: { width: '80px', height: '60px', borderRadius: '4px' },
    sm: { width: '140px', height: '100px', borderRadius: '6px' },
    md: { width: '220px', height: '150px', borderRadius: '8px' },
    lg: { width: '100%', maxWidth: '340px', height: 'auto', borderRadius: '8px' },
  }[size];

  // Default to approved photo if available, or respect showPhotoReviewPreview, otherwise illustration
  const [activeView, setActiveView] = useState<'illustration' | 'photo'>(
    isPhotoApproved ? 'photo' : (showPhotoReviewPreview ? 'photo' : 'illustration')
  );

  const canShowPhoto = photo !== null && (isPhotoApproved || allowPhotoToggle || showPhotoReviewPreview);
  const isShowingPhoto = activeView === 'photo' && canShowPhoto;
  const currentAssetPath = isShowingPhoto ? photo.photoAssetPath : visual?.assetPath;
  const currentAltText = isShowingPhoto
    ? photo.photoAltText
    : visual?.altText || `${exerciseName} technique illustration`;

  // If a valid visual asset exists (approved vector or approved/preview photo)
  if (currentAssetPath && !imageError) {
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
            border: isShowingPhoto && !isPhotoApproved ? '1px solid #fed7aa' : '1px solid #e2e8f0',
            borderRadius: dimensions.borderRadius,
            width: dimensions.width,
            maxWidth: '100%',
          }}
        >
          <img
            src={currentAssetPath}
            alt={currentAltText}
            loading="lazy"
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: size === 'thumbnail' ? '60px' : 'auto',
              display: 'block',
              objectFit: isShowingPhoto ? 'cover' : 'contain',
              aspectRatio: '320 / 220',
            }}
          />

          {/* Badges */}
          {showApprovalBadge && !isPrintView && size !== 'thumbnail' && (
            <div
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: isShowingPhoto && !isPhotoApproved ? 'rgba(255, 251, 235, 0.95)' : 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(4px)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.625rem',
                fontWeight: 600,
                color: isShowingPhoto && !isPhotoApproved ? '#b45309' : '#0d9488',
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                border: isShowingPhoto && !isPhotoApproved ? '1px solid #fde68a' : '1px solid #ccfbf1',
              }}
            >
              {isShowingPhoto ? (
                isPhotoApproved ? (
                  <>
                    <ShieldCheck size={11} />
                    <span>Clinically Verified Photo</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={11} />
                    <span>AI Generated • Pending PT Review</span>
                  </>
                )
              ) : (
                <>
                  <ShieldCheck size={11} />
                  <span>Clinically Reviewed</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* View Toggle Bar (enabled for approved photos or clinician review) */}
        {(allowPhotoToggle || isPhotoApproved) && photo && visual && visual.assetPath && size !== 'thumbnail' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.15rem',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveView('illustration')}
              style={{
                fontSize: '0.6875rem',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: activeView === 'illustration' ? '#0284c7' : '#ffffff',
                color: activeView === 'illustration' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                fontWeight: activeView === 'illustration' ? 600 : 400,
              }}
            >
              Illustration
            </button>
            <button
              type="button"
              onClick={() => setActiveView('photo')}
              style={{
                fontSize: '0.6875rem',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: activeView === 'photo' ? (isPhotoApproved ? '#0d9488' : '#b45309') : '#ffffff',
                color: activeView === 'photo' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                fontWeight: activeView === 'photo' ? 600 : 400,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <Camera size={11} />
              {isPhotoApproved ? 'Photo Demo' : 'Photo Demo (In Review)'}
            </button>
          </div>
        )}

        {/* Movement phases breakdown */}
        {showPhases && visual?.movementPhases && (
          <div
            style={{
              fontSize: '0.75rem',
              color: '#475569',
              lineHeight: 1.4,
              backgroundColor: '#f1f5f9',
              padding: '0.35rem 0.5rem',
              borderRadius: '4px',
              borderLeft: '2px solid #0284c7',
            }}
          >
            <strong style={{ color: '#0369a1', display: 'block', marginBottom: '0.1rem' }}>
              Technique Movement Arc:
            </strong>
            {visual.movementPhases}
          </div>
        )}
      </div>
    );
  }

  // Graceful, dignified fallback card for unreviewed, custom, or pending exercises
  return (
    <div
      className="exercise-visual-placeholder"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        border: '1px dashed #cbd5e1',
        borderRadius: dimensions.borderRadius,
        padding: size === 'thumbnail' ? '0.25rem' : '0.75rem',
        width: dimensions.width,
        height: size === 'thumbnail' ? '60px' : size === 'sm' ? '100px' : '150px',
        textAlign: 'center',
        color: '#64748b',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <Dumbbell size={size === 'thumbnail' ? 16 : 22} style={{ color: '#94a3b8', marginBottom: '0.25rem' }} />
      {size !== 'thumbnail' && (
        <>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: '#475569',
              textTransform: 'capitalize',
            }}
          >
            {category ? `${category.replace('_', ' ')} • ` : ''}{bodyRegion.replace('_', ' ')}
          </span>
          <span
            style={{
              fontSize: '0.625rem',
              color: '#94a3b8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              marginTop: '0.15rem',
            }}
          >
            <Clock size={10} />
            Visual in review
          </span>
        </>
      )}
    </div>
  );
};
