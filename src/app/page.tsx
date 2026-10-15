import type { Metadata } from "next";
import { Suspense } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { QuestionIndexLinks } from "@/components/seo/question-index-links";
import { PageContainer } from "@/components/shared/page-container";
import { HomeHero } from "@/components/questions/home-hero";
import { QuestionBrowser } from "@/components/questions/question-browser";
import { QuestionGridSkeleton } from "@/components/questions/question-grid-skeleton";
import { siteJsonLd } from "@/lib/seo/jsonld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo/site";

const TITLE = SITE_TITLE;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
};

export default function Home() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <JsonLd data={siteJsonLd()} />
      <HomeHero />
      <section aria-label="Library">
        <Suspense fallback={<QuestionGridSkeleton />}>
          <QuestionBrowser />
        </Suspense>
      </section>
      <Suspense fallback={null}>
        <QuestionIndexLinks />
      </Suspense>
    </PageContainer>
  );
}
