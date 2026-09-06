import { Rocket, ExternalLink } from 'lucide-react'
import type { GuideQuickStart as QuickStart } from '@/lib/student-guides.server'

type Labels = {
  quickStart: string
  quickStartLead: string
  quickStartOpen: string
}

/* Drive serves an embeddable, paginated viewer for a public file at `/preview`,
   and its own full-screen page at `/view`. No API key and no bytes served by us:
   the file streams straight from Drive. */
const previewUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/preview`
const viewUrl = (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`

/* A cross-cutting on-ramp rendered above the levelled grid. The PDF lives in a
   public Drive folder and is embedded straight from Drive, so this only mounts
   for topics whose slug is in the synced id map (see `sync-quickstart.mjs`). It
   sits outside the nine-pane structure on purpose: its single heading id is
   `quickstart-<slug>`, pinned into the nav separately, so it never collides with
   a pane heading or touches the pane section counts. */
export default function GuideQuickStart({
  quickStart,
  slug,
  labels,
}: {
  quickStart: QuickStart
  slug: string
  labels: Labels
}) {
  return (
    <section
      className={`guide-quickstart ${slug}-guide-page`}
      aria-labelledby={quickStart.heading.id}
    >
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <div className="guide-quickstart-head">
          <span className="guide-quickstart-badge" aria-hidden="true">
            <Rocket className="h-5 w-5" />
          </span>
          <div className="guide-quickstart-headings">
            {/* The nav links to this id; it is the section's single heading. */}
            <h2 id={quickStart.heading.id}>{labels.quickStart}</h2>
            <p>{labels.quickStartLead}</p>
          </div>
          <a
            className="guide-quickstart-open"
            href={viewUrl(quickStart.fileId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {labels.quickStartOpen}
          </a>
        </div>

        <div className="guide-quickstart-frame">
          {/* Google Drive's own viewer for the public file — it paginates and
              scrolls inside this fixed-height box. */}
          <iframe
            src={previewUrl(quickStart.fileId)}
            title={labels.quickStart}
            className="guide-quickstart-iframe"
            loading="lazy"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
