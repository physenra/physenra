// ==============================================================================
// PHYSENRA PUBLIC WEBSITE — ACCESSIBLE FAQ ACCORDION
// File: src/public/components/FAQAccordion.tsx
// ==============================================================================

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ items, className = '' }) => {
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const toggle = (idx: number) => {
    setOpenIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className={`divide-y divide-slate-200 border-y border-slate-200 ${className}`}>
      {items.map((item, index) => {
        const isOpen = openIndices.includes(index);
        const buttonId = `faq-btn-${index}`;
        const panelId = `faq-panel-${index}`;

        return (
          <div key={index} className="py-4">
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between text-left font-semibold text-slate-900 hover:text-teal-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded py-1"
            >
              <span className="text-base sm:text-lg pr-4">{item.question}</span>
              <ChevronDown
                className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-teal-600' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed pr-6"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
