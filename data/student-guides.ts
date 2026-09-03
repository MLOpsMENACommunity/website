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
]

export function getStudentGuide(slug: string) {
  return studentGuides.find((guide) => guide.slug === slug)
}
