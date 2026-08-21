import type { Metadata } from 'next'
import { FileText, Github, Youtube, ArrowUpRight, Mail } from 'lucide-react'
import Reveal from '@/components/Reveal'
import FaqAccordion from '@/components/FaqAccordion'
import JoinCTA from '@/components/JoinCTA'
import HexField from '@/components/HexField'
import { faqs, sessionMaterial } from '~/data/faq'
import { contacts, channels } from '~/site.config'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to the questions the community asks most — about the course, recordings, attendance, roadmaps, and getting unstuck. Plus session 1 material.',
}

export default function FaqPage() {
  const courseFaqs = faqs.filter((f) => f.scope === 'course')
  const generalFaqs = faqs.filter((f) => f.scope === 'general')

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal/10 blur-[100px]" />
        <HexField className="pointer-events-none absolute right-6 top-16 hidden h-56 w-80 text-white/[0.055] lg:block" />
        <div className="relative mx-auto max-w-content px-5 py-20 sm:px-8">
          <span className="eyebrow">FAQ</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            The questions we get <span className="brand-text">every week</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Same questions kept arriving in the DMs, so here are the answers in one place.
            If yours is not here, send it to us.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-12">
            <Reveal>
              <div>
                <span className="eyebrow">About the course</span>
                <div className="mt-6"><FaqAccordion items={courseFaqs} /></div>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <span className="eyebrow">About the community</span>
                <div className="mt-6"><FaqAccordion items={generalFaqs} /></div>
              </div>
            </Reveal>
          </div>

          {/* Session 1 material */}
          <aside>
            <Reveal delay={80}>
              <div className="card sticky top-24 p-6">
                <h2 className="text-base font-semibold text-white">Session 1 material</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Free and open. Session 1 stays on YouTube permanently — later sessions come
                  down 48 hours after each one.
                </p>
                <div className="mt-5 space-y-2">
                  <a href={sessionMaterial.slides} target="_blank" rel="noreferrer"
                     className="group flex items-center gap-3 rounded-xl border border-white/10 p-3 transition hover:border-cyan-400/40 hover:bg-white/[0.03]">
                    <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="flex-1 text-sm text-slate-300">Slides</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-cyan-400" />
                  </a>
                  <a href={sessionMaterial.repo} target="_blank" rel="noreferrer"
                     className="group flex items-center gap-3 rounded-xl border border-white/10 p-3 transition hover:border-cyan-400/40 hover:bg-white/[0.03]">
                    <Github className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="flex-1 text-sm text-slate-300">Course repository</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-cyan-400" />
                  </a>
                  <a href={channels.youtube} target="_blank" rel="noreferrer"
                     className="group flex items-center gap-3 rounded-xl border border-white/10 p-3 transition hover:border-cyan-400/40 hover:bg-white/[0.03]">
                    <Youtube className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span className="flex-1 text-sm text-slate-300">Recordings</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-cyan-400" />
                  </a>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-sm font-semibold text-white">Question not answered?</p>
                  <a href={`mailto:${contacts.email}`}
                     className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline">
                    <Mail className="h-4 w-4" /> Send it to us
                  </a>
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 pb-8 sm:px-8">
        <Reveal><JoinCTA /></Reveal>
      </section>
    </>
  )
}
