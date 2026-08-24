import type { Config } from 'tailwindcss'

/**
 * Every colour that changes between light and dark is a CSS variable defined in
 * globals.css. Channel-triplet variables (`8 20 46`) keep Tailwind's `/opacity`
 * modifiers working; the surface tokens are whole colours because their dark
 * values are translucent overlays rather than solid fills.
 */
const channel = (v: string) => `rgb(var(${v}) / <alpha-value>)`

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', './site.config.ts', './data/**/*.ts'],
  theme: {
    extend: {
      colors: {
        // ---- Semantic surfaces & text ----
        bg: channel('--bg'),
        alt: channel('--bg-alt'),
        fg: channel('--fg'),
        body: channel('--body'),
        muted: channel('--muted'),
        faint: channel('--faint'),
        ghost: channel('--ghost'),
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        'surface-2': 'var(--surface-2)',
        nav: 'var(--nav-bg)',
        hex: 'var(--hex)',

        // Deep navy field — sampled from the logo canvas (#08142E). Fixed values,
        // used where a dark surface is wanted in both themes (code blocks, the
        // text sitting on a brand-gradient button).
        ink: {
          950: '#050D1F',
          900: '#08142E',
          850: '#0B1934',
          800: '#0F2140',
          700: '#16294D',
          600: '#1F3760',
        },

        // ---- Brand accents. Light mode darkens them for contrast on white. ----
        teal: {
          DEFAULT: channel('--c-teal'),
          400: channel('--c-teal'),
          500: channel('--c-teal-500'),
        },
        cyan: {
          DEFAULT: channel('--c-cyan'),
          400: channel('--c-cyan-400'),
          500: channel('--c-cyan'),
          600: channel('--c-cyan-600'),
        },
        amber: {
          DEFAULT: channel('--c-amber'),
          400: channel('--c-amber-400'),
          500: channel('--c-amber'),
          600: channel('--c-amber-600'),
        },
        coral: channel('--c-coral'),
        violet: channel('--c-violet'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        arabic: ['var(--font-arabic)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: { content: '72rem' },
      // Tailwind's default opacity scale skips these steps; the design uses them
      // for hairline borders and soft glows.
      opacity: {
        3: '0.03', 6: '0.06', 7: '0.07', 12: '0.12', 15: '0.15', 35: '0.35',
        45: '0.45', 55: '0.55', 65: '0.65', 85: '0.85',
      },
      animation: {
        'float-slow': 'float 18s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'draw-loop': 'drawLoop 3s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-24px,0)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.35' },
          '50%': { opacity: '0.7' },
        },
        drawLoop: {
          from: { strokeDashoffset: '1200' },
          to: { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
