// ==============================================================================
// PHYSENRA DESIGN SYSTEM — UNIFIED BUTTON COMPONENT
// File: src/components/ui/Button.tsx
// ==============================================================================

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

    const variantStyles = {
      primary:
        'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-sm focus:ring-teal-500 border border-teal-600',
      secondary:
        'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-sm focus:ring-slate-900 border border-slate-900',
      outline:
        'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm focus:ring-teal-500',
      ghost:
        'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 focus:ring-slate-400',
      danger:
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm focus:ring-rose-500 border border-rose-600',
      success:
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm focus:ring-emerald-500 border border-emerald-600',
    }[variant];

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
    }[size];

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyle} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
            {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
