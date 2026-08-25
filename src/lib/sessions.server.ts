import fs from 'node:fs'
import path from 'node:path'
import type { Session } from '~/data/sessions'
import { asset } from './asset'

/**
 * Poster for a session card. Sessions are expected to ship a 1200px cover at
 * `public/sessions/<slug>.jpg`; without this check a session added without one
 * renders a broken `next/image`. Build-time only — same `fs` trick `roadmaps.ts`
 * already uses.
 */
export function sessionPoster(s: Session): string {
  const rel = `/sessions/${s.slug}.jpg`
  return fs.existsSync(path.join(process.cwd(), 'public', rel))
    ? asset(rel)
    : asset('/logo-full.png')
}
