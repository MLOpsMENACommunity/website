import { FileText, Github, Youtube, ArrowUpRight, Mail } from 'lucide-react'
import Reveal from '@/components/Reveal'
import FaqAccordion from '@/components/FaqAccordion'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { faqs, sessionMaterial } from '~/data/faq'
import { contacts, channels } from '~/site.config'
import { t, type Lang } from '@/lib/i18n'
import { tFaq } from '@/lib/content-i18n'

export default function FaqView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.faqPage
  const courseFaqs = faqs.filter((f) => f.scope === 'course').map((f) => tFaq(lang, f))
  const generalFaqs = faqs.filter((f) => f.scope === 'general').map((f) => tFaq(lang, f))

  const material = [
    { href: sessionMaterial.slides, label: c.slides, Icon: FileText },
    { href: sessionMaterial.repo, label: c.repo, Icon: Github },
    { href: channels.youtube, label: c.recordings, Icon: Youtube },
  ]

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
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
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-12">
            <Reveal>
              <div>
                <span className="eyebrow">{c.aboutCourse}</span>
                <div className="mt-6"><FaqAccordion items={courseFaqs} /></div>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <span className="eyebrow">{c.aboutCommunity}</span>
                <div className="mt-6"><FaqAccordion items={generalFaqs} /></div>
              </div>
            </Reveal>
          </div>

          {/* Session 1 material */}
          {/* `sticky` has to sit OUTSIDE Reveal: its scroll range is its parent's
              height, and a Reveal wrapper is only as tall as the card itself. */}
          <aside>
            <div className="sticky top-24">
            <Reveal delay={80}>
              <div className="card p-6">
                <h2 className="text-base font-semibold text-fg">{c.materialTitle}</h2>
                <p className="mt-2 text-xs leading-relaxed text-faint">{c.materialLead}</p>
                <div className="mt-5 space-y-2">
                  {material.map(({ href, label, Icon }) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer"
                       className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-cyan-400/40 hover:bg-surface-hover">
                      <Icon className="h-4 w-4 shrink-0 text-cyan-400" />
                      <span className="flex-1 text-sm text-body">{label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-ghost transition group-hover:text-cyan-400" />
                    </a>
                  ))}
                </div>

                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-sm font-semibold text-fg">{c.notAnswered}</p>
                  <a href={`mailto:${contacts.email}`}
                     className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline">
                    <Mail className="h-4 w-4" /> {c.sendIt}
                  </a>
                </div>
              </div>
            </Reveal>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA lang={lang} /></Reveal>
      </section>
    </>
  )
}
