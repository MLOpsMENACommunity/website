import Reveal from '@/components/Reveal'
import HexField from '@/components/HexField'
import { privacySections, policyUpdated, type PolicyBlock } from '~/data/privacy'
import { t, type Lang } from '@/lib/i18n'

/**
 * The privacy policy.
 *
 * Rendered from structured data rather than a markdown blob so the two editions
 * cannot drift apart section by section, and so the retention table stays a real
 * table in both reading directions.
 *
 * Every spacing utility here is logical (`ms-`, `ps-`, `text-start`) because the
 * Arabic edition renders the same component right-to-left.
 */
function Block({ block, lang }: { block: PolicyBlock; lang: Lang }) {
  switch (block.kind) {
    case 'p':
      return <p className="mt-4 leading-relaxed text-body">{block.text}</p>

    case 'ul':
      return (
        <ul className="mt-4 space-y-2 ps-5 text-body marker:text-cyan-400 [list-style:disc]">
          {block.items.map((item) => (
            <li key={item} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )

    case 'note':
      // The commitments people actually care about — that we do not gather data
      // about their interactions. Given a rail so they are not lost in prose.
      return (
        <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
          <div className="flex gap-3">
            <span className="mt-0.5 block w-1 shrink-0 rounded-full brand-gradient" aria-hidden />
            <p className="text-sm leading-relaxed text-body">{block.text}</p>
          </div>
        </div>
      )

    case 'table':
      return (
        <div className="mt-5 overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th
                    key={cell}
                    className="bg-surface-2 px-4 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-fg"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map(([label, value]) => (
                <tr key={label}>
                  <td className="border-t border-line px-4 py-2.5 align-top font-medium text-fg">{label}</td>
                  <td className="border-t border-line px-4 py-2.5 align-top text-body">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

export default function PrivacyView({ lang }: { lang: Lang }) {
  const copy = t(lang)
  const c = copy.privacyPage
  const sections = privacySections[lang]

  const updated = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    // Pinned: without it the server and the browser can disagree across a
    // timezone boundary and React reports a hydration mismatch.
    timeZone: 'UTC',
  }).format(new Date(policyUpdated))

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
          <p className="mt-4 text-sm text-faint">
            {c.updated} {updated}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="max-w-3xl">
            {sections.map((section) => (
              <Reveal key={section.id}>
                <div id={section.id} className="scroll-mt-28 border-t border-line pt-8 first:border-t-0 first:pt-0 [&:not(:first-child)]:mt-10">
                  <h2 className="text-xl font-semibold text-fg">{section.heading}</h2>
                  {section.blocks.map((block, i) => (
                    <Block key={i} block={block} lang={lang} />
                  ))}
                </div>
              </Reveal>
            ))}
          </div>

          {/* Contents. `sticky` sits outside Reveal deliberately: its scroll range
              is its parent's height, and a Reveal wrapper is only as tall as the
              card, which would pin it after a few hundred pixels. */}
          <aside className="hidden lg:block">
            <nav className="sticky top-28 rounded-2xl border border-line bg-surface p-5" aria-label={c.contents}>
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">{c.contents}</p>
              <ul className="mt-3 space-y-2">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block text-sm leading-snug text-muted transition hover:text-cyan-400"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </section>
    </>
  )
}
