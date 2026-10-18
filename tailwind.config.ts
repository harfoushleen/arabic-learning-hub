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
        naskh: ['"Noto Naskh Arabic"', ...defaultTheme.fontFamily.serif],
        // Emoji must not inherit Naskh's tall line metrics, or they shift out of their boxes.
        emoji: ['"Apple Color Emoji"', '"Segoe UI Emoji"', '"Noto Color Emoji"', 'sans-serif'],
      },
      colors: {
        // Shell design tokens: exact values from docs/design/home-mockup.html (:root).
        cream: '#FBF7EF',
        ink: '#3B3A4A',
        muted: '#7A7787',
        sky: { DEFAULT: '#DCEEFB', ink: '#2F6E9E' },
        mint: { DEFAULT: '#DDF5E6', ink: '#2E7D57' },
        peach: { DEFAULT: '#FFE4D6', ink: '#B2563A' },
        lavender: { DEFAULT: '#ECE4FB', ink: '#6A4FB0' },
        lemon: { DEFAULT: '#FFF3C7', ink: '#8A6D0B' },
        pastel: {
          blue: '#D8ECF7',
          pink: '#FBE0E6',
          mint: '#D9F2E3',
          yellow: '#FFF1C9',
          lilac: '#E9E1F7',
          peach: '#FFE3D3',
        },
      },
      borderRadius: {
        'card-lg': '32px',
        'card-md': '22px',
      },
      boxShadow: {
        card: '0 6px 0 rgba(59,58,74,.07), 0 14px 28px rgba(59,58,74,.08)',
        'card-pressed': '0 2px 0 rgba(59,58,74,.07), 0 6px 12px rgba(59,58,74,.06)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(5px)' },
        },
        // Erases a pathLength=1 SVG line from its end back toward its start.
        retract: {
          from: { strokeDashoffset: '0' },
          to: { strokeDashoffset: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(6deg)' },
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
        // Gentle idle motion for static emoji art (EmojiArt).
        sway: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '40%': { transform: 'translateY(-8%) scale(1.04)' },
          '70%': { transform: 'translateY(2%) scale(0.99)' },
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
        wiggle: 'wiggle 0.45s ease-in-out',
        retract: 'retract 0.2s ease-in forwards',
        hint: 'hint 1.2s ease-out',
        sway: 'sway 3s ease-in-out infinite',
        bob: 'bob 0.9s ease-in-out both',
        'fade-in': 'fade-in 0.2s ease-out',
        'rise-in': 'rise-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
