/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        primary: {
          DEFAULT: 'var(--color-primary, #0d9488)',
          hover: 'var(--color-primary-hover, #0f766e)',
          soft: 'var(--color-primary-soft, #f0fdfa)',
          dark: 'var(--color-primary-dark, #115e59)',
        },
        surface: {
          DEFAULT: 'var(--color-surface, #ffffff)',
          muted: 'var(--color-surface-muted, #f8fafc)',
          card: 'var(--color-surface-card, #ffffff)',
        },
        border: {
          DEFAULT: 'var(--color-border, #e2e8f0)',
          subtle: 'var(--color-border-subtle, #f1f5f9)',
          strong: 'var(--color-border-strong, #cbd5e1)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        elevation: '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
};
