/**
 * Prefixes a file in /public with the deployment base path.
 *
 * Needed because `next/image` with `images.unoptimized` (required for a static
 * export) emits `src` verbatim and does NOT prepend `basePath`. Without this,
 * every image 404s when the site is served from a subpath such as
 * <org>.github.io/website.
 *
 * Pass paths that start with "/" — e.g. asset('/logo-mark.png').
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function asset(path: string): string {
  return `${basePath}${path}`
}
