import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QuestionPageBody } from "@/components/visualizer/question-page-body";
import { VisualizerSkeleton } from "@/components/visualizer/visualizer-skeleton";
import { lookupQuestion } from "@/lib/seo/data";
import { plainTextSummary } from "@/lib/seo/text";
import { questionPath, SITE_NAME } from "@/lib/seo/site";
import { KIND_LABELS, type Question } from "@/lib/types/question";

const DESCRIPTION_LENGTH = 155;
const DSA_KEYWORDS = ["algorithm visualization", "data structures and algorithms", "step by step debugger", "JavaScript"];

function describe(question: Question): string {
  const summary = plainTextSummary(question.description, DESCRIPTION_LENGTH);
  if (summary) return summary;
  const noun = KIND_LABELS[question.kind].singular.toLowerCase();
  return `Step-by-step visualization of the ${question.title} ${noun}: watch every variable, pointer and data structure change as the solution runs.`;
}

function keywordsFor(question: Question): string[] {
  const keywords = [
    ...question.tags,
    question.title,
    `${question.title} visualization`,
    `${question.title} solution`,
    ...DSA_KEYWORDS,
  ];
  return [...new Set(keywords)];
}

export async function generateMetadata(props: PageProps<"/q/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const lookup = await lookupQuestion(slug);
  if (lookup.status === "missing") notFound();
  if (lookup.status === "unavailable") {
    return { title: "Step-by-step visualization", robots: { index: false, follow: false } };
  }

  const { question } = lookup;
  const path = questionPath(question.slug);
  const title = `${question.title} — step-by-step visualization`;
  const description = describe(question);
  return {
    title,
    description,
    keywords: keywordsFor(question),
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: SITE_NAME,
      title,
      description,
      locale: "en_US",
      publishedTime: question.createdAt,
      modifiedTime: question.updatedAt,
      tags: question.tags,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function Page(props: PageProps<"/q/[slug]">) {
  return (
    <Suspense fallback={<VisualizerSkeleton />}>
      <QuestionPageBody params={props.params} />
    </Suspense>
  );
}
