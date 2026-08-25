/**
 * Adds a published article by URL:
 *
 *     npm run add:article -- <url> [--tags a,b] [--internal /roadmaps/foo] [--dry-run]
 *
 * LinkedIn's API cannot return long-form Articles — the /pulse/ URLs this site
 * links — at any access tier, and there is no RSS. So this is not ingestion: it
 * is one fetch of one page you already have open, reading the Open Graph tags
 * the page serves to any visitor. It never crawls, polls, or logs in.
 *
 * That also means it can stop working without warning: those tags are served as
 * a courtesy, not a contract. When extraction fails it still writes an entry
 * with the URL filled in and marks the gaps with TODO, so the worst case is
 * "finish three fields by hand" rather than "the tool broke".
 *
 * It writes to data/generated/articles.json, which data/articles.ts spreads in.
 * The machine owns a JSON file; the hand-curated TypeScript stays hand-curated.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ROOT, get, log, readJson, writeJsonIfChanged } from './lib/net.mjs'

const OUT = 'data/generated/articles.json'
const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  if (hit) return hit.split('=').slice(1).join('=')
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : undefined
}

if (!url) {
  console.error('Usage: npm run add:article -- <url> [--tags a,b] [--internal /roadmaps/foo] [--dry-run]')
  process.exit(1)
}

/** Drops the tracking parameters that rotate per visit and would diff every run. */
function canonical(raw) {
  const u = new URL(raw)
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|trk|trackingId|source|originalSubdomain)/i.test(key)) u.searchParams.delete(key)
  }
  u.hash = ''
  return u.toString()
}

/**
 * Reads a <meta> value. The capture runs to the MATCHING quote rather than to
 * any quote — an apostrophe inside a double-quoted attribute ("the roadmap I'd
 * give...") would otherwise truncate the value mid-sentence.
 */
const meta = (html, prop) => {
  const attrs = `(?:property|name)=["']${prop}["']`
  const m =
    html.match(new RegExp(`<meta[^>]+${attrs}[^>]*?content=(["'])([\\s\\S]*?)\\1`, 'i')) ??
    html.match(new RegExp(`<meta[^>]+content=(["'])([\\s\\S]*?)\\1[^>]*?${attrs}`, 'i'))
  return m?.[2]?.trim()
}

/** LinkedIn omits article:published_time; its JSON-LD block usually has it. */
const publishedFrom = (html) => {
  if (!html) return undefined
  const og = meta(html, 'article:published_time') ?? meta(html, 'og:article:published_time')
  if (og) return og
  const ld = html.match(/"datePublished"\s*:\s*"([^"]+)"/)
  return ld?.[1]
}

const decode = (s) =>
  s
    ?.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

/** LinkedIn slugs end in a short random suffix; drop it so the id reads well. */
function idFromUrl(u) {
  const last = new URL(u).pathname.replace(/\/+$/, '').split('/').pop() ?? ''
  return last.replace(/-[a-z0-9]{5}$/i, '') || `article-${Date.now()}`
}

/** og:description arrives pre-truncated and often ends mid-word. */
function tidy(text, max = 240) {
  if (!text || text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—-]$/, '')}…`
}

const href = canonical(url)
const html = await get(href, { timeoutMs: 20_000 })
if (!html) log.warn('could not read the page — writing a stub for you to finish')

const platform = /medium\.com/i.test(href) ? 'Medium' : 'LinkedIn'
const published = publishedFrom(html)
const entry = {
  id: idFromUrl(href),
  title: decode(html ? meta(html, 'og:title') : undefined) ?? 'TODO: title',
  description: tidy(decode(html ? meta(html, 'og:description') : undefined)) ?? 'TODO: description',
  date: (published ?? new Date().toISOString()).slice(0, 10),
  platform,
  href,
  tags: (flag('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
  ...(flag('internal') ? { internalHref: flag('internal') } : {}),
}
if (!published) log.warn(`no published date in the page — defaulted to ${entry.date}, check it`)

// data/articles.ts is TypeScript, so check it as text rather than importing it.
// Cheap, and it stops the generated file from shadowing a curated entry that
// already carries a better description and an internalHref.
const curatedSource = (() => {
  try {
    return readFileSync(path.join(ROOT, 'data/articles.ts'), 'utf8')
  } catch {
    return ''
  }
})()

if (curatedSource.includes(entry.href) || curatedSource.includes(`id: '${entry.id}'`)) {
  log.info(`${entry.id} is already hand-written in data/articles.ts — nothing to do`)
  process.exit(0)
}

const existing = readJson(OUT, [])
if (existing.some((a) => a.id === entry.id || a.href === entry.href)) {
  log.info(`${entry.id} is already in ${OUT} — nothing to do`)
  process.exit(0)
}

const next = [...existing, entry].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))

if (dryRun) {
  console.log(JSON.stringify(entry, null, 2))
  process.exit(0)
}

writeJsonIfChanged(OUT, next)

console.log(`
Add the Arabic overlay to src/lib/content-i18n.ts (articlesAr):

  '${entry.id}': {
    title: 'TODO',
    description: 'TODO',
  },

Until you do, the card renders in English on /ar with an "in English" marker.
\`npm run check:i18n\` will keep reminding you.`)
