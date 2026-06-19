/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        pitch: {
          950: '#030810',
          900: '#070f1a',
          800: '#0b1929',
          700: '#0e1e2e',
          600: '#1a3050',
          500: '#2a5a7a',
          400: '#4a7a9a',
        },
        teal:   { 400: '#00d2b4', 500: '#00b89d' },
        amber:  { 400: '#f0a500' },
        rose:   { 400: '#e05a8a' },
        violet: { 400: '#9b7fe8' },
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out',
        'slide-up':  'slideUp 0.4s ease-out',
        'pulse-dot': 'pulseDot 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: 0.3, transform: 'scale(0.8)' }, '50%': { opacity: 1, transform: 'scale(1.2)' } },
      }
    },
  },
  plugins: [],
}
