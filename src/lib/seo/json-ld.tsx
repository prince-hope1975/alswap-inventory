/**
 * Single place that serializes JSON-LD. Escaping `<` is what stops a
 * `</script>` inside product/article text from breaking out of the tag —
 * the solar page's hand-rolled JSON-LD skipped this before this module
 * existed.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
