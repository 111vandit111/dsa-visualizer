import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { TagChip } from "@/components/shared/tag-chip";
import { Button } from "@/components/ui/button";
import type { Question } from "@/lib/types/question";

/** Back link, title, difficulty and tags. */
export function VisualizerHeader({ question }: { question: Pick<Question, "title" | "difficulty" | "tags"> }) {
  return (
    <header className="min-w-0 space-y-2">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/">
          <ArrowLeftIcon /> Questions
        </Link>
      </Button>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="min-w-0 max-w-full font-display text-3xl tracking-tight [overflow-wrap:anywhere] sm:text-4xl">{question.title}</h1>
        <DifficultyBadge difficulty={question.difficulty} />
      </div>
      {question.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {question.tags.map((tag) => (
            <li key={tag}>
              <TagChip tag={tag} />
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
