import Link from 'next/link'
import { Inter } from 'next/font/google'
import { ArrowLeft } from 'lucide-react'
import { t } from '@/lib/i18n'
import { themeScript } from '@/lib/theme'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

/**
 * Global 404, exported to /404.html for GitHub Pages.
 *
 * It sits outside both root layouts on purpose: with two root layouts (one per
 * language edition) Next has no single layout to wrap an unmatched URL in, so
 * this page brings its own font variable and chrome. Kept deliberately small —
 * a visitor here has no page context worth preserving.
 */
export default function NotFound() {
  const en = t('en')
  const ar = t('ar')
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <div className={`${inter.variable} min-h-screen bg-bg font-sans`}>
        <section className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center px-5 text-center sm:px-8">
          <p className="font-mono text-6xl font-bold brand-text">404</p>
          <h1 className="mt-6 text-2xl font-bold">{en.notFound.title}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{en.notFound.lead}</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted" dir="rtl" lang="ar">
            {ar.notFound.lead}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-primary">
              <ArrowLeft className="h-4 w-4" /> {en.notFound.back}
            </Link>
            <Link href="/ar" className="btn-ghost" hrefLang="ar" lang="ar">
              {ar.notFound.back}
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
