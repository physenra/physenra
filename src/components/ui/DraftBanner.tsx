// ==============================================================================
// PHYSENRA — FORM DRAFT STATUS & RESTORATION BANNER COMPONENT
// File: src/components/ui/DraftBanner.tsx
//
// Governs:
// 1. Visible status badge indicating unsaved changes vs authoritative saved data.
// 2. Clear real-time status: "Saving..." / "Draft saved" / "Couldn't save".
// 3. High-visibility recovery notification when returning to an uncommitted draft.
// 4. User-controlled explicit draft discard action with confirmation warning.
// 5. Accessibility and responsive styling adhering to Physenra UI standards.
// ==============================================================================

import React, { useState } from 'react';
import { Clock, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { DraftSaveStatus } from '../../services/formDraftService';

export interface DraftBannerProps {
  isRestored: boolean;
  restoredAt: string | null;
  isDirty: boolean;
  saveStatus?: DraftSaveStatus;
  onDiscard: () => void;
  entityName?: string;
  className?: string;
}

export const DraftBanner: React.FC<DraftBannerProps> = ({
  isRestored,
  restoredAt,
  isDirty,
  saveStatus = 'idle',
  onDiscard,
  entityName = 'record',
  className = '',
}) => {
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  if (!isRestored && !isDirty && saveStatus === 'idle') {
    return null;
  }

  const formatRestoredTime = (isoString: string | null): string => {
    if (!isoString) return 'a previous session';
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' on ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      );
    } catch {
      return 'a previous session';
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirmDiscard(false);
    onDiscard();
  };

  return (
    <div className={`draft-banner-container space-y-2 mb-4 ${className}`}>
      {/* Restored Draft Notification Banner */}
      {isRestored && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 shadow-sm"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs">
              <span className="font-semibold text-amber-950">
                Unsaved {entityName} draft restored:
              </span>{' '}
              <span>
                Recovered changes from {formatRestoredTime(restoredAt)}. Your work is safely held until submitted.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {showConfirmDiscard ? (
              <div className="flex items-center gap-1.5 bg-white p-1 px-2 rounded-lg border border-rose-200">
                <span className="text-[11px] text-rose-700 font-medium">Discard changes?</span>
                <button
                  type="button"
                  onClick={handleConfirmDiscard}
                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-700 transition"
                >
                  Yes, Discard
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDiscard(false)}
                  className="px-2 py-0.5 text-slate-600 text-[11px] hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDiscard(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition shadow-2xs"
                title="Discard recovered draft and return to clean state"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Discard Draft</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Real-time Save Status & Unsaved Changes Status Bar */}
      {isDirty && !isRestored && (
        <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium text-slate-700">Unsaved changes</span>

            {/* Dynamic Real-time Save Status Badges */}
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                <Check className="w-3 h-3 text-teal-600" />
                Draft saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                Couldn't save to server (held securely in session memory)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onDiscard}
            className="text-[11px] text-slate-500 hover:text-rose-600 underline transition"
          >
            Reset form
          </button>
        </div>
      )}
    </div>
  );
};
