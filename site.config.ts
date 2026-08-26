/**
 * Single source of truth for links, stats, contacts and partners.
 * Source: "MLOps MENA Community — Master Reference", updated 21 Aug 2026.
 */

export const site = {
  name: 'MLOps MENA Community',
  shortName: 'MLOps MENA',
  url: 'https://mlopsmena.com',
  tagline: 'Free MLOps and AI learning for engineers across the Middle East and North Africa.',
  description:
    'Free MLOps and AI learning for engineers across the Middle East and North Africa. Live sessions, three structured roadmaps, open cohort courses, study groups, and mentorship.',
} as const

export const channels = {
  whatsapp: 'https://chat.whatsapp.com/Fumc1KNwp9CASOYJ31dRjJ',
  discord: 'https://discord.gg/9QJUnCmSD',
  linkedin: 'https://www.linkedin.com/company/mlops-mena',
  youtube: 'https://www.youtube.com/@MLOpsMENACommunity',
  github: 'https://github.com/MLOpsMENACommunity',
  brainsmingle: 'https://brainsmingle.com/spaces/mlops-mena-community',
  zomra: 'https://zomra.io/courses/the-mlops-practitioner',
} as const

export const contacts = {
  /** Forwards to the community inbox via Cloudflare Email Routing. */
  email: 'hello@mlopsmena.com',
  founder: {
    name: 'Aya Nasser Salama',
    role: 'Founder · Senior MLOps Engineer',
    email: 'aya@mlopsmena.com',
    linkedin: 'https://www.linkedin.com/in/ayanasser',
    purpose: 'Partnerships',
  },
} as const

/**
 * Role addresses. These outlive the people holding them — when an axis changes
 * hands you repoint the Cloudflare routing rule instead of editing the site.
 * All currently forward to the community inbox.
 */
export const roleAddresses = [
  { address: 'hello@mlopsmena.com', label: 'General enquiries' },
  { address: 'partnerships@mlopsmena.com', label: 'Partnerships' },
  { address: 'trainings@mlopsmena.com', label: 'Trainings' },
  { address: 'research@mlopsmena.com', label: 'Research support' },
] as const

/** Free-join promo for the Brainsmingle space. */
export const brainsmingle = {
  href: channels.brainsmingle,
  code: 'FREECORETEAM',
  note: 'Free to join this week with code',
} as const

export const primaryChannel: keyof typeof channels = 'whatsapp'

/**
 * Community at a glance. Rendered as animated counters.
 *
 * `value` is the floor — the number shown when nothing better is available.
 * The two YouTube tiles and the Discord tile are overwritten from real
 * figures by `src/lib/stats.ts`; the other three have no public API — neither
 * WhatsApp nor LinkedIn exposes one without a business account — so they stay
 * hand-edited here.
 * Read them through `getStats()`, not directly.
 */
export type StatId = 'whatsapp' | 'discord' | 'linkedin' | 'students' | 'yt-views' | 'yt-subs'

export const stats: {
  id: StatId
  label: string
  value: number
  suffix: string
  href: string
}[] = [
  { id: 'whatsapp', label: 'WhatsApp members', value: 3000, suffix: '+', href: channels.whatsapp },
  { id: 'discord', label: 'Discord members', value: 500, suffix: '+', href: channels.discord },
  { id: 'linkedin', label: 'LinkedIn followers', value: 3000, suffix: '+', href: channels.linkedin },
  { id: 'students', label: 'Course students', value: 1200, suffix: '+', href: channels.zomra },
  { id: 'yt-views', label: 'YouTube views', value: 4000, suffix: '+', href: channels.youtube },
  { id: 'yt-subs', label: 'YouTube subscribers', value: 1000, suffix: '', href: channels.youtube },
]

export const partners = [
  {
    name: 'Zomra',
    role: 'Educational Platform Partner',
    blurb:
      'Our courses and free sessions are hosted and delivered on Zomra, giving every learner in the region a structured place to enrol, follow along, and track progress.',
    href: 'https://zomra.io',
    logo: null,
    accent: 'teal',
  },
  {
    name: 'DevisionX',
    // Logo only, no label — per your instruction.
    role: null,
    blurb: null,
    href: 'https://devisionx.com',
    logo: '/partners/devisionx.png',
    accent: 'amber',
  },
] as const

/** `key` resolves to a translated label in src/lib/i18n.ts (nav.items). */
export const nav = [
  { key: 'roadmaps', href: '/roadmaps' },
  { key: 'courses', href: '/courses' },
  { key: 'sessions', href: '/sessions' },
  { key: 'team', href: '/team' },
  { key: 'mentorship', href: '/mentorship' },
  { key: 'articles', href: '/articles' },
  { key: 'faq', href: '/faq' },
] as const
