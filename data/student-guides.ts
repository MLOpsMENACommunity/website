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
      'Learn CI/CD and repository automation from the fundamentals through reusable workflows, Docker builds, deployment approvals, and complete examples.',
    category: 'CI/CD & Automation',
    tags: ['GitHub Actions', 'CI/CD', 'DevOps'],
  },
]

export function getStudentGuide(slug: string) {
  return studentGuides.find((guide) => guide.slug === slug)
}
