/**
 * The hexagon + node motif from the roadmap covers, as a decorative SVG.
 * Purely ornamental, so it is hidden from assistive tech.
 */
export default function HexField({ className = '' }: { className?: string }) {
  const hex = 'M60 4 L108 32 L108 88 L60 116 L12 88 L12 32 Z'
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      viewBox="0 0 340 240"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.5">
        <path d={hex} transform="translate(0,60)" />
        <path d={hex} transform="translate(96,4)" />
        <path d={hex} transform="translate(96,116)" />
        <path d={hex} transform="translate(192,60)" />
      </g>
      <g>
        <circle cx="156" cy="26" r="5" fill="var(--brand-cyan)" opacity="0.9" />
        <circle cx="300" cy="66" r="4" fill="var(--brand-teal)" opacity="0.7" />
        <circle cx="252" cy="118" r="5" fill="var(--brand-amber)" opacity="0.85" />
        <circle cx="108" cy="176" r="4" fill="var(--brand-cyan)" opacity="0.6" />
        <circle cx="12" cy="88" r="3.5" fill="var(--brand-teal)" opacity="0.5" />
      </g>
    </svg>
  )
}
