import { Suspense } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { HomeHero } from "@/components/questions/home-hero";
import { QuestionBrowser } from "@/components/questions/question-browser";
import { QuestionGridSkeleton } from "@/components/questions/question-grid-skeleton";

export default function Home() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <HomeHero />
      <section aria-label="Questions">
        <Suspense fallback={<QuestionGridSkeleton />}>
          <QuestionBrowser />
        </Suspense>
      </section>
    </PageContainer>
  );
}
