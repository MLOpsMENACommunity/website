import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'

const DIR = path.join(process.cwd(), 'content', 'roadmaps')

export type Accent = 'cyan' | 'amber' | 'violet'

export type RoadmapMeta = {
  slug: string
  title: string
  tagline: string
  accent: Accent
  level: string
  duration: string
  commitment: string
  published: string
  sourceUrl: string
  audience: string
  /** "Phase 0 — Foundations (Month 1-2)" headings, for the timeline strip. */
  phases: { label: string; title: string; when: string }[]
  resourceCount: number
}

export type Roadmap = RoadmapMeta & { html: string }

/** Splits "Phase 0 — Foundations (Month 1-2)" into its three parts. */
function parseHeading(heading: string) {
  const m = heading.match(/^(Phase \d+|Specialization \d+)\s*—\s*(.+?)(?:\s*\(([^)]+)\))?$/)
  if (!m) return { label: heading, title: '', when: '' }
  return { label: m[1], title: m[2].trim(), when: m[3]?.trim() ?? '' }
}

function read(fileName: string) {
  const slug = fileName.replace(/\.md$/, '')
  const { data, content } = matter(fs.readFileSync(path.join(DIR, fileName), 'utf8'))

  const phases = [...content.matchAll(/^##\s+((?:Phase|Specialization)\s+\d+.*)$/gm)]
    .map((m) => parseHeading(m[1].trim()))

  const meta: RoadmapMeta = {
    slug,
    title: data.title,
    tagline: data.tagline ?? '',
    accent: (data.accent ?? 'cyan') as Accent,
    level: data.level ?? '',
    duration: data.duration ?? '',
    commitment: data.commitment ?? '',
    published: data.published ?? '',
    sourceUrl: data.sourceUrl ?? '',
    audience: data.audience ?? '',
    phases,
    resourceCount: (content.match(/^- \[/gm) ?? []).length,
  }
  return { meta, content }
}

/** Ordered deliberately: beginner → transition → senior. */
const ORDER = ['basic-mlops-engineer', 'devops-to-mlops', 'senior-mlops-engineer']

export function getRoadmaps(): RoadmapMeta[] {
  if (!fs.existsSync(DIR)) return []
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => read(f).meta)
    .sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug))
}

export async function getRoadmap(slug: string): Promise<Roadmap | null> {
  const file = `${slug}.md`
  if (!fs.existsSync(path.join(DIR, file))) return null
  const { meta, content } = read(file)
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeStringify)
      .process(content),
  )
  return { ...meta, html }
}

export const accentClasses: Record<Accent, {
  text: string; border: string; bg: string; dot: string; grad: string
}> = {
  cyan: {
    text: 'text-cyan-400', border: 'border-cyan-400/35', bg: 'bg-cyan-400/10',
    dot: 'bg-cyan-400', grad: 'from-cyan-400/20',
  },
  amber: {
    text: 'text-amber-400', border: 'border-amber-400/35', bg: 'bg-amber-400/10',
    dot: 'bg-amber-400', grad: 'from-amber-400/20',
  },
  violet: {
    text: 'text-violet', border: 'border-violet/35', bg: 'bg-violet/10',
    dot: 'bg-violet', grad: 'from-violet/20',
  },
}
