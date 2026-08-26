/**
 * Free community sessions — ONE list, any order.
 *
 * Whether a session is upcoming, live, ended or archived is derived from
 * `startsAt` + `durationMinutes` at render time (see `src/lib/sessions.ts`), so
 * there is nothing to move when a session airs. Add it once and forget it.
 *
 * After a session airs, the only edit worth making is pasting its `youtubeId`,
 * which flips it from "recording coming soon" to a watch link.
 */

export type Session = {
  slug: string
  title: string
  subtitle: string
  speaker: string
  speakerRole: string
  /** ISO-8601 WITH offset. Cairo is +03:00 in summer, +02:00 in winter. */
  startsAt: string
  /** Defaults to DEFAULT_DURATION_MINUTES (120) in src/lib/sessions.ts. */
  durationMinutes?: number
  topics: string[]
  registerUrl?: string
  sessionPageUrl?: string
  /** The 11-character YouTube id. The watch URL is derived from it. */
  youtubeId?: string
  /** Only for recordings that are not on YouTube. */
  recordingUrl?: string
  /** Escape hatch for dates the formatter cannot express, e.g. a two-day workshop. */
  dateLabelOverride?: string
  note?: string
}

export const sessions: Session[] = [
  {
    slug: 'docker-deep-dive',
    title: 'Docker Deep Dive',
    subtitle: 'Docker: Building the Foundation for MLOps — Day 1',
    speaker: 'Mahmoud Sharif',
    speakerRole: 'Instructor · 3+ years experience',
    startsAt: '2026-08-22T20:00:00+03:00',
    topics: [
      'Virtualization vs containerization',
      'Docker architecture',
      'Images & containers',
      'Networking',
      'Storage & volumes',
      'Writing a Dockerfile',
      'Security',
      'Docker Compose',
    ],
    registerUrl: 'https://zomra.io/free-sessions/75841596-2358-4ec5-b6e7-ee3fbc45bb63',
    note: 'No prerequisites — no prior Docker or Kubernetes required.',
    youtubeId: 'AFcoKDtyhec',
  },
  {
    slug: 'hands-on-cicd-github-actions',
    title: 'Hands-on CI/CD and GitHub Actions',
    subtitle: 'Build a working workflow file you can drop into your own repo the same day',
    speaker: 'Abdallah Almalawany',
    speakerRole: 'DevOps Engineer',
    startsAt: '2026-08-29T19:00:00+03:00',
    durationMinutes: 90,
    topics: [
      'Writing ci.yml from scratch',
      'Triggers, jobs and steps',
      'needs: and matrix builds',
      'Hosted vs self-hosted runners',
      'Artifacts and caching',
      'Secrets and GITHUB_TOKEN scope',
      'Conditions and approval gates',
      'Pinning actions to a SHA',
      'Ruff and pre-commit',
    ],
    // TODO: paste the Zomra registration URL — without it the register button
    // does not render and people can only reach the session through WhatsApp.
    note: 'Assumes Git branching, Bash basics, and building and pushing a Docker image.',
  },
  {
    slug: 'on-prem-mlops-playbook',
    title: 'The On-Prem MLOps Playbook',
    subtitle: 'Bridging Traditional DevOps and Private AI Workloads',
    speaker: 'Mohamed Rashad',
    speakerRole: 'Co-Founder & CTO, DevisionX',
    startsAt: '2026-08-06T20:00:00+03:00',
    topics: [],
    youtubeId: '0ta-roIGJWc',
    sessionPageUrl: 'https://zomra.io/free-sessions/9d02ae3d-0598-4d41-9596-9d5c57db6362',
  },
]
