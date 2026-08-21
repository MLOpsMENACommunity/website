/**
 * The four WhatsApp study groups for The MLOps Practitioner.
 * Source: basic_community_info/study_groups.md (translated from Arabic).
 */
export const studyGroups = [
  {
    n: 1,
    name: 'MLOps Beginner',
    accent: 'teal',
    href: 'https://chat.whatsapp.com/HuaUwrKvvRu6oPKYd3zgU1?s=cl&p=i&ilr=4&amv=0',
    joinIf: [
      'Junior in Machine Learning or Data Science',
      'Comfortable with Python and ML fundamentals',
      'Still new to Linux, Git, and Docker',
      'No real deployment or cloud experience yet',
      'Want to start MLOps from zero',
    ],
    focus: ['Git', 'Linux', 'Docker', 'APIs', 'CI/CD basics', 'Intro to MLOps'],
  },
  {
    n: 2,
    name: 'MLOps Intermediate',
    accent: 'cyan',
    href: 'https://chat.whatsapp.com/CtNc1LsLdf71siNeHX2D1D?s=cl&p=i&ilr=4&amv=0',
    joinIf: [
      'Backend or software engineering experience',
      'Working with APIs, FastAPI or Flask',
      'Solid with Git and Docker',
      'Have deployment and CI/CD basics',
      'Starting with ML models and want them in production',
    ],
    focus: ['Model Serving', 'Docker', 'CI/CD', 'MLflow', 'Airflow', 'Model Deployment'],
  },
  {
    n: 3,
    name: 'Advanced MLOps / Cloud',
    accent: 'violet',
    href: 'https://chat.whatsapp.com/HBs4YZzpyCdGV3wnA0pAx0?s=cl&p=i&ilr=4&amv=0',
    joinIf: [
      'Real hands-on cloud experience — AWS, GCP, or Azure',
      'Strong with Docker and CI/CD',
      'Experience or working knowledge of Kubernetes',
      'Worked with infrastructure, Terraform, and monitoring',
      'Want to go deep on MLOps platforms and scalable ML systems',
    ],
    focus: ['Kubernetes', 'Cloud', 'Terraform', 'ML Pipelines', 'Monitoring', 'Scalability', 'Production MLOps'],
  },
  {
    n: 4,
    name: 'DevOps → MLOps',
    accent: 'amber',
    href: 'https://chat.whatsapp.com/L0ZXg3qdY1QLwN07N5yryV?s=cl&p=i&ilr=4&amv=0',
    joinIf: [
      'Currently working as DevOps, Platform, Cloud, or SRE',
      'Strong in Linux, Docker, Kubernetes, CI/CD, and cloud',
      'The gap is not Ops — it is the Machine Learning half',
      'Want to transition from DevOps into MLOps',
    ],
    focus: [
      'ML Fundamentals', 'ML Lifecycle', 'Experiment Tracking',
      'Model Registry', 'ML Pipelines', 'Model Deployment', 'MLOps Architecture',
    ],
  },
] as const

/** The quick-pick rule from the original post. */
export const groupRule = [
  { you: 'ML Junior', group: 'Group 1' },
  { you: 'Backend / Software Engineer', group: 'Group 2' },
  { you: 'Cloud + Kubernetes + MLOps', group: 'Group 3' },
  { you: 'DevOps / Platform Engineer', group: 'Group 4' },
] as const

export const groupRuleNote =
  'Most important: pick your group based on your actual hands-on experience, not your job title.'
