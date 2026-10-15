import { getSiteUrl } from "@/lib/env";
import type { Difficulty, Question } from "@/lib/types/question";
import { absoluteUrl, questionPath, SEARCH_QUERY_PARAM, SITE_DESCRIPTION, SITE_NAME } from "./site";
import { plainTextSummary } from "./text";

export type JsonLd = Record<string, unknown>;

const PROFICIENCY: Record<Difficulty, string> = { Easy: "Beginner", Medium: "Intermediate", Hard: "Expert" };

// Safe inside <script type="application/ld+json">: no "<" (so no "</script>") and no JS line terminators.
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function siteJsonLd(): JsonLd {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site}/#organization`,
        name: SITE_NAME,
        url: site,
        logo: absoluteUrl("/icon"),
      },
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        name: SITE_NAME,
        url: site,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${site}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${site}/?${SEARCH_QUERY_PARAM}={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function questionJsonLd(question: Question): JsonLd {
  const site = getSiteUrl();
  const url = absoluteUrl(questionPath(question.slug));
  const level = PROFICIENCY[question.difficulty];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["TechArticle", "LearningResource"],
        "@id": `${url}#article`,
        headline: question.title,
        name: question.title,
        description: plainTextSummary(question.description),
        keywords: question.tags.join(", "),
        proficiencyLevel: level,
        educationalLevel: level,
        learningResourceType: "Interactive visualization",
        inLanguage: "en",
        url,
        mainEntityOfPage: url,
        datePublished: question.createdAt,
        dateModified: question.updatedAt,
        isPartOf: { "@id": `${site}/#website` },
        publisher: { "@id": `${site}/#organization` },
        author: { "@id": `${site}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: question.title, item: url },
        ],
      },
    ],
  };
}
