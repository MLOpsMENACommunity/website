/**
 * The hexagon + node motif from the roadmap covers, as a decorative SVG.
 * Purely ornamental, so it is hidden from assistive tech. The nodes twinkle on
 * staggered offsets so the field reads as a living network.
 */
export default function HexField({ className = '' }: { className?: string }) {
  const hex = 'M60 4 L108 32 L108 88 L60 116 L12 88 L12 32 Z'
  const nodes = [
    { cx: 156, cy: 26, r: 5, fill: 'var(--brand-cyan)', o: 0.9, d: '0s' },
    { cx: 300, cy: 66, r: 4, fill: 'var(--brand-teal)', o: 0.7, d: '1.1s' },
    { cx: 252, cy: 118, r: 5, fill: 'var(--brand-amber)', o: 0.85, d: '2.2s' },
    { cx: 108, cy: 176, r: 4, fill: 'var(--brand-cyan)', o: 0.6, d: '0.6s' },
    { cx: 12, cy: 88, r: 3.5, fill: 'var(--brand-teal)', o: 0.5, d: '3s' },
  ]

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
        {nodes.map((n) => (
          <circle
            key={`${n.cx}-${n.cy}`}
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill={n.fill}
            opacity={n.o}
            className="twinkle"
            style={{ animationDelay: n.d, transformBox: 'fill-box' }}
          />
        ))}
      </g>
    </svg>
  )
}
