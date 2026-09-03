/**
 * What we offer — the free community side and the commercial side.
 *
 * The split is load-bearing for the copy, not just for layout. Sessions,
 * roadmaps, articles, study groups and member mentorship are free and stay
 * free; everything under `companyServices` is paid work for companies, and
 * that work is what keeps the free side running. Nothing here puts community
 * content behind a paywall, and no page should imply otherwise.
 *
 * `icon` names a lucide export resolved in `src/views/ServicesView.tsx`, and
 * `accent` picks one of the four brand accents defined there. Arabic overlays
 * live in `src/lib/content-i18n.ts`, keyed by `id`.
 */

/** Free for anyone in the community. No invoice, no tier, no upsell. */
export const communityServices = [
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
    ],
  },
  {
    id: 'research',
    icon: 'FlaskConical',
    title: 'Research support',
    blurb: 'Help for researchers on the engineering half of publishable work.',
    accent: 'teal',
    items: [
      'Reproducibility and experiment tracking',
      'Tooling and environment setup',
      'Engineering review before submission',
    ],
  },
  {
    id: 'internships',
    icon: 'Briefcase',
    title: 'Internship routes',
    blurb: 'Routing students to real openings with the companies we work with.',
    accent: 'violet',
    items: [
      'Introductions to partner companies',
      'Portfolio review before you apply',
      'Real production experience, not toy projects',
    ],
  },
] as const

/**
 * Paid engagements. `contact` selects the role address the card points at —
 * see `roleAddresses` in site.config.ts.
 */
export const companyServices = [
  {
    id: 'outsourcing',
    icon: 'UsersRound',
    title: 'Talent outsourcing',
    blurb:
      'Engineers from our talent pool, embedded in your team — with a moderation team of ours following up on the work, not an agency that forwards a CV and disappears.',
    accent: 'teal',
    contact: 'services',
    items: [
      'Vetted AI, MLOps, DevOps and software engineers',
      'Embedded in your team, your stack, your sprints',
      'A moderation lead who tracks output and quality weekly',
      'A replacement if a match is not working out',
      'Short contracts or long-running engagements',
    ],
  },
  {
    id: 'training',
    icon: 'GraduationCap',
    title: 'Training for your employees',
    blurb:
      'Hands-on training for the engineers you already have, on two tracks: MLOps, and GenAI — covering RAG and agentic systems.',
    accent: 'amber',
    contact: 'trainings',
    items: [
      'Two tracks — MLOps and GenAI',
      'Taught on your stack, against your own use cases',
      'Live cohorts built around labs, not slideware',
      'Per-engineer progress reporting for the team lead',
      'On-site in Egypt, or remote across the region',
    ],
  },
  {
    id: 'projects',
    icon: 'Blocks',
    title: 'Software project delivery',
    blurb:
      'An in-house senior team that takes a project from architecture to production — every stage covered, no juniors billed as seniors.',
    accent: 'violet',
    contact: 'services',
    items: [
      'Discovery and architecture through to shipping',
      'Seniors across AI, MLOps, DevOps, backend, frontend, QA and cloud',
      'Handover with documentation, CI/CD and runbooks',
      'Fixed-scope projects or a dedicated team',
    ],
  },
  {
    id: 'consultation',
    icon: 'Building2',
    title: 'MLOps consultation',
    blurb: 'Practical help for teams putting machine learning into production and keeping it there.',
    accent: 'cyan',
    contact: 'services',
    items: [
      'MLOps maturity review',
      'Architecture consultation',
      'Cost and performance review',
      'Hiring support and technical interviewing',
    ],
  },
] as const

/**
 * The three training tracks, in the order we pitch them. `group` lets the two
 * GenAI tracks read as one offering with two streams, which is how companies
 * actually buy them.
 */
export const trainingTracks = [
  {
    id: 'mlops',
    group: 'MLOps',
    title: 'MLOps',
    summary:
      'Taking a model out of the notebook and running it in production — the gap most teams discover only after the model works.',
    topics: [
      'Containerisation and reproducible environments',
      'Experiment tracking and model registries',
      'CI/CD for models and pipelines',
      'Serving, scaling and rollout strategies',
      'Monitoring, drift and retraining triggers',
      'Cost and performance tuning',
    ],
  },
  {
    id: 'genai-rag',
    group: 'GenAI',
    title: 'RAG systems',
    summary:
      'Retrieval-augmented generation that survives contact with real documents and real users.',
    topics: [
      'Chunking, embeddings and vector stores',
      'Retrieval quality and reranking',
      'Evaluation without ground truth',
      'Grounding, citations and hallucination control',
      'Latency and token cost budgets',
      'Tracing and observability',
    ],
  },
  {
    id: 'genai-agentic',
    group: 'GenAI',
    title: 'Agentic systems',
    summary:
      'Agents that call tools, hold state, and fail safely — built to be operated, not demoed.',
    topics: [
      'Tool calling and function schemas',
      'Orchestration and multi-step planning',
      'Memory and state across turns',
      'Guardrails, permissions and human review',
      'Evaluating agent trajectories',
      'Deploying and monitoring agents in production',
    ],
  },
] as const

/** The disciplines we can staff or deliver against, senior level in each. */
export const disciplines = [
  { id: 'ai', icon: 'Brain', label: 'AI & Machine Learning' },
  { id: 'mlops', icon: 'Workflow', label: 'MLOps & LLMOps' },
  { id: 'devops', icon: 'GitBranch', label: 'DevOps & CI/CD' },
  { id: 'backend', icon: 'Server', label: 'Backend' },
  { id: 'frontend', icon: 'MonitorSmartphone', label: 'Frontend & full-stack' },
  { id: 'qa', icon: 'Bug', label: 'QA & testing' },
  { id: 'cloud', icon: 'Cloud', label: 'Cloud & infrastructure' },
] as const

/** How an engagement actually starts. Four steps, no discovery-call theatre. */
export const engagementSteps = [
  {
    id: 'scope',
    title: 'Tell us the problem',
    desc: 'A short email with what you are trying to ship, the stack, and the timeline.',
  },
  {
    id: 'call',
    title: 'One call',
    desc: 'We work out whether this is training, staffing, delivery, or a review — and say so plainly if it is none of them.',
  },
  {
    id: 'proposal',
    title: 'Scope and proposal',
    desc: 'Named engineers, a scope, and a price. No open-ended retainers.',
  },
  {
    id: 'start',
    title: 'Start, with follow-up',
    desc: 'A moderation lead of ours stays on the engagement and reports on it, for the whole duration.',
  },
] as const
