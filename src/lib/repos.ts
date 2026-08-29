import github from '~/data/generated/github.json'
import { repoNotes } from '~/data/community'

/**
 * Declared rather than inferred from the JSON, for the same reason as the
 * YouTube stats: a refresh that reached nothing writes the last good file, and
 * inferring the type from today's contents would turn tomorrow's extra repo
 * into a compile error.
 */
type OrgData = {
  org: string
  url: string
  followers?: number
  publicRepos?: number
  stars?: number
  repos?: { name: string; href: string; desc: string | null; lang: string | null; stars: number; forks: number }[]
}

/**
 * Our GitHub organisation as the site renders it.
 *
 * Everything here is fetched — publishing a repo is the whole act of adding it
 * to the homepage. The only local content is the description fallback, used
 * when a repo has none set on GitHub, where an empty card body would otherwise
 * be the honest but useless result.
 */
export function getOrg() {
  const data = github as OrgData
  return {
    ...data,
    repos: (data.repos ?? []).map((r) => ({ ...r, desc: r.desc ?? repoNotes[r.name] ?? null })),
  }
}
