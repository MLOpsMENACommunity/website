import Link from 'next/link'
import {
  Compass, FlaskConical, Briefcase, UsersRound, GraduationCap, Blocks, Building2,
  Brain, Workflow, GitBranch, Server, MonitorSmartphone, Bug, Cloud,
  Check, Mail, ArrowUpRight, ArrowRight, MessageCircle, Gift, Handshake,
} from 'lucide-react'
import Reveal from '@/components/Reveal'
import HexField from '@/components/HexField'
import JoinCTA from '@/components/JoinCTA'
import {
  communityServices, companyServices, trainingTracks, disciplines, engagementSteps,
} from '~/data/services'
import { founder } from '~/data/team'
import { contacts, channels, roleAddresses } from '~/site.config'
import { t, localeHref, type Lang } from '@/lib/i18n'
import { tService, tTrack, tDiscipline, tStep, tMember } from '@/lib/content-i18n'

const icons = {
  Compass, FlaskConical, Briefcase, UsersRound, GraduationCap, Blocks, Building2,
  Brain, Workflow, GitBranch, Server, MonitorSmartphone, Bug, Cloud,
} as const

/**
 * `violet` has no numbered shades in the Tailwind config — it is a single
 * channel variable — which is why it alone is written without the `-400`.
 */
const accents = {
  cyan: { text: 'text-cyan-400', border: 'border-cyan-400/35', bg: 'bg-cyan-400/10', hover: 'hover:border-cyan-400/50' },
  amber: { text: 'text-amber-400', border: 'border-amber-400/35', bg: 'bg-amber-400/10', hover: 'hover:border-amber-400/50' },
  violet: { text: 'text-violet', border: 'border-violet/35', bg: 'bg-violet/10', hover: 'hover:border-violet/50' },
  teal: { text: 'text-teal-400', border: 'border-teal-400/35', bg: 'bg-teal-400/10', hover: 'hover:border-teal-400/50' },
} as const

/**
 * Role addresses stay owned by site.config — a card names the role it wants
 * ('services', 'trainings') and the address is looked up, so repointing one in
 * Cloudflare never means editing this file. Falls back to the community inbox
 * if a role is ever removed, which is the safe direction to fail.
 */
function roleEmail(role: string): string {
  return roleAddresses.find((r) => r.address.startsWith(`${role}@`))?.address ?? contacts.email
}

export default function ServicesView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.servicesPage
  const href = (p: string) => localeHref(lang, p)

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
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#companies" className="btn-primary">
              {c.jumpCompanies} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </a>
            <a href="#community" className="btn-ghost">
              <Gift className="h-4 w-4" /> {c.jumpCommunity}
            </a>
          </div>
        </div>
      </section>

      {/* ---------- Free for the community ---------- */}
      <section id="community" className="scroll-mt-24 mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <span className="eyebrow">{c.communityEyebrow}</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              {c.communityTitleBefore} <span className="brand-text">{c.communityAccent}</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{c.communityLead}</p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {communityServices.map((raw, i) => {
            const o = tService(lang, raw)
            const Icon = icons[raw.icon as keyof typeof icons]
            const a = accents[raw.accent as keyof typeof accents]
            return (
              <Reveal key={raw.id} delay={i * 90}>
                <div className={`card flex h-full flex-col p-7 ${a.border}`}>
                  <span className={`grid h-12 w-12 place-items-center rounded-xl ${a.bg} ${a.text}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-fg">{o.title}</h3>
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

        <Reveal>
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-teal-400/25 bg-teal-400/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm leading-relaxed text-body">{c.communityNote}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.membersRoute}</p>
            </div>
            <a href={channels.whatsapp} target="_blank" rel="noreferrer" className="btn-ghost shrink-0">
              <MessageCircle className="h-4 w-4" /> {c.joinWhatsapp}
            </a>
          </div>
        </Reveal>
      </section>

      {/* ---------- For companies ---------- */}
      <section id="companies" className="scroll-mt-24 border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <span className="eyebrow">{c.companiesEyebrow}</span>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                {c.companiesTitleBefore} <span className="brand-text">{c.companiesAccent}</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">{c.companiesLead}</p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {companyServices.map((raw, i) => {
              const o = tService(lang, raw)
              const Icon = icons[raw.icon as keyof typeof icons]
              const a = accents[raw.accent as keyof typeof accents]
              const to = roleEmail(raw.contact)
              return (
                <Reveal key={raw.id} delay={i * 90}>
                  <div className={`card flex h-full flex-col p-7 ${a.border}`}>
                    <span className={`grid h-12 w-12 place-items-center rounded-xl ${a.bg} ${a.text}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-xl font-bold text-fg">{o.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{o.blurb}</p>
                    <ul className="mt-6 flex-1 space-y-2.5">
                      {o.items.map((it) => (
                        <li key={it} className="flex gap-2.5 text-sm leading-relaxed text-body">
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${a.text}`} />
                          {it}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={`mailto:${to}?subject=${encodeURIComponent(raw.title)}`}
                      className={`group mt-6 flex items-center gap-3 rounded-xl border border-line p-3 transition hover:bg-surface-hover ${a.hover}`}
                    >
                      <Mail className={`h-4 w-4 shrink-0 ${a.text}`} />
                      <span className="flex-1 text-sm font-medium text-body">{c.enquire}</span>
                      <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 text-ghost transition ${a.text.replace('text-', 'group-hover:text-')}`} />
                    </a>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Training tracks ---------- */}
      <section id="tracks" className="scroll-mt-24 mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <span className="eyebrow">{c.tracksEyebrow}</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              {c.tracksTitleBefore} <span className="brand-text">{c.tracksAccent}</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{c.tracksLead}</p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {trainingTracks.map((raw, i) => {
            const track = tTrack(lang, raw)
            return (
              <Reveal key={raw.id} delay={i * 90}>
                <div className="card card-hover flex h-full flex-col p-7">
                  <span className="chip self-start font-mono text-[11px] uppercase tracking-wider">
                    {raw.group}
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-fg">{track.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{track.summary}</p>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-faint">
                    {c.covers}
                  </p>
                  <ul className="mt-3 flex-1 space-y-2.5">
                    {track.topics.map((topic) => (
                      <li key={topic} className="flex gap-2.5 text-sm leading-relaxed text-body">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ---------- The bench ---------- */}
      <section className="border-y border-line bg-alt">
        <div className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <span className="eyebrow">{c.benchEyebrow}</span>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                {c.benchTitleBefore} <span className="brand-text">{c.benchAccent}</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">{c.benchLead}</p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {disciplines.map((raw, i) => {
              const d = tDiscipline(lang, raw)
              const Icon = icons[raw.icon as keyof typeof icons]
              return (
                <Reveal key={raw.id} delay={i * 60}>
                  <div className="card card-hover flex h-full items-center gap-3 p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium leading-snug text-body">{d.label}</span>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- How an engagement starts ---------- */}
      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <span className="eyebrow">{c.howEyebrow}</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              {c.howTitleBefore} <span className="brand-text">{c.howAccent}</span>
            </h2>
          </div>
        </Reveal>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {engagementSteps.map((raw, i) => {
            const step = tStep(lang, raw)
            return (
              <Reveal key={raw.id} delay={i * 80}>
                <li className="card h-full p-6">
                  <span className="font-mono text-sm font-bold text-cyan-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
                </li>
              </Reveal>
            )
          })}
        </ol>
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

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 [&>*]:min-w-0 lg:grid-cols-3">
            <Reveal>
              <div className="card h-full border-cyan-400/25 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-400">
                  <Blocks className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-fg">{c.companyTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.companyDesc}</p>
                <a href={`mailto:${roleEmail('services')}`}
                   className="group mt-5 flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface-hover">
                  <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                  <span dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-body">
                    {roleEmail('services')}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-cyan-400" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={90}>
              <div className="card h-full border-amber-400/25 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400/10 text-amber-400">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-fg">{c.trainingTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.trainingDesc}</p>
                <a href={`mailto:${roleEmail('trainings')}`}
                   className="group mt-5 flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-amber-400/40 hover:bg-surface-hover">
                  <Mail className="h-4 w-4 shrink-0 text-amber-400" />
                  <span dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-body">
                    {roleEmail('trainings')}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-amber-400" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="card h-full border-violet/25 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet/10 text-violet">
                  <Handshake className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-fg">{c.partnershipsTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.partnershipsDesc}</p>
                <p className="mt-4 text-sm font-semibold text-fg">{contacts.founder.name}</p>
                <p className="text-xs text-faint">{tMember(lang, founder).role}</p>
                <div className="mt-4 space-y-2">
                  <a href={`mailto:${roleEmail('partnerships')}`}
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-violet/40 hover:bg-surface-hover">
                    <Mail className="h-4 w-4 shrink-0 text-violet" />
                    <span dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-body">
                      {roleEmail('partnerships')}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-violet" />
                  </a>
                  <a href={`mailto:${contacts.founder.email}`}
                     className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-violet/40 hover:bg-surface-hover">
                    <Mail className="h-4 w-4 shrink-0 text-violet" />
                    <span dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-body">
                      {contacts.founder.email}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ghost transition group-hover:text-violet" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-faint">
              {c.fundingNote}{' '}
              <Link href={href('/team')} className="text-cyan-400 underline-offset-4 hover:underline">
                {copy.footer.meetTeam}
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
