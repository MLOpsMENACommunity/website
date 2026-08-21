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
  // Corrected from "@gmail.co" in the master reference — Gmail only issues
  // @gmail.com addresses, so the original was undeliverable.
  email: 'mlopsmenacommunity@gmail.com',
  founder: {
    name: 'Aya Nasser Salama',
    role: 'Founder · Senior MLOps Engineer',
    email: 'aya.nasser.mohammed@gmail.com',
    linkedin: 'https://www.linkedin.com/in/ayanasser',
    purpose: 'Partnerships',
  },
} as const

/** Free-join promo for the Brainsmingle space. */
export const brainsmingle = {
  href: channels.brainsmingle,
  code: 'FREECORETEAM',
  note: 'Free to join this week with code',
} as const

export const primaryChannel: keyof typeof channels = 'whatsapp'

/** Community at a glance. Rendered as animated counters. */
export const stats = [
  { label: 'WhatsApp members', value: 3000, suffix: '+', href: channels.whatsapp },
  { label: 'LinkedIn followers', value: 3000, suffix: '+', href: channels.linkedin },
  { label: 'Course students', value: 1200, suffix: '+', href: channels.zomra },
  { label: 'YouTube views', value: 4000, suffix: '+', href: channels.youtube },
  { label: 'YouTube subscribers', value: 1000, suffix: '', href: channels.youtube },
] as const

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

export const nav = [
  { label: 'Roadmaps', href: '/roadmaps' },
  { label: 'Courses', href: '/courses' },
  { label: 'Sessions', href: '/sessions' },
  { label: 'Articles', href: '/articles' },
  { label: 'Mentorship', href: '/mentorship' },
  { label: 'FAQ', href: '/faq' },
] as const
