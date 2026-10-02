// ==============================================================================
// PHYSENRA DESIGN SYSTEM — UNIFIED CARD SYSTEM
// File: src/components/ui/Card.tsx
// ==============================================================================

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'interactive' | 'outline';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white border-slate-200 shadow-sm',
      muted: 'bg-slate-50 border-slate-200 shadow-none',
      interactive:
        'bg-white border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-md transition-all cursor-pointer',
      outline: 'bg-transparent border-slate-200 shadow-none',
    }[variant];

    return (
      <div
        ref={ref}
        className={`rounded-2xl border ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`p-6 border-b border-slate-100 ${className}`} {...props}>
    {children}
  </div>
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ children, className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 ${className}`}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ children, className = '', ...props }, ref) => (
  <p ref={ref} className={`text-xs text-slate-500 mt-1 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`p-6 ${className}`} {...props}>
    {children}
  </div>
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = 'CardFooter';
