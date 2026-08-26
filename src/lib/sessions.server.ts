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
const POSTER_FORMATS = ['jpg', 'png', 'webp', 'jpeg'] as const

export function sessionPoster(s: Session): string {
  for (const ext of POSTER_FORMATS) {
    const rel = `/sessions/${s.slug}.${ext}`
    if (fs.existsSync(path.join(process.cwd(), 'public', rel))) return asset(rel)
  }
  return asset('/logo-full.png')
}
