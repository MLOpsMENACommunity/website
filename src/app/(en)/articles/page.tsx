import type { Metadata } from 'next'
import ArticlesView from '@/views/ArticlesView'
import { t } from '@/lib/i18n'

const copy = t('en').articlesPage

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDesc,
  alternates: { canonical: '/articles/', languages: { en: 'ticles/', ar: '/articles/' } },
}

export default function EnArticlesPage() {
  return <ArticlesView lang="en" />
}
