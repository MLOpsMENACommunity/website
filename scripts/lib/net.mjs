/**
 * Shared plumbing for the data fetchers.
 *
 * The governing rule: `next build` never touches the network. Fetching is a
 * separate, earlier, failure-tolerant step whose only output is JSON committed
 * to git. A fetcher that cannot reach the internet leaves the last good file in
 * place and exits 0 — a broken network must never blank a section of the site
 * or fail a deploy.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export const log = {
  info: (m) => console.log(`  ${m}`),
  ok: (m) => console.log(`  ✓ ${m}`),
  warn: (m) => console.warn(`  ! ${m}`),
}

/** GET with a timeout. Resolves to null on any failure — never throws. */
export async function get(url, { timeoutMs = 15_000, headers = {} } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'mlopsmena.com data refresh', ...headers },
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

export function readJson(relPath, fallback) {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, relPath), 'utf8'))
  } catch {
    return fallback
  }
}

/**
 * Writes only when the content actually changed.
 *
 * Deterministic output matters more than it looks: the scheduled job commits
 * this file, so anything that varies between two identical runs — a timestamp,
 * an unstable sort, a rotating tracking parameter — turns a quiet repo into
 * several junk commits a day, each triggering a rebuild.
 */
export function writeJsonIfChanged(relPath, value) {
  const full = path.join(ROOT, relPath)
  const next = `${JSON.stringify(value, null, 2)}\n`
  let prev = null
  try {
    prev = readFileSync(full, 'utf8')
  } catch {
    /* first write */
  }
  if (prev === next) {
    log.info(`${relPath} unchanged`)
    return false
  }
  writeFileSync(full, next)
  log.ok(`${relPath} updated`)
  return true
}

/**
 * Rounds down to a multiple of `step`.
 *
 * View counts move every few minutes; without this the cron would commit a
 * +3-views diff four times a day. It also keeps the "+" in "4,100+" truthful,
 * since the counter renders anything >= 1000 as e.g. "4.1K".
 */
export function quantise(n, step = 100) {
  return typeof n === 'number' && Number.isFinite(n) ? Math.floor(n / step) * step : undefined
}
