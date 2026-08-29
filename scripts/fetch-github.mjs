/**
 * Refreshes data/generated/github.json — the community's own GitHub presence.
 *
 * Deliberately scoped to our org and nothing else. The org endpoint lists every
 * public repo, so publishing a repo puts it on the homepage with no edit here
 * and no edit to the site: description, language, stars and forks all come from
 * GitHub. A private repo is invisible to this, which is the correct behaviour —
 * a card the public cannot open is worse than no card.
 *
 * No key to create: the anonymous REST API allows 60 requests an hour per IP
 * and this asks for two. GITHUB_TOKEN is used when present only to lift that
 * ceiling — Actions runners share outbound IPs, so the anonymous budget can
 * already be spent by a stranger. Actions mints that token for every run, so
 * there is still nothing to configure by hand.
 *
 * Star counts are stored exactly, not rounded like the YouTube figures: ours are
 * small enough that rounding to the nearest hundred would render them as zero.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ROOT, get, log, readJson, writeJsonIfChanged } from './lib/net.mjs'

const OUT = 'data/generated/github.json'
/** The org comes from `channels.github`, so the link and the data agree. */
const SOURCE = 'site.config.ts'

const previous = readJson(OUT, {})

function orgLogin() {
  try {
    const src = readFileSync(path.join(ROOT, SOURCE), 'utf8')
    return src.match(/github:\s*'https:\/\/github\.com\/([\w.-]+)'/)?.[1] ?? null
  } catch (err) {
    log.warn(`could not read ${SOURCE}: ${err.message}`)
    return null
  }
}

function headers() {
  const token = process.env.GITHUB_TOKEN
  return {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  }
}

async function getJson(url) {
  const body = await get(url, { headers: headers() })
  if (!body) return null
  try {
    return JSON.parse(body)
  } catch (err) {
    log.warn(`could not parse ${url}: ${err.message}`)
    return null
  }
}

const org = orgLogin()
if (!org) {
  log.warn(`no GitHub org found in ${SOURCE} — keeping the committed file`)
  process.exit(0)
}

const [profile, list] = await Promise.all([
  getJson(`https://api.github.com/orgs/${org}`),
  // `sort=updated` so a freshly published repo leads; the site re-sorts by
  // stars, but this keeps the slice sensible if the org ever grows past 100.
  getJson(`https://api.github.com/orgs/${org}/repos?per_page=100&type=public&sort=updated`),
])

if (!Array.isArray(list)) {
  // A failed call is not the same as an org with no repos. Never let one
  // outage empty the section.
  log.warn(`could not list repos for ${org} — keeping the committed file`)
  process.exit(0)
}

// Forks and archives are somebody else's work or finished work; neither belongs
// on a "what we build" wall.
const visible = list.filter((r) => !r.fork && !r.archived && !r.private)
const skipped = list.length - visible.length
if (skipped > 0) log.info(`${skipped} repo(s) skipped as forks or archived`)

const repos = visible
  .map((r) => ({
    name: r.name,
    href: r.html_url,
    // null, not '', so the site can tell "no description on GitHub" from an
    // empty one and fall back to the note in data/community.ts.
    desc: r.description?.trim() || null,
    lang: r.language ?? null,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
  }))
  .sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name))

for (const r of repos) {
  if (!r.desc) log.info(`${r.name} has no description on GitHub — the site falls back to repoNotes`)
}

writeJsonIfChanged(OUT, {
  org,
  url: `https://github.com/${org}`,
  // Org-level totals: not rendered today, but this file is the audit trail of
  // how the org grew, and `git log -p` is free.
  followers: profile?.followers ?? previous.followers ?? 0,
  publicRepos: profile?.public_repos ?? previous.publicRepos ?? repos.length,
  stars: repos.reduce((n, r) => n + r.stars, 0),
  repos,
})

// Always succeed. A refresh failure is a stale site, not a broken one.
process.exit(0)
