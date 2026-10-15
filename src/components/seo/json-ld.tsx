import { serializeJsonLd, type JsonLd as JsonLdData } from "@/lib/seo/jsonld";

/** Structured data for crawlers; serializeJsonLd escapes "<" so the payload cannot close the script tag. */
export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
