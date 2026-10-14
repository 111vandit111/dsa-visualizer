"use client";

import { use } from "react";
import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { ApiError, getQuestion } from "@/lib/api/client";
import { VisualizerSkeleton } from "./visualizer-skeleton";
import { VisualizerView } from "./visualizer-view";

const NOT_FOUND_STATUS = 404;

function NotFoundState() {
  return (
    <PageContainer className="py-16">
      <EmptyState
        icon={<SearchXIcon />}
        title="Question not found"
        description="It may have been renamed or deleted."
        action={
          <Button asChild>
            <Link href="/">Back to questions</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}

/** Loads the question named in the URL, then hands it to the player view. */
export function QuestionVisualizer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const question = useAsync((signal) => getQuestion(slug, { signal }), [slug]);

  if (question.isLoading) return <VisualizerSkeleton />;
  if (question.error) {
    const isMissing = question.error instanceof ApiError && question.error.status === NOT_FOUND_STATUS;
    if (isMissing) return <NotFoundState />;
    return (
      <PageContainer className="py-16">
        <ErrorState title="Could not load this question" message={question.error.message} onRetry={question.reload} />
      </PageContainer>
    );
  }
  if (!question.data) return <VisualizerSkeleton />;
  return <VisualizerView key={question.data.id} question={question.data} />;
}
