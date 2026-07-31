import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          page: 'rgb(var(--c-bg-page) / <alpha-value>)',
          primary: 'rgb(var(--c-bg-primary) / <alpha-value>)',
          secondary: 'rgb(var(--c-bg-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--c-bg-tertiary) / <alpha-value>)',
          hover: 'rgb(var(--c-bg-hover) / <alpha-value>)',
          active: 'rgb(var(--c-bg-active) / <alpha-value>)',
          input: 'rgb(var(--c-bg-input) / <alpha-value>)',
          card: 'rgb(var(--c-bg-card) / <alpha-value>)',
        },
        border: {
          primary: 'rgb(var(--c-border-primary) / <alpha-value>)',
          secondary: 'rgb(var(--c-border-secondary) / <alpha-value>)',
          accent: 'rgb(var(--c-border-accent) / <alpha-value>)',
          glass: 'rgb(var(--c-border-glass) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--c-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--c-text-tertiary) / <alpha-value>)',
          inverse: 'rgb(var(--c-text-inverse) / <alpha-value>)',
        },
        /* `buy` is now ONLY trade direction — never a generic primary.
         *
         * It used to be the SwissCresta orange (#E94E1B) doing two jobs
         * at once: the BUY side of a blotter AND the default accent for
         * buttons/icons that have nothing to do with trading. That dual
         * role is why orange survived the rebrand in ~340 places. The
         * two roles are now split:
         *
         *   buy    → direction only (blue, matches the trader terminal's
         *            #1E66F5 so BUY reads the same on both apps)
         *   accent → the brand red, every generic primary/CTA/icon
         *
         * Blue-vs-red also keeps BUY and SELL unmistakable in a trade
         * blotter, which repointing `buy` to the brand red would not:
         * `accent` (#D60101) and `sell` (#ef4444) are too close to carry
         * direction. Do not "harmonise" `buy` into the brand palette. */
        buy: {
          DEFAULT: '#1E66F5',
          light: '#5B8CFF',
          dark: '#0D3FA3',
          bg: 'rgba(30,102,245,0.08)',
          glow: 'rgba(30,102,245,0.25)',
        },
        sell: {
          DEFAULT: '#ef4444',
          light: '#ff6b6b',
          dark: '#dc2626',
          bg: 'rgba(239,68,68,0.07)',
        },
        /* Brand accent — red sampled from the TuskaEx logo mark
         * (the "T" glyph and the "EX" of the wordmark are #D60101).
         * This is the admin's primary: CTAs, active nav, stat icons. */
        accent: { DEFAULT: '#D60101', light: '#F14A4A', dark: '#A30000' },
        success: '#22c55e',
        /* Amber, kept as a STATUS colour (pending / needs-review), not a
         * brand colour. Matches the trader app's `warning` exactly. */
        warning: '#F59E0B',
        info: '#29B6F6',
        danger: '#ef4444',
        card: 'rgb(var(--c-bg-card) / <alpha-value>)',
        'card-nested': 'rgb(var(--c-bg-tertiary) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'xxs': ['10px', { lineHeight: '14px' }],
        'xs': ['11px', { lineHeight: '16px' }],
        'sm': ['12px', { lineHeight: '16px' }],
        'base': ['13px', { lineHeight: '20px' }],
        'md': ['14px', { lineHeight: '20px' }],
        'lg': ['16px', { lineHeight: '24px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['28px', { lineHeight: '36px' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.22,1,0.36,1)',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'page-in': 'pageFadeIn 0.25s ease-out both',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pageFadeIn: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        glowPulse: { '0%,100%': { boxShadow: '0 0 8px rgba(214, 1, 1,0.15)' }, '50%': { boxShadow: '0 0 20px rgba(214, 1, 1,0.3)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        modal: 'var(--shadow-modal)',
        dropdown: 'var(--shadow-dropdown)',
        glass: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        'glass-lg': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        'glow-green': '0 0 20px rgba(214, 1, 1,0.2), 0 0 60px rgba(214, 1, 1,0.08)',
        'neon-sm': '0 0 6px rgba(236,198,87,0.15), 0 0 12px rgba(214, 1, 1,0.08)',
      },
      backdropBlur: {
        glass: '16px',
        'glass-heavy': '24px',
      },
    },
  },
  plugins: [],
}

export default config
