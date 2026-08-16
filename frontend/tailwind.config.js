/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        'primary-dark': '#4F46E5',
        secondary: '#D4AF37',
        tertiary: '#A855F7',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        danger: '#FCA5A5',
      },
      fontFamily: {
        headline: ['Manrope', 'System'],
        body: ['Inter', 'System'],
        label: ['Geist', 'System'],
      },
      borderRadius: { card: '24px' },
    },
  },
  plugins: [],
};
