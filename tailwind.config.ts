import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        '3xl': '1600px',
      },
      fontFamily: {
        cairo: ['Cairo', ...defaultTheme.fontFamily.sans],
        naskh: ['"Noto Naskh Arabic"', ...defaultTheme.fontFamily.serif],
        // Emoji must not inherit Naskh's tall line metrics, or they shift out of their boxes.
        emoji: ['"Apple Color Emoji"', '"Segoe UI Emoji"', '"Noto Color Emoji"', 'sans-serif'],
      },
      colors: {
        cream: '#FBF7EF',
        ink: '#3D3A4B',
        pastel: {
          blue: '#D8ECF7',
          pink: '#FBE0E6',
          mint: '#D9F2E3',
          yellow: '#FFF1C9',
          lilac: '#E9E1F7',
          peach: '#FFE3D3',
        },
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.07)' },
          '65%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
        hint: {
          '0%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0.7)' },
          '50%': { boxShadow: '0 0 0 14px rgba(251, 191, 36, 0.35)' },
          '100%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        shake: 'shake 0.45s ease-in-out',
        pop: 'pop 0.5s ease-out',
        hint: 'hint 1.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'rise-in': 'rise-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
