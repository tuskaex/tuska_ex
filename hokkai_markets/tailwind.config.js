/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary dark backgrounds — Cyber-Samurai midnight palette
        'dark-900': '#05070a',
        'dark-800': '#07090e',
        'dark-700': '#090c14',
        'dark-600': '#0c1018',
        'dark-500': '#0f1420',
        'dark-400': '#131a28',

        // Cyber Crimson — primary accent (#e11d48)
        'red-accent':  '#e11d48',
        'red-light':   '#f43f5e',
        'red-dark':    '#be123c',
        'cyber-crimson': '#e11d48',

        // Green for positive market data
        'green-accent': '#00d4aa',
        'green-light':  '#00f5c4',

        // Japanese palette — 日本の色
        'vermillion': '#C1121F',
        'sumi':       '#0d0d1a',
        'washi':      '#f5f0e8',
        'sakura':     '#ffb7c5',
        'matcha':     '#4a7c59',
        'indigo-jp':  '#1a237e',
        'gold-jp':    '#c9a84c',
        'gold-400':   '#d4a843',
        'gold-500':   '#c9a84c',
        'gold-600':   '#b8963e',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        michroma: ['Michroma', 'sans-serif'],
      },
      animation: {
        'ticker':      'ticker 40s linear infinite',
        'fade-in':     'fadeIn 0.6s ease-out forwards',
        'slide-up':    'slideUp 0.6s ease-out forwards',
        'slide-in-left':  'slideInLeft 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.6s ease-out forwards',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
        'float':       'float 3s ease-in-out infinite',
        'neon-pulse':  'neonPulse 2s ease-in-out infinite',
        'scanline':    'scanline 8s linear infinite',
        'cyber-flicker': 'cyberFlicker 4s ease-in-out infinite',
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(225, 29, 72, 0.3)' },
          '50%':      { boxShadow: '0 0 30px rgba(225, 29, 72, 0.7)' },
        },
        neonPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(225,29,72,0.4), 0 0 20px rgba(225,29,72,0.2)' },
          '50%':      { boxShadow: '0 0 15px rgba(225,29,72,0.8), 0 0 40px rgba(225,29,72,0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        cyberFlicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%':           { opacity: '0.8' },
          '97%':           { opacity: '1' },
          '98%':           { opacity: '0.6' },
          '99%':           { opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient':    'linear-gradient(180deg, #05070a 0%, #010203 100%)',
        'card-gradient':    'linear-gradient(145deg, #0c1018 0%, #05070a 100%)',
        'red-gradient':     'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
        'cyber-gradient':   'linear-gradient(180deg, #05070a 0%, #010203 100%)',
        'neon-border':      'linear-gradient(135deg, rgba(225,29,72,0.6), rgba(225,29,72,0.05))',
      },
      boxShadow: {
        'neon-red':    '0 0 20px rgba(225,29,72,0.4), 0 0 60px rgba(225,29,72,0.15)',
        'neon-red-sm': '0 0 10px rgba(225,29,72,0.3)',
        'neon-red-lg': '0 0 30px rgba(225,29,72,0.5), 0 0 80px rgba(225,29,72,0.2)',
        'glass':       '0 8px 32px rgba(0,0,0,0.4)',
        'glass-lg':    '0 16px 48px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}
