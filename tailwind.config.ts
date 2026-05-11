import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // iOS System Colors (dark mode optimized)
        ios: {
          red: '#FF453A',
          orange: '#FF9F0A',
          yellow: '#FFD60A',
          green: '#30D158',
          mint: '#63E6E2',
          teal: '#40CBE0',
          cyan: '#64D2FF',
          blue: '#0A84FF',
          indigo: '#5E5CE6',
          purple: '#BF5AF2',
          pink: '#FF375F',
        },
        // Surflix brand
        surflix: {
          50: '#fff1f3',
          500: '#ff375f',
          600: '#ed1648',
          700: '#c8083d',
        },
        // Background system (dark)
        bg: {
          base: '#000000',
          surface: '#1c1c1e',
          elevated: '#2c2c2e',
          grouped: '#1c1c1e',
        },
      },
      backdropBlur: {
        ios: '30px',
      },
      borderRadius: {
        ios: '14px',
        'ios-lg': '18px',
        'ios-xl': '24px',
      },
      letterSpacing: {
        tight: '-0.01em',
        tighter: '-0.02em',
        tightest: '-0.03em',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
