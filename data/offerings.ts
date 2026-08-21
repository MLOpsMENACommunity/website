/** "What else we offer". Source: master reference §7. */

export const offerings = [
  {
    id: 'mentorship',
    icon: 'Compass',
    title: 'Mentorship for members',
    blurb: 'One-to-one help from engineers who do this work, free for community members.',
    accent: 'cyan',
    items: [
      'Career direction',
      'Portfolio and repo review',
      'Interview preparation',
      'Unblocking a specific technical problem',
      'Research support for papers',
    ],
  },
  {
    id: 'consultation',
    icon: 'Building2',
    title: 'Consultation for companies',
    blurb: 'Practical help for teams putting machine learning into production.',
    accent: 'amber',
    items: [
      'MLOps maturity review',
      'Architecture consultation',
      'Cost and performance review',
      'Team training on your stack',
      'Hiring support',
    ],
  },
  {
    id: 'internships',
    icon: 'Briefcase',
    title: 'Internships with partners',
    blurb: 'Routing students to openings with the companies we work with.',
    accent: 'violet',
    items: [
      'Introductions to partner companies',
      'Portfolio review before you apply',
      'Real production experience, not toy projects',
    ],
  },
] as const

/** Course 02 — announced, not yet scheduled. */
export const upcomingCourse = {
  slug: 'llmops',
  number: '02',
  title: 'LLMOps',
  status: 'Coming soon',
  summary:
    'Serving, evaluating, and operating LLM systems in production — the operational half of GenAI that almost nobody teaches.',
  topics: [
    'High-throughput serving with vLLM',
    'RAG architecture and retrieval quality',
    'Evaluation without ground truth',
    'Tracing and observability with Langfuse',
    'Token cost and latency budgets',
    'Guardrails and safety filtering',
  ],
} as const
