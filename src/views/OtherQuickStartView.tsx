import Link from 'next/link'
import { ArrowLeft, ExternalLink, FileText, Files } from 'lucide-react'
import { getOtherQuickStarts } from '@/lib/student-guides.server'
import { localeHref, t, type Lang } from '@/lib/i18n'

/* Drive serves an embeddable, paginated viewer for a public file at `/preview`,
   and its own full-screen page at `/view`. No API key and no bytes served by us:
   each file streams straight from Drive. */
const previewUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/preview`
const viewUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`

/* The standalone counterpart to a topic's Quick Start: every PDF in the shared
   Drive folder whose name is not a guide slug. Each is embedded straight from
   Drive and titled from its own file name (see `getOtherQuickStarts`). */
export default function OtherQuickStartView({ lang }: { lang: Lang }) {
  const c = t(lang).studentGuidesPage
  const files = getOtherQuickStarts()

  return (
    <div className="other-guide-page">
      <section className="guide-page-hero other-guide-hero relative overflow-hidden border-b border-line">
        <span className="guide-orbit guide-orbit-one" aria-hidden="true" />
        <span className="guide-orbit guide-orbit-two" aria-hidden="true" />
        {/* Decorative counterpart to the docker hero: a fan of PDF sheets swept
            by a scanning line. Amber to match the card and page accent. */}
        <div className="other-hero-fan" aria-hidden="true">
          <div className="other-doc-fan"><i /><i /><i /><i /></div>
          <i className="other-scan-line" />
        </div>
        <div className="relative mx-auto max-w-content px-5 py-16 sm:px-8 sm:py-24">
          <Link
            href={localeHref(lang, '/student-guides')}
            className="guide-hero-back inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {c.backToGuides}
          </Link>
          <div className="guide-hero-head">
            <span className="guide-hero-logo" aria-hidden="true">
              <Files className="h-8 w-8" />
            </span>
            <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">{c.otherQuickStart}</h1>
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">{c.otherQuickStartLead}</p>
        </div>
      </section>

      {files.length === 0 ? (
        <section className="mx-auto max-w-content px-5 py-16 sm:px-8">
          <div className="card flex min-h-64 flex-col items-center justify-center border-dashed px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber/25 bg-amber/[0.07] text-amber">
              <Files className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-fg">{c.otherQuickStart}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{c.otherQuickStartEmpty}</p>
          </div>
        </section>
      ) : (
        <div className="pb-12">
          {files.map((file) => {
            /* Keyed off the Drive id, not the title — two files can share a title
               but never an id, so the anchor stays unique. */
            const anchorId = `other-${file.fileId}`
            return (
              <section key={file.fileId} className="guide-quickstart" aria-labelledby={anchorId}>
                <div className="mx-auto max-w-content px-5 sm:px-8">
                  <div className="guide-quickstart-head">
                    <span className="guide-quickstart-badge" aria-hidden="true">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="guide-quickstart-headings">
                      <h2 id={anchorId}>{file.title}</h2>
                      {/* File names are almost always Latin, so keep them LTR even
                          on the Arabic edition. */}
                      <p dir="ltr">{file.name}</p>
                    </div>
                    <a
                      className="guide-quickstart-open"
                      href={viewUrl(file.fileId)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                      {c.quickStartOpen}
                    </a>
                  </div>

                  <div className="guide-quickstart-frame">
                    {/* Google Drive's own viewer for the public file — it paginates
                        and scrolls inside this fixed-height box. */}
                    <iframe
                      src={previewUrl(file.fileId)}
                      title={file.title}
                      className="guide-quickstart-iframe"
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
