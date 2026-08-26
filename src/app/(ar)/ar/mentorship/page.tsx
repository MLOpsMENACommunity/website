import type { Metadata } from 'next'
import MentorshipView from '@/views/MentorshipView'
import { t } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'

const copy = t('ar').mentorshipPage

export const metadata: Metadata = pageMetadata({
  lang: 'ar',
  path: '/mentorship',
  title: copy.metaTitle,
  description: copy.metaDesc,
})

export default function ArMentorshipPage() {
  return <MentorshipView lang="ar" />
}
