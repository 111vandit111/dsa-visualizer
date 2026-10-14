"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { listQuestions } from "@/lib/api/client";
import { fadeUp, staggerChildren } from "@/lib/motion";
import type { QuestionListResult } from "@/lib/types/question";
import { cn } from "@/lib/utils";
import { PaginationControls } from "./pagination-controls";
import { QuestionCard } from "./question-card";
import { QuestionFilterBar } from "./question-filter-bar";
import { QuestionGridSkeleton } from "./question-grid-skeleton";
import { hasActiveFilters, useQuestionFilters } from "./use-question-filters";

const PAGE_SIZE = 12;

interface ResultsProps {
  result: QuestionListResult;
  isStale: boolean;
  isFiltered: boolean;
  onClear: () => void;
}

function Results({ result, isStale, isFiltered, onClear }: ResultsProps) {
  if (result.items.length === 0) {
    return (
      <div data-testid="list-empty">
        {isFiltered ? (
          <EmptyState
            icon={<SearchXIcon />}
            title="No questions match"
            description="Try a different search, or remove some filters."
            action={
              <Button variant="outline" onClick={onClear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState title="No questions yet" description="Questions added by the admin will show up here." />
        )}
      </div>
    );
  }

  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={staggerChildren}
      aria-busy={isStale}
      className={cn(
        "relative grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
        isStale && "opacity-60",
      )}
    >
      <AnimatePresence mode="popLayout">
        {result.items.map((question) => (
          <motion.li
            key={question.slug}
            layout
            className="min-w-0"
            variants={fadeUp}
            exit={{ opacity: 0 }}
          >
            <QuestionCard question={question} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

export function QuestionBrowser() {
  const { filters, searchText, setSearchText, update, toggleTag, clear } = useQuestionFilters();
  const tagsKey = filters.tags.join(",");
  const { data, error, isLoading, reload } = useAsync(
    (signal) =>
      listQuestions(
        {
          q: filters.q || undefined,
          difficulty: filters.difficulty,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          page: filters.page,
          pageSize: PAGE_SIZE,
        },
        { signal },
      ),
    [filters.q, filters.difficulty, tagsKey, filters.page],
  );

  const tagOptions = [...(data?.facets.tags ?? [])];
  for (const tag of filters.tags) {
    if (!tagOptions.some((option) => option.tag === tag)) tagOptions.push({ tag, count: 0 });
  }

  return (
    <div className="space-y-6">
      <QuestionFilterBar
        searchText={searchText}
        onSearchTextChange={setSearchText}
        difficulty={filters.difficulty}
        onDifficultyChange={(difficulty) => update({ difficulty })}
        tagOptions={tagOptions}
        activeTags={filters.tags}
        onToggleTag={toggleTag}
      />
      {error ? (
        <div data-testid="list-error">
          <ErrorState title="Could not load questions" message={error.message} onRetry={reload} />
        </div>
      ) : data ? (
        <>
          <Results
            result={data}
            isStale={isLoading}
            isFiltered={hasActiveFilters(filters) || filters.page > 1}
            onClear={clear}
          />
          <PaginationControls
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPageChange={(page) => update({ page })}
          />
        </>
      ) : (
        <QuestionGridSkeleton />
      )}
    </div>
  );
}
