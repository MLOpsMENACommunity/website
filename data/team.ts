/**
 * Team structure: one founder, two community directors, six owned axes.
 *
 * Photos, bios and LinkedIn URLs are PLACEHOLDERS — fill them in and they
 * render automatically:
 *   photo:    put a file in /public/team/ and set e.g. '/team/omar-salah.jpg'
 *   bio:      replace the placeholder sentence
 *   linkedin: paste the profile URL
 * Anything left empty degrades gracefully — initials instead of a photo, and
 * the LinkedIn link simply does not render.
 */

export type Member = {
  name: string
  role: string
  initials: string
  /** Path under /public, e.g. '/team/aya-nasser.jpg'. Empty → initials avatar. */
  photo: string
  bio: string
  linkedin: string
}

const PLACEHOLDER_BIO = 'Short bio coming soon.'

export const founder: Member = {
  name: 'Aya Nasser Salama',
  role: 'Founder',
  initials: 'AN',
  photo: '',
  bio: 'Founded MLOps MENA, writes the roadmaps, and teaches The MLOps Practitioner. Senior MLOps Engineer.',
  linkedin: 'https://www.linkedin.com/in/ayanasser',
}

export const directors: Member[] = [
  { name: 'Bassem Abusaif', role: 'Community Director', initials: 'BA', photo: '', bio: PLACEHOLDER_BIO, linkedin: '' },
  { name: 'Omar Salah', role: 'Community Director', initials: 'OS', photo: '', bio: PLACEHOLDER_BIO, linkedin: '' },
]

/** The six owned axes, in order. */
export const leads: (Member & { axis: number })[] = [
  { axis: 1, name: 'Mohamed Samy', role: 'AI Instructor Lead', initials: 'MS', photo: '', bio: PLACEHOLDER_BIO, linkedin: '' },
  { axis: 2, name: 'Zakaria Ahmed', role: 'AI Content Lead', initials: 'ZA', photo: '', bio: PLACEHOLDER_BIO, linkedin: '' },
  { axis: 3, name: 'Adham AbdelAzeem', role: 'AI Research Lead', initials: 'AA', photo: '', bio: PLACEHOLDER_BIO, linkedin: '' },
  { axis: 4, name: 'Radwa Khattab', role: 'AI Community Growth & Partnerships Lead', initials: 'RK', photo: '', bio: PLACEHOLDER_BIO, linkedin: '' },
  { axis: 5, name: 'Mariam Qotb', role: 'AI Sessions & Mentorship Lead', initials: 'MQ', photo: '', bio: PLACEHOLDER_BIO, linkedin: '' },
  { axis: 6, name: 'Mahmoud Abu elnour', role: 'AI Platform Lead', initials: 'MA', photo: '', bio: PLACEHOLDER_BIO, linkedin: '' },
]

export const teamSummary = 'One founder, two directors, six owned axes.'
export const teamCount = 1 + directors.length + leads.length
