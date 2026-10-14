"use client";

import { useState } from "react";
import Link from "next/link";
import { FilePlusIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationControls } from "@/components/questions/pagination-controls";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsync } from "@/hooks/use-async";
import { listQuestions } from "@/lib/api/client";
import type { QuestionSummary } from "@/lib/types/question";
import { DeleteQuestionDialog } from "./delete-question-dialog";
import { QuestionCardList, QuestionTable } from "./admin-question-rows";
import { useMediaQuery } from "./use-media-query";

const PAGE_SIZE = 10;
const SKELETON_ROWS = 5;
const WIDE_QUERY = "(min-width: 768px)";

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading questions" className="space-y-3">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function AdminQuestionList() {
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<QuestionSummary | null>(null);
  const isWide = useMediaQuery(WIDE_QUERY);
  const { data, error, isLoading, reload } = useAsync(
    (signal) => listQuestions({ page, pageSize: PAGE_SIZE }, { signal }),
    [page],
  );

  const handleDeleted = () => {
    const isLastOnPage = data !== undefined && data.items.length === 1 && page > 1;
    if (isLastOnPage) setPage(page - 1);
    else reload();
  };

  if (error) {
    return (
      <div data-testid="list-error">
        <ErrorState title="Could not load questions" message={error.message} onRetry={reload} />
      </div>
    );
  }
  if (!data) return <ListSkeleton />;

  if (data.total === 0) {
    return (
      <div data-testid="list-empty">
        <EmptyState
          icon={<FilePlusIcon />}
          title="No questions yet"
          description="Create the first question to make it appear on the home page."
          action={
            <Button asChild>
              <Link href="/admin/new">New question</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const Rows = isWide ? QuestionTable : QuestionCardList;
  return (
    <div className={isLoading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={isLoading}>
      <Rows items={data.items} onDelete={setPendingDelete} />
      <PaginationControls
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={setPage}
      />
      <DeleteQuestionDialog
        question={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
