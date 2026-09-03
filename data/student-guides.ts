export type StudentGuide = {
  slug: string
  title: string
  description: string
  category: string
  tags: string[]
}

/* Catalogue order: the array order is the order the cards render in. */
export const studentGuides: StudentGuide[] = [
  {
    slug: 'docker',
    title: 'The Complete Docker Guide',
    description:
      'A full containers course taught at three levels. Pick Beginner, Mid-level, or Senior, then read the detailed explanation, a fast interview review, or the practical tips and traps.',
    category: 'Containers & DevOps',
    tags: ['Docker', 'Containers', 'Docker Compose', 'DevOps', 'Interview prep'],
  },
  {
    slug: 'github-actions',
    title: 'The Complete GitHub Actions Guide',
    description:
      'A full CI/CD and repository-automation course taught at three levels. Pick Beginner, Mid-level, or Senior, then read the detailed explanation, a fast interview review, or the practical tips and traps.',
    category: 'CI/CD & Automation',
    tags: ['GitHub Actions', 'CI/CD', 'DevOps', 'Automation', 'Interview prep'],
  },
  {
    slug: 'dvc',
    title: 'The Complete DVC Guide',
    description:
      'A full data and pipeline versioning course taught at three levels. Pick Beginner, Mid-level, or Senior, then read the detailed explanation, a fast interview review, or the practical tips and traps.',
    category: 'Data & Reproducibility',
    tags: ['DVC', 'Data versioning', 'Pipelines', 'Experiments', 'Interview prep'],
  },
  {
    slug: 'airflow',
    title: 'The Complete Airflow Guide',
    description:
      'A full workflow orchestration course taught at three levels. Pick Beginner, Mid-level, or Senior, then read the detailed explanation, a fast interview review, or the practical tips and traps.',
    category: 'Orchestration & Scheduling',
    tags: ['Airflow', 'Orchestration', 'DAGs', 'Scheduling', 'Interview prep'],
  },
  {
    slug: 'clearml',
    title: 'The Complete ClearML Guide',
    description:
      'A full experiment tracking and MLOps platform course taught at three levels. Pick Beginner, Mid-level, or Senior, then read the detailed explanation, a fast interview review, or the practical tips and traps.',
    category: 'Experiment Tracking & MLOps',
    tags: ['ClearML', 'Experiment tracking', 'Model registry', 'Agents', 'Interview prep'],
  },
]

export function getStudentGuide(slug: string) {
  return studentGuides.find((guide) => guide.slug === slug)
}
