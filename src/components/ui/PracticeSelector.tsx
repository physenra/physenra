import React, { useState, useRef, useEffect } from 'react';
import { usePractice } from '../../hooks/usePractice';
import { Building2, ChevronDown, Check } from 'lucide-react';

export const PracticeSelector: React.FC = () => {
  const { memberships, activeMembership, switchPractice } = usePractice();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeMembership) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
        <Building2 className="w-3.5 h-3.5" />
        <span>No Active Practice</span>
      </div>
    );
  }

  // If only 1 practice, render static clinical badge
  if (memberships.length <= 1) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium">
        <Building2 className="w-3.5 h-3.5 text-teal-400" />
        <span className="font-semibold">{activeMembership.practiceName}</span>
        <span className="text-[10px] text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/40 uppercase tracking-wider">
          {activeMembership.role.replace('_', ' ')}
        </span>
      </div>
    );
  }

  // Multiple practices: render dropdown switcher
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 transition text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
      >
        <Building2 className="w-3.5 h-3.5 text-teal-400" />
        <span className="font-semibold max-w-[140px] truncate">{activeMembership.practiceName}</span>
        <span className="text-[10px] text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/40 uppercase tracking-wider">
          {activeMembership.role.replace('_', ' ')}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-750 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Switch Practice
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {memberships.map((m) => {
              const isSelected = m.practiceId === activeMembership.practiceId;
              return (
                <button
                  key={m.practiceId}
                  onClick={() => {
                    switchPractice(m.practiceId);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 transition text-xs ${
                    isSelected ? 'bg-teal-950/40 text-teal-300 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate">{m.practiceName}</span>
                    <span className="text-[10px] text-slate-400 font-normal capitalize">
                      {m.role.replace('_', ' ')}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
