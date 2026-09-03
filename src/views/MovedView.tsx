'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { t, localeHref, type Lang } from '@/lib/i18n'

/**
 * A page that has moved.
 *
 * The site is a static export on GitHub Pages, so there is no server to answer
 * with a 301 — the redirect has to happen in the browser. `replace` rather than
 * `push` so the back button does not bounce the reader straight back here.
 * The visible copy below is the fallback for anyone arriving without JS, and
 * the page itself is marked noindex with a canonical pointing at the target.
 */
export default function MovedView({ lang, to }: { lang: Lang; to: string }) {
  const router = useRouter()
  const copy = t(lang)
  const c = copy.movedPage
  const target = localeHref(lang, to)

  useEffect(() => {
    router.replace(target)
  }, [router, target])

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-content flex-col items-center justify-center px-5 py-24 text-center sm:px-8">
      <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">{c.title}</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{c.lead}</p>
      <Link href={target} className="btn-primary mt-8">
        {c.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
      </Link>
      <p className="mt-4 text-xs text-faint">{c.redirecting}</p>
    </section>
  )
}
