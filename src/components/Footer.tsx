import Link from 'next/link'
import type { ComponentType } from 'react'
import { Youtube, Linkedin, MessageCircle, Mail, Github, Sparkles } from 'lucide-react'
import Logo from './Logo'
import XIcon from './XIcon'
import { site, channels, contacts, brainsmingle } from '~/site.config'
import { t, localeHref, type Lang } from '@/lib/i18n'

/** Annotated so a hand-drawn icon and a lucide one can sit in the same array. */
const social: { href: string; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { href: channels.whatsapp, label: 'WhatsApp community', Icon: MessageCircle },
  { href: channels.linkedin, label: 'LinkedIn', Icon: Linkedin },
  { href: channels.x, label: 'X', Icon: XIcon },
  { href: channels.youtube, label: 'YouTube', Icon: Youtube },
  { href: channels.github, label: 'GitHub', Icon: Github },
  { href: `mailto:${contacts.email}`, label: 'Email', Icon: Mail },
]

export default function Footer({ lang = 'en' }: { lang?: Lang }) {
  const copy = t(lang)
  const description = lang === 'ar' ? copy.home.hero.lead : site.description

  const learn = [
    { label: copy.nav.items.roadmaps, href: '/roadmaps' },
    { label: copy.nav.items.courses, href: '/courses' },
    { label: copy.footer.practitioner, href: '/courses/mlops-practitioner' },
    { label: copy.nav.items.sessions, href: '/sessions' },
    { label: copy.nav.items.articles, href: '/articles' },
  ]

  const about = [
    { label: copy.footer.meetTeam, href: '/team' },
    { label: copy.footer.mentorship, href: '/mentorship' },
    { label: copy.nav.items.faq, href: '/faq' },
    { label: copy.common.contactUs, href: '/#contact' },
    // Reachable from every page: LinkedIn, Google and Meta all check that the
    // policy URL in an OAuth application actually resolves and is findable.
    { label: copy.privacyPage.metaTitle, href: '/privacy-policy' },
  ]

  return (
    <footer className="mt-24 border-t border-line bg-alt">
      <div className="mx-auto max-w-content px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Logo lang={lang} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {social.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
                   className="rounded-lg border border-line p-2.5 text-muted transition hover:border-cyan-400/40 hover:text-cyan-400">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">
              {copy.footer.learn}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {learn.map((i) => (
                <li key={i.href}>
                  <Link href={localeHref(lang, i.href)} className="text-muted transition hover:text-cyan-400">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">
              {copy.footer.community}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {about.map((i) => (
                <li key={i.href}>
                  <Link href={localeHref(lang, i.href)} className="text-muted transition hover:text-cyan-400">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">
              {copy.footer.whereWeAre}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href={channels.whatsapp} target="_blank" rel="noreferrer" className="text-muted transition hover:text-cyan-400">WhatsApp</a></li>
              <li><a href={channels.discord} target="_blank" rel="noreferrer" className="text-muted transition hover:text-cyan-400">Discord</a></li>
              <li><a href={channels.linkedin} target="_blank" rel="noreferrer" className="text-muted transition hover:text-cyan-400">LinkedIn</a></li>
              <li><a href={channels.x} target="_blank" rel="noreferrer" className="text-muted transition hover:text-cyan-400">X</a></li>
              <li><a href={channels.youtube} target="_blank" rel="noreferrer" className="text-muted transition hover:text-cyan-400">YouTube</a></li>
              <li><a href={channels.github} target="_blank" rel="noreferrer" className="text-muted transition hover:text-cyan-400">GitHub</a></li>
              <li><a href={channels.zomra} target="_blank" rel="noreferrer" className="text-muted transition hover:text-cyan-400">Zomra</a></li>
            </ul>

            <a href={brainsmingle.href} target="_blank" rel="noreferrer"
               className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3 transition hover:border-amber-400/50">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-xs leading-relaxed text-body">
                <span className="block font-semibold text-fg">{copy.footer.brainsmingleTitle}</span>
                {lang === 'ar' ? 'انضم مجانًا هذا الأسبوع بالكود' : brainsmingle.note}{' '}
                <span className="font-mono font-semibold text-amber-400">{brainsmingle.code}</span>
              </span>
            </a>
          </div>
        </div>

        <div className="rule my-10" />
        <div className="flex flex-col gap-3 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. {copy.footer.rights}</p>
          <p>{copy.footer.builtBy}</p>
        </div>
      </div>
    </footer>
  )
}
