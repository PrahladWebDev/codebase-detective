/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0C10',
          900: '#0F131A',
          800: '#161B24',
          700: '#1F2530',
          600: '#2A313F',
          500: '#3A4353',
        },
        paper: {
          100: '#E9EBEF',
          300: '#B7BECC',
          500: '#8891A3',
        },
        spotlight: {
          DEFAULT: '#F2A93B',
          dim: '#C98A2C',
          glow: '#FFD98A',
        },
        sev: {
          critical: '#E5484D',
          high: '#F2994A',
          medium: '#F2C94C',
          low: '#5B8DEF',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(242, 169, 59, 0.35)',
      },
      backgroundImage: {
        beam: 'radial-gradient(60% 60% at 50% 0%, rgba(242,169,59,0.16) 0%, rgba(10,12,16,0) 70%)',
      },
    },
  },
  plugins: [],
};
