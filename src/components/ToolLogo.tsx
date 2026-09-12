import type { ReactElement } from 'react'

/**
 * Tool marks for the student-guide pages.
 *
 * Drawn as inline SVG rather than shipped as files in /public: `next/image`
 * with `images.unoptimized` does not prepend `basePath`, so every raster asset
 * needs the `asset()` helper and still costs a request. These are geometric
 * interpretations of each project's visual identity â€” a whale over containers,
 * a pinwheel, a commit graph â€” not reproductions of the trademarked wordmarks,
 * and they inherit `currentColor` so the brand colour lives in CSS next to the
 * rest of the per-tool theming.
 */
export type ToolSlug = 'docker' | 'github-actions' | 'dvc' | 'airflow' | 'mlflow' | 'clearml' | 'langfuse' | 'ragas' | 'evidently'

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
  /* An angular evaluation seal: radar facets close around a passing score. */
  'ragas': (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M16 3.8 27.6 10.5 27.6 21.5 16 28.2 4.4 21.5 4.4 10.5Z" />
      <path d="M16 8.1 23.9 12.3 22.1 21.2 13.7 23.9 8.1 17.3 10.7 10.9Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M16 3.8v4.3M27.6 10.5l-3.7 1.8M27.6 21.5l-5.5-.3M16 28.2l-2.3-4.3M4.4 21.5l3.7-4.2M4.4 10.5l6.3.4" opacity="0.55" />
      <path d="m12.5 16.2 2.4 2.5 5-5.5" strokeWidth="2.5" />
    </g>
  ),
  /* Two measured distributions split by a monitored control limit. */
  'evidently': (
    <g fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M4 26.5h24M5.5 5.5v21" opacity="0.48" />
      <path d="M6 22.5c2.2 0 2.5-7.8 5.6-7.8s3.5 7.8 6.1 7.8" opacity="0.55" />
      <path d="M13.6 22.5c2.2 0 2.7-11.8 5.8-11.8s3.8 11.8 7.4 11.8" />
      <path d="M22.8 5v18.5" strokeDasharray="2.2 2.2" />
      <rect x="21.2" y="4" width="3.2" height="3.2" fill="currentColor" stroke="none" />
    </g>
  ),
  /* A trace path with four observations around a central span. */
  'langfuse': (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 8.5h8.2l4.1 7 5.1-7h5.6" />
      <path d="M4.5 23.5h8.2l4.1-7 5.1 7h5.6" opacity="0.52" />
      <circle cx="4.5" cy="8.5" r="2.3" fill="currentColor" stroke="none" />
      <circle cx="16.8" cy="15.5" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="27.5" cy="8.5" r="2.3" fill="currentColor" stroke="none" />
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
