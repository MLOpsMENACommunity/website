import {
  Compass, Building2, Briefcase, Check, Mail, Linkedin, ArrowUpRight, MessageCircle,
} from 'lucide-react'
import Reveal from '@/components/Reveal'
import HexField from '@/components/HexField'
import JoinCTA from '@/components/JoinCTA'
import { offerings } from '~/data/offerings'
import { founder } from '~/data/team'
import { contacts, channels } from '~/site.config'
import { t, type Lang } from '@/lib/i18n'
import { tOffering, tMember } from '@/lib/content-i18n'

const icons = { Compass, Building2, Briefcase } as const
const accents = {
  cyan: { text: 'text-cyan-400', border: 'border-cyan-400/35', bg: 'bg-cyan-400/10' },
  amber: { text: 'text-amber-400', border: 'border-amber-400/35', bg: 'bg-amber-400/10' },
  violet: { text: 'text-violet', border: 'border-violet/35', bg: 'bg-violet/10' },
} as const

export default function MentorshipView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.mentorshipPage

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute end-6 top-16 hidden h-56 w-80 text-hex lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            {c.titleBefore} <span className="brand-text">{c.accent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{c.lead}</p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {offerings.map((raw, i) => {
            const o = tOffering(lang, raw)
            const Icon = icons[raw.icon as keyof typeof icons]
            const a = accents[raw.accent as keyof typeof accents]
            return (
              <Reveal key={raw.id} delay={i * 90}>
                <div className={`card flex h-full flex-col p-7 ${a.border}`}>
                  <span className={`grid h-12 w-12 place-items-center rounded-xl ${a.bg} ${a.text}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-fg">{o.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{o.blurb}</p>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {o.items.map((it) => (
                      <li key={it} className="flex gap-2.5 text-sm leading-relaxed text-body">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${a.text}`} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section id="contact" className="scroll-mt-24 border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow justify-center">{c.getInTouch}</span>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                {c.contactTitleBefore} <span className="brand-text">{c.contactAccent}</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">{c.contactLead}</p>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 [&>*]:min-w-0 md:grid-cols-2">
            <Reveal>
              <div className="card h-full p-6">
                <h3 className="text-base font-semibold text-fg">{c.generalTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.generalDesc}</p>
                <div className="mt-5 space-y-2">
                  <a href={`mailto:${contacts.email}`}
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface-hover">
                    <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-body">{contacts.email}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-cyan-400" />
                  </a>
                  <a href={channels.whatsapp} target="_blank" rel="noreferrer"
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface-hover">
                    <MessageCircle className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="flex-1 text-sm text-body">{c.whatsappCommunity}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-cyan-400" />
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div className="card h-full border-amber-400/25 p-6">
                <h3 className="text-base font-semibold text-fg">{c.partnershipsTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.partnershipsDesc}</p>
                <p className="mt-4 text-sm font-semibold text-fg">{contacts.founder.name}</p>
                <p className="text-xs text-faint">{tMember(lang, founder).role}</p>
                <div className="mt-4 space-y-2">
                  <a href={`mailto:${contacts.founder.email}`}
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-amber-400/40 hover:bg-surface-hover">
                    <Mail className="h-4 w-4 shrink-0 text-amber-400" />
                    <span dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-body">
                      {contacts.founder.email}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-amber-400" />
                  </a>
                  <a href={contacts.founder.linkedin} target="_blank" rel="noreferrer"
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-amber-400/40 hover:bg-surface-hover">
                    <Linkedin className="h-4 w-4 shrink-0 text-amber-400" />
                    <span dir="ltr" className="flex-1 text-start text-sm text-body">linkedin.com/in/ayanasser</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-amber-400" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
