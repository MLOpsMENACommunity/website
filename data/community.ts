/**
 * Fallback one-liners for our own repositories.
 *
 * The cards themselves come from the GitHub org — `scripts/fetch-github.mjs`
 * lists every public repo under it, so publishing a repo puts it on the site
 * with no edit here. A repo's GitHub description wins whenever it has one; this
 * map only covers repos whose description is still empty, and the right fix for
 * those is to write one on GitHub rather than to add a line here.
 *
 * Keyed by repo name. Arabic lives in `src/lib/content-i18n.ts`.
 */
export const repoNotes: Record<string, string> = {
  website: 'The source of this site — Next.js, static export, open to read and fork.',
}

/**
 * Community team and mentors.
 *
 * Only entries with `real: true` are rendered — so no placeholder names are
 * ever shown publicly. TODO: paste the real mentors here, set `real: true`,
 * and they appear on the homepage automatically.
 */
export const mentors = [
  {
    name: 'Aya Nasser Salama',
    role: 'Founder · Senior MLOps Engineer',
    bio: 'Founded MLOps MENA, writes the roadmaps, and teaches The MLOps Practitioner.',
    initials: 'AN',
    real: true,
  },
  // { name: '', role: '', bio: '', initials: '', real: true },
] as const

/** Homepage "what we do" pillars. */
export const pillars = [
  { icon: 'Radio', title: 'Live sessions',
    desc: 'Regular live sessions on production ML, taught by engineers who ship it. Recorded and published free.' },
  { icon: 'Map', title: 'Learning roadmaps',
    desc: 'Three structured paths from zero to job-ready, built entirely on free and open-source resources.' },
  { icon: 'GraduationCap', title: 'Open courses',
    desc: 'Cohort-based courses with live lessons, real projects, and a certificate — delivered with Zomra.' },
  { icon: 'FlaskConical', title: 'Research support',
    desc: 'Help for researchers on reproducibility, tooling, and the engineering behind publishable work.' },
  { icon: 'Briefcase', title: 'Internships',
    desc: 'Routes into real teams through our partners, so students finish with production experience.' },
  { icon: 'Users', title: 'A community that answers',
    desc: 'Thousands of engineers across MENA who review your code, unblock you, and share openings.' },
] as const
