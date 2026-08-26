/**
 * Curated GitHub repositories. Replace hrefs with your own org repos as they land.
 *
 * `stars` is the floor — what shows when no refresh has run. `scripts/fetch-github.mjs`
 * reads the hrefs below to know which repos to ask about and overwrites the figure
 * via `getRepos()`, so a new card needs no change anywhere else. `lang` and `desc`
 * stay hand-written: the API's answers for those are worse than a human's.
 */
export const repos = [
  { name: 'mlops-zoomcamp', owner: 'DataTalksClub', stars: '15.2k', lang: 'Jupyter',
    desc: 'Free MLOps course covering the full lifecycle — a staple starting point.',
    href: 'https://github.com/DataTalksClub/mlops-zoomcamp', tags: ['course', 'free'] },
  { name: 'awesome-mlops', owner: 'visenger', stars: '14.2k', lang: 'Markdown',
    desc: 'The reference list of MLOps papers, tools, and articles.',
    href: 'https://github.com/visenger/awesome-mlops', tags: ['reference'] },
  { name: 'mlflow', owner: 'mlflow', stars: '27.7k', lang: 'Python',
    desc: 'Experiment tracking, model registry, and lifecycle management.',
    href: 'https://github.com/mlflow/mlflow', tags: ['tracking'] },
  { name: 'dvc', owner: 'iterative', stars: '15.8k', lang: 'Python',
    desc: 'Git for data — version datasets and models alongside your code.',
    href: 'https://github.com/iterative/dvc', tags: ['versioning'] },
  { name: 'BentoML', owner: 'bentoml', stars: '8.8k', lang: 'Python',
    desc: 'Build, ship, and scale model serving without writing infrastructure.',
    href: 'https://github.com/bentoml/BentoML', tags: ['serving'] },
  { name: 'evidently', owner: 'evidentlyai', stars: '7.8k', lang: 'Python',
    desc: 'Data and model drift detection with reports you can actually read.',
    href: 'https://github.com/evidentlyai/evidently', tags: ['monitoring'] },
] as const

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
