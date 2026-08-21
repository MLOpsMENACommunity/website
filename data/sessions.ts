/** Free community sessions. Source: master reference §4. */

export type Session = {
  slug: string
  title: string
  subtitle: string
  speaker: string
  speakerRole: string
  /** ISO-8601 WITH offset. Cairo is +03:00 in summer, +02:00 in winter. */
  startsAt: string
  dateLabel: string
  topics: string[]
  registerUrl?: string
  sessionPageUrl?: string
  recordingUrl?: string
  note?: string
}

export const upcomingSessions: Session[] = [
  {
    slug: 'docker-deep-dive',
    title: 'Docker Deep Dive',
    subtitle: 'Docker: Building the Foundation for MLOps — Day 1',
    speaker: 'Mahmoud Sharif',
    speakerRole: 'Instructor · 3+ years experience',
    // TODO: confirm the start time — the master reference gives the date only.
    // 8:00 PM Cairo assumed, matching the previous session's slot.
    startsAt: '2026-08-22T20:00:00+03:00',
    dateLabel: 'Saturday, 22 Aug · 8:00 PM Cairo',
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
  },
]

export const pastSessions: Session[] = [
  {
    slug: 'on-prem-mlops-playbook',
    title: 'The On-Prem MLOps Playbook',
    subtitle: 'Bridging Traditional DevOps and Private AI Workloads',
    speaker: 'Mohamed Rashad',
    speakerRole: 'Co-Founder & CTO, DevisionX',
    startsAt: '2026-08-06T20:00:00+03:00',
    dateLabel: 'Thursday, 6 Aug · 8:00 PM Cairo',
    topics: [],
    recordingUrl: 'https://www.youtube.com/watch?v=0ta-roIGJWc',
    sessionPageUrl: 'https://zomra.io/free-sessions/9d02ae3d-0598-4d41-9596-9d5c57db6362',
  },
]

/** Soonest upcoming session — drives the homepage countdown. */
export const nextSession = upcomingSessions[0]
