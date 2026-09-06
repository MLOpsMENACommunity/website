import Image from 'next/image'
import { ArrowUpRight, Mail, Handshake } from 'lucide-react'
import Reveal from '@/components/Reveal'
import HexField from '@/components/HexField'
import JoinCTA from '@/components/JoinCTA'
import { asset } from '@/lib/asset'
import { t, type Lang } from '@/lib/i18n'
import { tPartner } from '@/lib/content-i18n'
import { partners, contacts } from '~/site.config'

/**
 * Same shape as ServicesView's accents — `teal` included because both
 * logo-carrying partners use it. Kept local: the shared `accentClasses` in
 * roadmaps.ts is keyed to the narrower roadmap accent set.
 */
const accents = {
  cyan: { text: 'text-cyan-400', border: 'border-cyan-400/35', bg: 'bg-cyan-400/10', grad: 'from-cyan-400/20', hover: 'hover:border-cyan-400/50' },
  amber: { text: 'text-amber-400', border: 'border-amber-400/35', bg: 'bg-amber-400/10', grad: 'from-amber-400/20', hover: 'hover:border-amber-400/50' },
  violet: { text: 'text-violet', border: 'border-violet/35', bg: 'bg-violet/10', grad: 'from-violet/20', hover: 'hover:border-violet/50' },
  teal: { text: 'text-teal-400', border: 'border-teal-400/35', bg: 'bg-teal-400/10', grad: 'from-teal-400/20', hover: 'hover:border-teal-400/50' },
} as const

export default function PartnersView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.partnersPage
  const list = partners.map((raw) => ({ raw, p: tPartner(lang, raw) }))

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute end-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {c.titleBefore} <span className="brand-text">{c.accent}</span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">{c.lead}</p>
          <span className="chip mt-7 font-mono text-[11px] uppercase tracking-wider">
            {c.countLabel(list.length)}
          </span>
        </div>
      </section>

      {/* ---------- Partner cards ---------- */}
      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <div className="grid gap-5 [&>*]:min-w-0 md:grid-cols-2 lg:grid-cols-3">
          {list.map(({ raw, p }, i) => {
            const a = accents[raw.accent as keyof typeof accents]
            return (
              <Reveal key={raw.name} delay={i * 90} variant="scale">
                <article className={`card card-hover group relative flex h-full flex-col overflow-hidden p-6 ${a.border}`}>
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${a.grad} to-transparent`} />

                  {/* White plate so both light and dark partner logos read on the
                      dark card. Zomra has no logo file yet — typographic mark. */}
                  <div className="grid h-32 place-items-center rounded-2xl bg-white px-8 shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:shadow-md">
                    {raw.logo ? (
                      <Image
                        src={asset(raw.logo)}
                        alt={p.name}
                        width={240}
                        height={60}
                        className="h-14 w-auto object-contain transition duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="text-3xl font-bold tracking-tight text-[#0b1220] transition duration-300 group-hover:scale-[1.04]">
                        {p.name}
                      </span>
                    )}
                  </div>

                  {p.role && <span className={`chip mt-5 self-start ${a.text} ${a.border}`}>{p.role}</span>}
                  <h2 className="mt-4 text-xl font-bold text-fg">{p.name}</h2>
                  {p.blurb && <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.blurb}</p>}

                  <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                    <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
                    <a
                      href={raw.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${a.text} hover:underline`}
                    >
                      {c.visit} <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- Become a partner ---------- */}
      <section className="border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <Reveal variant="scale">
            <div className="card relative overflow-hidden p-7 sm:p-10">
              <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-teal/15 blur-3xl animate-pulse-glow" />
              <div className="absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-amber/15 blur-3xl animate-pulse-glow" />
              <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-2xl">
                  <span className="chip border-teal-400/30 text-teal-400">
                    <Handshake className="h-3 w-3" /> {c.eyebrow}
                  </span>
                  <h2 className="mt-5 text-2xl font-bold sm:text-3xl">{c.becomeTitle}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{c.becomeLead}</p>
                </div>
                <a
                  href={`mailto:${contacts.founder.email}?subject=${encodeURIComponent('Partnership with MLOps MENA')}`}
                  className="btn-primary shrink-0"
                >
                  <Mail className="h-4 w-4" /> {c.becomeCta}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 pb-16 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
