import github from '~/data/generated/github.json'
import { repos as baseRepos } from '~/data/community'

/**
 * Declared rather than inferred from the JSON, for the same reason as the
 * YouTube stats: a refresh that reached nothing writes `{}`, and inferring the
 * type from the file would make that a compile error instead of the fallback.
 */
type FetchedRepo = { stars?: number; fullName?: string }

/** The key both sides agree on — the fetcher derives it from this same href. */
function slugOf(href: string) {
  const m = href.match(/github\.com\/([\w.-]+)\/([\w.-]+)/)
  return m ? `${m[1]}/${m[2]}` : ''
}

/**
 * Three significant figures, which is how every repo badge on the internet
 * reads a star count: 27.7k, 8.8k, 15k. The fetcher already rounds to the
 * nearest 100, so this never renders a digit that isn't real.
 */
function formatStars(n: number) {
  if (n < 1000) return String(n)
  const k = n / 1000
  return `${k.toFixed(k < 100 ? 1 : 0).replace(/\.0$/, '')}k`
}

/**
 * The repo cards, with the hand-typed star counts replaced by fetched ones.
 *
 * Falls back per repo rather than wholesale: a single 404 or a rate-limited
 * call leaves that one card on its committed figure and the rest live.
 */
export function getRepos() {
  const fetched = (github.repos ?? {}) as Record<string, FetchedRepo>

  return baseRepos.map((r) => {
    const stars = fetched[slugOf(r.href)]?.stars
    return typeof stars === 'number' && stars > 0 ? { ...r, stars: formatStars(stars) } : r
  })
}
