/**
 * Records which Google Drive file backs each topic's "Quick Start" section.
 *
 *     npm run sync:quickstart        # standalone
 *     npm run dev / npm run build    # runs automatically (pre-dev / pre-build)
 *
 * The PDFs are NOT downloaded. Each topic guide embeds its file straight from
 * Drive (`https://drive.google.com/file/d/<id>/preview`), so all this needs to
 * discover is the file id for each `<slug>.pdf` in a PUBLIC Drive folder. It
 * reads the same folder page any visitor gets and writes the id map to
 * `public/quickstart/index.json`.
 *
 * There is no API key on purpose: the folder is public. That also makes this
 * best-effort â€” Google can change the page shape or rate-limit at any time â€” so,
 * like the other fetchers, a failure NEVER breaks the build: it logs a warning,
 * leaves the existing index.json in place, and exits 0. A topic simply keeps
 * whatever mapping was last written (or shows no Quick Start section).
 *
 * Files whose name (minus .pdf) is a known guide slug are mapped to that guide,
 * so a stray file can never land in the wrong guide. Every other PDF in the
 * folder is still recorded, under `_other`, as an `{id, name}` list â€” those back
 * the "Other Quick Start" page, which shows each one titled from its file name.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT, log } from './lib/net.mjs'

/* The share link the site owner pasted. Only the id is used. */
const FOLDER_ID = '1yqPc7Hpq9F-YB9Pi5sL2jqbZdkX7FAXz'

/* Kept in step with GUIDE_SLUGS in src/lib/student-guides.server.ts. A file is
   only recorded when its name matches one of these, so the two lists must
   agree â€” the test guards this. */
const GUIDE_SLUGS = ['docker', 'github-actions', 'dvc', 'airflow', 'clearml', 'mlflow', 'langfuse', 'ragas', 'evidently']

const OUT_DIR = path.join(ROOT, 'public', 'quickstart')
const INDEX_FILE = path.join(OUT_DIR, 'index.json')
const TIMEOUT_MS = 30_000

async function getText(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (mlopsmena.com quickstart sync)' },
    })
    if (!res.ok) {
      log.warn(`${res.status} ${res.statusText} from ${url}`)
      return null
    }
    return await res.text()
  } catch (err) {
    log.warn(`request failed for ${url}: ${err.message}`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Scrapes {id, name} for every file the public folder page lists.
 *
 * Drive ships the folder contents inside a bootstrap array in the HTML, where
 * each file appears as `["<fileId>",["<parentId>"],"<name>",...]`. This pulls
 * the id + name pairs out of that structure. It is inherently brittle â€” if the
 * page shape changes this returns [] and the caller degrades gracefully.
 */
export function parseDriveFolder(html) {
  /* Drive ships the folder listing as a JS string literal with the quotes and
     brackets hex-escaped (`\x22` for ", `\x5b`/`\x5d` for []). Un-escape those
     first so the id/name structure below can be matched literally. Harmless on
     an already-unescaped page â€” there is just nothing to replace. */
  const decoded = html.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  )

  const files = []
  const seen = new Set()
  /* Each file: ["<fileId>",["<parentId>"],"<name>". The name capture stops at
     the first unescaped quote. */
  const re = /\["([-A-Za-z0-9_]{20,})",\["[-A-Za-z0-9_]{20,}"\],"((?:[^"\\]|\\.)*?\.pdf)"/g
  for (const m of decoded.matchAll(re)) {
    const id = m[1]
    const name = m[2].replace(/\\u003d/g, '=').replace(/\\"/g, '"')
    if (seen.has(id)) continue
    seen.add(id)
    files.push({ id, name })
  }
  return files
}

/** `docker.pdf` -> `docker`; returns null when the name is not a known slug. */
function slugFromName(name) {
  const base = name.toLowerCase().replace(/\.pdf$/, '').trim()
  return GUIDE_SLUGS.includes(base) ? base : null
}

/**
 * Turns the raw `{id, name}` list from the folder into the index written to
 * disk. A file named `<slug>.pdf` maps to that guide; every other PDF is kept
 * under `_other` (sorted by name) so the "Other Quick Start" page can list it.
 *
 * Key order is deterministic â€” GUIDE_SLUGS order, then `_other` â€” so the file on
 * disk only changes when the mapping actually does.
 */
export function buildIndex(files) {
  const map = {}
  const other = []
  const seenOther = new Set()
  for (const file of files) {
    const slug = slugFromName(file.name)
    if (slug) {
      /* First match wins if a slug somehow appears twice. */
      if (!(slug in map)) map[slug] = file.id
    } else if (!seenOther.has(file.id)) {
      seenOther.add(file.id)
      other.push({ id: file.id, name: file.name })
    }
  }

  const ordered = {}
  for (const slug of GUIDE_SLUGS) if (slug in map) ordered[slug] = map[slug]
  if (other.length > 0) {
    other.sort((a, b) => a.name.localeCompare(b.name))
    ordered._other = other
  }
  return ordered
}

/** The map already on disk, or {} â€” used to leave things untouched on failure. */
function readExisting() {
  try {
    const parsed = JSON.parse(readFileSync(INDEX_FILE, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function main() {
  const folderUrl = `https://drive.google.com/drive/folders/${FOLDER_ID}`
  const html = await getText(folderUrl)
  if (!html) {
    log.warn('could not read the Drive folder â€” keeping existing index.json, skipping sync')
    return
  }

  const files = parseDriveFolder(html)
  if (files.length === 0) {
    log.warn('no PDFs found in the folder â€” keeping existing index.json, skipping sync')
    return
  }

  const ordered = buildIndex(files)

  const before = JSON.stringify(readExisting())
  const after = JSON.stringify(ordered)

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(INDEX_FILE, `${JSON.stringify(ordered, null, 2)}\n`)

  const topics = GUIDE_SLUGS.filter((slug) => slug in ordered)
  const otherCount = Array.isArray(ordered._other) ? ordered._other.length : 0
  const summary = `${topics.length} topic(s)${topics.length ? ` (${topics.join(', ')})` : ''}, ${otherCount} other`
  if (before === after) log.info(`quick start sync: unchanged â€” ${summary}`)
  else log.ok(`quick start sync: ${summary}`)
}

/* Only fetch when run as a script (`node sync-quickstart.mjs`), not when the
   test file imports `parseDriveFolder`. */
const runDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (runDirectly) {
  main().catch((err) => {
    /* Absolute backstop: nothing this script does may fail a build. */
    log.warn(`quick start sync error (ignored): ${err.message}`)
    process.exit(0)
  })
}
