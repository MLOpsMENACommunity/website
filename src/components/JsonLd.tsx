/**
 * Renders a schema.org node as JSON-LD.
 *
 * `</script>` inside a string value would close the tag early, so the one
 * character that can do that is escaped. `undefined` values drop out of
 * JSON.stringify on their own, which is why the builders can leave optional
 * fields unset without emitting nulls.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
