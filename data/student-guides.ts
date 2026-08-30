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
      'Learn CI/CD and repository automation across 28 sections: your first workflow, caching and artifacts, matrices, reusable workflows, OIDC and supply-chain security, container builds, ML pipelines, and complete examples.',
    category: 'CI/CD & Automation',
    tags: ['GitHub Actions', 'CI/CD', 'DevOps', 'Automation', 'Security'],
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
