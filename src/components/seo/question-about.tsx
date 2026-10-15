import { MarkdownView } from "@/components/shared/markdown-view";
import { PageContainer } from "@/components/shared/page-container";
import { KIND_LABELS, type Question } from "@/lib/types/question";

const HEADING_ID = "seo-about-heading";
const FENCE = /^\s{0,3}(```|~~~)/;
const HEADING = /^(\s{0,3})(#{1,5})(\s)/;

// The page already has its h1 and this section has an h2, so description headings move one level down.
function demoteHeadings(markdown: string): string {
  let fence: string | null = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = FENCE.exec(line)?.[1];
      if (marker) fence = fence === null ? marker : fence === marker ? null : fence;
      return fence === null ? line.replace(HEADING, "$1#$2$3") : line;
    })
    .join("\n");
}

/** Server-rendered description, facts and solution, so crawlers read them without running the player. */
export function QuestionAbout({ question }: { question: Question }) {
  const facts = [`${question.difficulty} difficulty`, KIND_LABELS[question.kind].singular];
  if (question.tags.length > 0) facts.push(`Topics: ${question.tags.join(", ")}`);

  return (
    <PageContainer isWide className="pb-12 pt-2">
      <section data-testid="seo-about" aria-labelledby={HEADING_ID} className="border-t border-border py-10">
        <h2 id={HEADING_ID} className="font-display text-2xl tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
          About {question.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{facts.join(" · ")}</p>
        <MarkdownView markdown={demoteHeadings(question.description)} className="mt-4 max-w-3xl" />
        <details className="mt-6">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
            Solution code
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-muted p-3 font-mono text-[13px]">
            <code>{question.solutionCode}</code>
          </pre>
        </details>
      </section>
    </PageContainer>
  );
}
