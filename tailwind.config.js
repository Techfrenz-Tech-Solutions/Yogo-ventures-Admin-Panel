/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ─── Coastal Retreat Design Palette ──────
      colors: {
        primary: {
          50:  '#e8eef0',
          100: '#c5d6da',
          200: '#9fbbc2',
          300: '#74A8A4',   // Muted teal
          400: '#4d8f8c',
          500: '#335765',   // Deep coastal blue (main)
          600: '#2b4d5a',
          700: '#23404d',
          800: '#1b3340',
          900: '#122530',
        },
        accent: {
          50:  '#f0f7f9',
          100: '#d6edf1',
          200: '#B6D9E0',   // Soft sky blue
          300: '#94c7d1',
          400: '#74A8A4',   // Muted teal
          500: '#5c9490',
          600: '#47807c',
          700: '#366360',
          800: '#264645',
          900: '#162a29',
        },
        surface: {
          50:  '#fafbfa',
          100: '#f4f6f4',
          200: '#DBE2DC',   // Pale sage/gray
          300: '#c3cec4',
          400: '#a8b8aa',
          500: '#8da290',
          600: '#738d76',
          700: '#5c7260',
          800: '#455749',
          900: '#2e3c31',
        },
        earth: {
          50:  '#f5eeea',
          100: '#e4d3ca',
          200: '#cfb09d',
          300: '#b98d73',
          400: '#a37254',
          500: '#7F543D',   // Warm terracotta
          600: '#6e4733',
          700: '#5c3a28',
          800: '#4a2d1e',
          900: '#381f14',
        },
        // ─── Semantic ──────────────────────────
        success: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        info: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
        },
      },

      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },

      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },

      boxShadow: {
        card: '0 1px 3px rgba(51, 87, 101, 0.08), 0 4px 16px rgba(51, 87, 101, 0.06)',
        'card-hover': '0 4px 12px rgba(51, 87, 101, 0.14), 0 12px 32px rgba(51, 87, 101, 0.1)',
        modal: '0 20px 60px rgba(18, 37, 48, 0.2)',
        btn: '0 2px 6px rgba(51, 87, 101, 0.25)',
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
