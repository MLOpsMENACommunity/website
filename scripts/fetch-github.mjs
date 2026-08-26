/**
 * Refreshes data/generated/github.json — the star counts on the repo cards.
 *
 * No key to create: the unauthenticated REST API allows 60 requests an hour per
 * IP and this asks for six. GITHUB_TOKEN is used when present only to lift that
 * ceiling — Actions runners share outbound IPs, so the anonymous budget can
 * already be spent by a stranger. The workflow passes the token GitHub mints
 * for every run automatically, so there is still nothing to configure by hand.
 *
 * Stars only. `lang` and `desc` stay hand-written: the API reports the dominant
 * language, which is "Jupyter Notebook" for the Zoomcamp and null for a
 * Markdown-only list — both worse on a card than what a human chose.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ROOT, get, log, readJson, writeJsonIfChanged } from './lib/net.mjs'

const OUT = 'data/generated/github.json'
/** The cards are the source of truth for *which* repos; this file only adds a
 *  number to each. Adding a card therefore needs no edit here. */
const SOURCE = 'data/community.ts'

const previous = readJson(OUT, { repos: {} })

function slugsFromCards() {
  let src
  try {
    src = readFileSync(path.join(ROOT, SOURCE), 'utf8')
  } catch (err) {
    log.warn(`could not read ${SOURCE}: ${err.message}`)
    return []
  }
  const found = [...src.matchAll(/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/g)]
    .map((m) => `${m[1]}/${m[2]}`)
    .filter((s) => !s.endsWith('.git'))
  return [...new Set(found)]
}

/**
 * Nearest 100 — precisely the resolution a card renders ("27.7k"), so the four
 * daily runs commit only when the displayed text would actually change.
 * Nearest rather than floor because the chip carries no "+": 27,684 stars reads
 * honestly as 27.7k and misleadingly as 27.6k.
 */
function round100(n) {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n / 100) * 100 : undefined
}

async function fetchRepo(slug) {
  const token = process.env.GITHUB_TOKEN
  // Renamed and transferred repos answer 301 with the new API location, which
  // fetch follows on its own — iterative/dvc is treeverse/dvc today. Keying the
  // result by the slug we asked for keeps the card's link the one that matches.
  const body = await get(`https://api.github.com/repos/${slug}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!body) return null

  let repo
  try {
    repo = JSON.parse(body)
  } catch (err) {
    log.warn(`${slug}: could not parse the response — ${err.message}`)
    return null
  }

  const stars = round100(repo?.stargazers_count)
  if (stars === undefined) {
    log.warn(`${slug}: no star count in the response — keeping the committed figure`)
    return null
  }
  if (repo.full_name && repo.full_name.toLowerCase() !== slug.toLowerCase()) {
    log.info(`${slug} now redirects to ${repo.full_name}`)
  }
  return { stars, fullName: repo.full_name ?? slug }
}

const slugs = slugsFromCards()
if (slugs.length === 0) {
  // A regex that matched nothing means the cards moved or were reformatted —
  // not that the community has no repos. Never write that over good data.
  log.warn(`no GitHub links found in ${SOURCE} — keeping the committed file`)
} else {
  const fetched = await Promise.all(slugs.map(fetchRepo))
  const repos = {}
  slugs.forEach((slug, i) => {
    // Per-repo fallback: one 404 or one rate-limited call must not blank the
    // other five cards.
    const entry = fetched[i] ?? previous.repos?.[slug]
    if (entry) repos[slug] = entry
  })
  writeJsonIfChanged(OUT, { repos })
}

// Always succeed. A refresh failure is a stale site, not a broken one.
process.exit(0)
