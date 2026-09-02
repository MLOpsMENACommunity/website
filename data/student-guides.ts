export type StudentGuide = {
  slug: string
  title: string
  description: string
  category: string
  tags: string[]
}

export const studentGuides: StudentGuide[] = [
  {
    slug: 'github-actions',
    title: 'The Complete GitHub Actions Guide',
    description:
      'A full CI/CD and repository-automation course taught at three levels. Pick Beginner, Mid-level, or Senior, then read the detailed explanation, a fast interview review, or the practical tips and traps.',
    category: 'CI/CD & Automation',
    tags: ['GitHub Actions', 'CI/CD', 'DevOps', 'Automation', 'Interview prep'],
  },
  {
    slug: 'docker',
    title: 'The Complete Docker Guide',
    description:
      'Build a practical Docker foundation across 26 sections, then move into Compose, networking, security, debugging, optimization, ML images, CI/CD delivery, and production-ready container workflows.',
    category: 'Containers & DevOps',
    tags: ['Docker', 'Containers', 'Docker Compose', 'DevOps', 'CI/CD'],
  },
]

export function getStudentGuide(slug: string) {
  return studentGuides.find((guide) => guide.slug === slug)
}
