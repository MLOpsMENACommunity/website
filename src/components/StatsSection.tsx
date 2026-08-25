import { ArrowUpRight } from 'lucide-react'
import Counter from './Counter'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import { getStats } from '@/lib/stats'
import { t, type Lang } from '@/lib/i18n'
import { tStatLabel } from '@/lib/content-i18n'

/** "Our community in numbers" — the counters that used to sit inside the hero. */
export default function StatsSection({ lang = 'en' }: { lang?: Lang }) {
  const c = t(lang).home.numbers
  const stats = getStats()

  return (
    <section className="border-b border-line bg-alt">
      <div className="mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-20">
        <Reveal variant="blur">
          <SectionHeading eyebrow={c.eyebrow} title={c.title} accent={c.accent} align="center">
            {c.lead}
          </SectionHeading>
        </Reveal>

        <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <Reveal key={s.id} delay={i * 70} variant="scale">
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="card card-hover group flex h-full flex-col items-center justify-center p-5 text-center"
              >
                <dt className="sr-only">{tStatLabel(lang, s.id)}</dt>
                <dd className="text-3xl font-bold brand-text transition-transform duration-300 group-hover:scale-110 sm:text-4xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </dd>
                <p className="mt-2 text-[11px] font-medium uppercase leading-tight tracking-[0.08em] text-faint">
                  {tStatLabel(lang, s.id)}
                </p>
                <ArrowUpRight className="mt-2 h-3.5 w-3.5 text-ghost transition duration-300 group-hover:-translate-y-0.5 group-hover:text-cyan-400" />
              </a>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}
