import type { ReactElement } from 'react'

/**
 * Tool marks for the student-guide pages.
 *
 * Drawn as inline SVG rather than shipped as files in /public: `next/image`
 * with `images.unoptimized` does not prepend `basePath`, so every raster asset
 * needs the `asset()` helper and still costs a request. These are geometric
 * interpretations of each project's visual identity — a whale over containers,
 * a pinwheel, a commit graph — not reproductions of the trademarked wordmarks,
 * and they inherit `currentColor` so the brand colour lives in CSS next to the
 * rest of the per-tool theming.
 */
export type ToolSlug = 'docker' | 'github-actions' | 'dvc' | 'airflow' | 'mlflow' | 'clearml'

const MARKS: Record<ToolSlug, ReactElement> = {
  /* A whale carrying a stack of containers. */
  'docker': (
    <g fill="currentColor">
      <rect x="10.5" y="12.4" width="3.6" height="3.6" rx="0.5" />
      <rect x="14.8" y="12.4" width="3.6" height="3.6" rx="0.5" />
      <rect x="19.1" y="12.4" width="3.6" height="3.6" rx="0.5" />
      <rect x="14.8" y="8.1" width="3.6" height="3.6" rx="0.5" />
      <rect x="19.1" y="8.1" width="3.6" height="3.6" rx="0.5" />
      <rect x="19.1" y="3.8" width="3.6" height="3.6" rx="0.5" />
      <rect x="6.2" y="12.4" width="3.6" height="3.6" rx="0.5" />
      <path d="M2 18.2h22.6c.5 2.1-.2 4.2-2 5.7-1.7 1.4-4.1 2.1-7.2 2.1-4 0-7-1-9-2.9A11 11 0 0 1 2 18.2Z" />
      <path d="M25.6 17.1c1-.7 2.2-1 3.6-.9-.3 1.3-1 2.3-2.1 2.9-.5-.8-1-1.5-1.5-2Z" />
    </g>
  ),
  /* A workflow loop: a ring with an arrow closing it. */
  'github-actions': (
    <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M25.5 16a9.5 9.5 0 1 1-4.3-7.9" />
      <path d="M21.4 3.3v5.2h-5.2" />
      <circle cx="16" cy="16" r="3.1" fill="currentColor" stroke="none" />
    </g>
  ),
  /* A data stack with a version branch leaving it. */
  'dvc': (
    <g fill="currentColor">
      <ellipse cx="12" cy="7.4" rx="8.4" ry="3.2" opacity="0.9" />
      <path d="M3.6 11.3c0 1.8 3.8 3.2 8.4 3.2s8.4-1.4 8.4-3.2v3.4c0 1.8-3.8 3.2-8.4 3.2s-8.4-1.4-8.4-3.2Z" opacity="0.65" />
      <path d="M3.6 18.5c0 1.8 3.8 3.2 8.4 3.2s8.4-1.4 8.4-3.2v3.4c0 1.8-3.8 3.2-8.4 3.2s-8.4-1.4-8.4-3.2Z" opacity="0.45" />
      <circle cx="25.6" cy="9.6" r="3" />
      <circle cx="25.6" cy="23.2" r="3" />
      <path d="M24.2 12.4v8h2.8v-8Z" opacity="0.7" />
    </g>
  ),
  /* A scheduler pinwheel: four blades around a hub. */
  'airflow': (
    <g fill="currentColor">
      <path d="M16 15.1c0-4.9.4-8.7 1.2-11.4.2-.6 1-.6 1.3-.1 1.6 2.6 2.4 5.6 2.4 9 0 1.5-.2 2.9-.6 4.2Z" />
      <path d="M16.9 16c4.9 0 8.7.4 11.4 1.2.6.2.6 1 .1 1.3-2.6 1.6-5.6 2.4-9 2.4-1.5 0-2.9-.2-4.2-.6Z" />
      <path d="M16 16.9c0 4.9-.4 8.7-1.2 11.4-.2.6-1 .6-1.3.1-1.6-2.6-2.4-5.6-2.4-9 0-1.5.2-2.9.6-4.2Z" />
      <path d="M15.1 16c-4.9 0-8.7-.4-11.4-1.2-.6-.2-.6-1-.1-1.3 2.6-1.6 5.6-2.4 9-2.4 1.5 0 2.9.2 4.2.6Z" />
      <circle cx="16" cy="16" r="2.4" />
    </g>
  ),
  /* A metric curve rising out of a bracketed run. */
  'mlflow': (
    <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.4 4.6H3.4v22.8h3" />
      <path d="M25.6 4.6h3v22.8h-3" />
      <path d="M9.2 21.4l4.4-5.6 3.6 3 5.6-8" />
      <circle cx="22.8" cy="10.8" r="2.4" fill="currentColor" stroke="none" />
    </g>
  ),
  /* Queued experiment cards feeding a rising result. */
  'clearml': (
    <g fill="currentColor">
      <rect x="3.4" y="6.6" width="9.6" height="4.2" rx="1.4" opacity="0.55" />
      <rect x="3.4" y="13.9" width="9.6" height="4.2" rx="1.4" opacity="0.8" />
      <rect x="3.4" y="21.2" width="9.6" height="4.2" rx="1.4" opacity="0.4" />
      <rect x="17.8" y="20.2" width="3.6" height="8.4" rx="1.2" opacity="0.6" />
      <rect x="23" y="15.4" width="3.6" height="13.2" rx="1.2" opacity="0.8" />
      <path d="M17.4 12.6l4-5.2 3.2 2.4 3.6-5.4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
}

export default function ToolLogo({ slug, className }: { slug: ToolSlug; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-hidden="true"
      focusable="false"
      data-tool={slug}
      className={`tool-logo${className ? ` ${className}` : ''}`}
    >
      {MARKS[slug]}
    </svg>
  )
}
