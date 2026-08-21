import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './site.config.ts'],
  theme: {
    extend: {
      colors: {
        // Deep navy field — sampled from the logo canvas (#08142E).
        ink: {
          950: '#050D1F',
          900: '#08142E',
          850: '#0B1934',
          800: '#0F2140',
          700: '#16294D',
          600: '#1F3760',
        },
        // Left loop of the mark: teal → cyan-blue.
        teal: { DEFAULT: '#33CEC0', 400: '#33CEC0', 500: '#22B5AA' },
        cyan: { DEFAULT: '#2CACD1', 400: '#22C3E6', 500: '#2CACD1', 600: '#1E8CAE' },
        // Right loop of the mark.
        amber: { DEFAULT: '#EC9723', 400: '#F5A623', 500: '#EC9723', 600: '#D07E12' },
        // Secondary accents borrowed from the DevOps→MLOps roadmap cover.
        coral: '#FF6B7A',
        violet: '#A78BFA',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
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
