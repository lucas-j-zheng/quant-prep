/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Library at night" — warm near-black ink, honey-gold accent.
        ink: '#0f0d12',
        panel: '#17141b',
        panel2: '#1d1923',
        edge: '#2b2531',
        'edge-soft': '#221d29',
        cream: '#f2ece2',
        dim: '#ada4b6',
        faint: '#7c7488',
        gold: '#eab04a',
        'gold-soft': '#f4c06a',
        'gold-deep': '#c98f2e',
        easy: '#56c596',
        medium: '#e3a857',
        hard: '#e0758c',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 14px 34px -18px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgba(234,176,74,0.25), 0 10px 30px -10px rgba(234,176,74,0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
      },
    },
  },
  plugins: [],
}
