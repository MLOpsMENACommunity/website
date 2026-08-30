import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BookOpen, PlayCircle } from 'lucide-react'
import HexField from './HexField'
import { channels, primaryChannel } from '~/site.config'
import { t, localeHref, type Lang } from '@/lib/i18n'

/** Staggered entrance: each block starts `step` later than the one above it. */
const step = (n: number) => ({ '--enter-delay': `${n * 110}ms` }) as React.CSSProperties

export default function Hero({ lang = 'en' }: { lang?: Lang }) {
  const copy = t(lang).home.hero

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-teal/10 blur-[110px] animate-float-slow" />
      <div className="pointer-events-none absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full bg-amber/10 blur-[110px] animate-float-slow [animation-delay:6s]" />
      <HexField className="pointer-events-none absolute -left-10 top-24 hidden h-64 w-96 text-hex lg:block" />
      <HexField className="pointer-events-none absolute -right-10 top-40 hidden h-64 w-96 text-hex lg:block" />

      <div className="relative mx-auto max-w-content px-5 pb-16 pt-20 text-center sm:px-8 sm:pt-28">
        <span className="eyebrow enter" style={step(0)}>{copy.eyebrow}</span>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
          <span className="block enter" style={step(1)}>{copy.titleLine1}</span>
          <span
            className="mt-2 block brand-text brand-text-animated text-shadow-glow enter"
            style={step(2)}
          >
            {copy.titleLine2}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted enter" style={step(3)}>
          {copy.lead}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3 enter" style={step(4)}>
          <a href={channels[primaryChannel]} target="_blank" rel="noreferrer" className="btn-primary">
            {t(lang).nav.join}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </a>
          <Link href={localeHref(lang, '/roadmaps')} className="btn-ghost group">
            {copy.exploreRoadmaps}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
          <Link href={localeHref(lang, '/student-guides')} className="btn-ghost group">
            <BookOpen className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            {copy.exploreGuides}
          </Link>
          <a href={channels.youtube} target="_blank" rel="noreferrer"
             className="btn group text-sm font-semibold text-muted transition hover:text-fg">
            <PlayCircle className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            {copy.watchPast}
          </a>
        </div>
      </div>
    </section>
  )
}
