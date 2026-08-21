/**
 * Articles published on LinkedIn and Medium. Source: master reference §8
 * ("Published articles on LinkedIn and Medium").
 *
 * TODO: paste any further published article URLs here — the page picks them up
 * automatically, newest first.
 */

export type ExternalArticle = {
  title: string
  description: string
  date: string
  platform: 'LinkedIn' | 'Medium'
  href: string
  tags: string[]
  /** Set when the article also exists as a full roadmap page on this site. */
  internalHref?: string
}

export const externalArticles: ExternalArticle[] = [
  {
    title: 'MLOps Roadmap for Seniors',
    description:
      'Seven specializations — LLMOps, model optimization, production Kubernetes, advanced monitoring, performance and load testing, system design for ML, and soft skills. Pick two or three and go deep.',
    date: '2026-07-08',
    platform: 'LinkedIn',
    href: 'https://www.linkedin.com/pulse/mlops-roadmap-seniors-mlops-mena-hvbie/',
    tags: ['roadmap', 'senior', 'career'],
    internalHref: '/roadmaps/senior-mlops-engineer',
  },
  {
    title: 'The DevOps to MLOps Transition Roadmap',
    description:
      'You already own 60–70% of the skillset. This roadmap adds only the ML layer on top — the fastest career pivot in tech, in five phases over three to five months.',
    date: '2026-07-08',
    platform: 'LinkedIn',
    href: 'https://www.linkedin.com/pulse/devops-mlops-transition-roadmap-mlops-mena-sgq8e/',
    tags: ['roadmap', 'devops', 'career'],
    internalHref: '/roadmaps/devops-to-mlops',
  },
  {
    title: 'Basic MLOps Engineer Roadmap',
    description:
      'The roadmap I would give my younger self — five phases over six to nine months, built entirely on free and open-source resources, because the real knowledge in this field lives on GitHub and YouTube.',
    date: '2026-06-27',
    platform: 'LinkedIn',
    href: 'https://www.linkedin.com/pulse/basic-mlops-engineer-roadmap-mlops-mena-8lj0e/',
    tags: ['roadmap', 'beginner'],
    internalHref: '/roadmaps/basic-mlops-engineer',
  },
]
