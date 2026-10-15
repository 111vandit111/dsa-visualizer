"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsync } from "@/hooks/use-async";
import { listQuestions } from "@/lib/api/client";
import { fadeUp, staggerChildren } from "@/lib/motion";
import { KIND_LABELS, QUESTION_KINDS, type QuestionKind, type QuestionListResult } from "@/lib/types/question";
import { cn } from "@/lib/utils";
import { PaginationControls } from "./pagination-controls";
import { QuestionCard } from "./question-card";
import { QuestionFilterBar } from "./question-filter-bar";
import { QuestionGridSkeleton } from "./question-grid-skeleton";
import { hasActiveFilters, useQuestionFilters, type QuestionFilters } from "./use-question-filters";

const PAGE_SIZE = 12;

function toKind(value: string): QuestionKind | undefined {
  return QUESTION_KINDS.find((kind) => kind === value);
}

interface ResultsProps {
  result: QuestionListResult;
  kind: QuestionKind;
  isStale: boolean;
  isFiltered: boolean;
  onClear: () => void;
}

function Results({ result, kind, isStale, isFiltered, onClear }: ResultsProps) {
  if (result.items.length === 0) {
    return (
      <div data-testid="list-empty">
        {isFiltered ? (
          <EmptyState
            icon={<SearchXIcon />}
            title={`No ${KIND_LABELS[kind].plural.toLowerCase()} match`}
            description="Try a different search, or remove some filters."
            action={
              <Button variant="outline" onClick={onClear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title={`No ${KIND_LABELS[kind].plural.toLowerCase()} yet`}
            description={`${KIND_LABELS[kind].plural} added by the admin will show up here.`}
          />
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

interface KindTabsProps {
  kind: QuestionKind;
  onKindChange: (kind: QuestionKind) => void;
  children: ReactNode;
}

function KindTabs({ kind, onKindChange, children }: KindTabsProps) {
  return (
    <Tabs
      value={kind}
      onValueChange={(value) => {
        const next = toKind(value);
        if (next && next !== kind) onKindChange(next);
      }}
      className="gap-6"
    >
      <TabsList aria-label="Library">
        {QUESTION_KINDS.map((option) => (
          <TabsTrigger key={option} value={option} data-testid={`kind-tab-${option}`} className="px-4">
            {KIND_LABELS[option].plural}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={kind} className="space-y-6 text-base">
        {children}
      </TabsContent>
    </Tabs>
  );
}

function useQuestionList(filters: QuestionFilters) {
  const tagsKey = filters.tags.join(",");
  return useAsync(
    (signal) =>
      listQuestions(
        {
          q: filters.q || undefined,
          kind: filters.kind,
          difficulty: filters.difficulty,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          page: filters.page,
          pageSize: PAGE_SIZE,
        },
        { signal },
      ),
    [filters.q, filters.kind, filters.difficulty, tagsKey, filters.page],
  );
}

export function QuestionBrowser() {
  const { filters, searchText, setSearchText, update, toggleTag, clear } = useQuestionFilters();
  const { data, error, isLoading, reload } = useQuestionList(filters);
  const tagOptions = [...(data?.facets.tags ?? [])];
  for (const tag of filters.tags) {
    if (!tagOptions.some((option) => option.tag === tag)) tagOptions.push({ tag, count: 0 });
  }

  return (
    <KindTabs kind={filters.kind} onKindChange={(kind) => update({ kind, tags: [] })}>
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
            kind={filters.kind}
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
    </KindTabs>
  );
}
