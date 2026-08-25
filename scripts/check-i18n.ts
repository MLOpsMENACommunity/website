/**
 * Reports content that has drifted out of sync with its Arabic overlay.
 *
 * Three findings, of which ORPHAN is the one that earns its keep: a renamed key
 * produces exactly one MISSING and one ORPHAN, an unmistakable pair. Without it
 * a rename is indistinguishable from "never translated".
 *
 * Exits 0 with warnings by default so it can never block a deploy — a newly
 * ingested article must not stop the site shipping. `--strict` exits 1.
 */
import { sessions } from '../data/sessions'
import { externalArticles } from '../data/articles'
import { getRoadmaps } from '../src/lib/roadmaps'
import { sessionsAr, articlesAr, roadmapsAr } from '../src/lib/content-i18n'

type Finding = { kind: 'MISSING' | 'ORPHAN' | 'PHASE_MISMATCH'; where: string; detail: string }
const findings: Finding[] = []

function compare(label: string, englishKeys: string[], arabicKeys: string[]) {
  for (const k of englishKeys) {
    if (!arabicKeys.includes(k)) {
      findings.push({ kind: 'MISSING', where: label, detail: `${k} — renders in English on /ar` })
    }
  }
  for (const k of arabicKeys) {
    if (!englishKeys.includes(k)) {
      findings.push({ kind: 'ORPHAN', where: label, detail: `${k} — Arabic entry matches nothing` })
    }
  }
}

compare('session', sessions.map((s) => s.slug), Object.keys(sessionsAr))
compare('article', externalArticles.map((a) => a.id), Object.keys(articlesAr))

const roadmaps = getRoadmaps()
compare('roadmap', roadmaps.map((r) => r.slug), Object.keys(roadmapsAr))

for (const r of roadmaps) {
  const ar = roadmapsAr[r.slug]
  if (!ar) continue
  for (const p of r.phases) {
    if (!(p.label in ar.phases)) {
      findings.push({
        kind: 'PHASE_MISMATCH',
        where: `roadmap ${r.slug}`,
        detail: `"${p.label}" has no Arabic title — a phase was probably inserted or renamed`,
      })
    }
  }
  for (const label of Object.keys(ar.phases)) {
    if (!r.phases.some((p) => p.label === label)) {
      findings.push({
        kind: 'PHASE_MISMATCH',
        where: `roadmap ${r.slug}`,
        detail: `Arabic has "${label}" but the markdown does not`,
      })
    }
  }
}

if (findings.length === 0) {
  console.log('✓ Arabic overlays cover every session, article and roadmap.')
} else {
  console.log(`Arabic translation coverage — ${findings.length} finding(s):\n`)
  for (const f of findings) {
    console.log(`  ${f.kind.padEnd(15)} ${f.where.padEnd(24)} ${f.detail}`)
  }
  console.log(
    '\n  MISSING + ORPHAN for the same item means a key was renamed, not that it is untranslated.',
  )
}

process.exit(process.argv.includes('--strict') && findings.length > 0 ? 1 : 0)
