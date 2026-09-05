/**
 * Articles published on LinkedIn and Medium. Source: master reference §8
 * ("Published articles on LinkedIn and Medium").
 *
 * TODO: paste any further published article URLs here — the page picks them up
 * automatically, newest first.
 */

export type ExternalArticle = {
  /**
   * Stable key for the Arabic overlay in src/lib/content-i18n.ts. Never reuse
   * or rewrite one — the title can change freely, this cannot.
   */
  id: string
  title: string
  description: string
  date: string
  platform: 'LinkedIn' | 'Medium'
  href: string
  tags: string[]
  /** Set when the article also exists as a full roadmap page on this site. */
  internalHref?: string
}

import generated from './generated/articles.json'

/**
 * Hand-curated entries. These win over anything `npm run add:article` writes,
 * so a curated description is never overwritten by an og:description blurb.
 */
const curated: ExternalArticle[] = [
  {
    id: 'tokenization-how-llms-turn-text-something-can-process-mlops-mena',
    title: 'Tokenization: How LLMs Turn Text Into Something They Can Process',
    description:
      'You type a sentence and assume the model receives it as you wrote it. It does not. What actually happens to your text before the model ever sees it.',
    date: '2026-08-11',
    platform: 'LinkedIn',
    href: 'https://www.linkedin.com/pulse/tokenization-how-llms-turn-text-something-can-process-mlops-mena-idj2e',
    tags: ['llm', 'tokenization'],
  },
  {
    id: 'introduction-large-language-models-understanding-foundation',
    title: 'Introduction to Large Language Models: Understanding the Foundation of Modern AI',
    description:
      'What a large language model actually is, and why these models are called \'large\' — the foundation piece, before tokenization and everything built on top of it.',
    date: '2026-08-01',
    platform: 'LinkedIn',
    href: 'https://www.linkedin.com/pulse/introduction-large-language-models-understanding-foundation-qni7e',
    tags: ['llm', 'fundamentals'],
  },
  {
    id: 'mlops-roadmap-seniors',
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
    id: 'devops-mlops-transition-roadmap',
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
    id: 'basic-mlops-engineer-roadmap',
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

/**
 * Curated entries plus whatever `npm run add:article` has collected, de-duped
 * by id and by URL. The machine owns data/generated/articles.json; this file
 * stays hand-edited.
 */
export const externalArticles: ExternalArticle[] = [
  ...curated,
  ...(generated as ExternalArticle[]).filter(
    (g) => !curated.some((c) => c.id === g.id || c.href === g.href),
  ),
]
