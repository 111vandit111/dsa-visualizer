import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { QuestionAbout } from "@/components/seo/question-about";
import { lookupQuestion } from "@/lib/seo/data";
import { questionJsonLd } from "@/lib/seo/jsonld";
import { QuestionVisualizer } from "./question-visualizer";
import { VisualizerView } from "./visualizer-view";

/** Server-loaded question page; when the database is down it falls back to the client loader (retry + not-found UI). */
export async function QuestionPageBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lookup = await lookupQuestion(slug);
  if (lookup.status === "missing") notFound();
  if (lookup.status === "unavailable") return <QuestionVisualizer params={params} />;

  const { question } = lookup;
  return (
    <>
      <JsonLd data={questionJsonLd(question)} />
      <VisualizerView key={question.id} question={question} />
      <QuestionAbout question={question} />
    </>
  );
}
