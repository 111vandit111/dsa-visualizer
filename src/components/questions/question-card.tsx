"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { SpotlightCard } from "@/components/shared/spotlight-card";
import { TagChip } from "@/components/shared/tag-chip";
import { spring } from "@/lib/motion";
import type { QuestionSummary } from "@/lib/types/question";

const MAX_VISIBLE_TAGS = 4;
const HOVER_LIFT_PX = -2;

function describeMeta(question: QuestionSummary): string {
  const cases = `${question.caseCount} ${question.caseCount === 1 ? "case" : "cases"}`;
  return question.isDesign ? `design · ${cases}` : cases;
}

export function QuestionCard({ question }: { question: QuestionSummary }) {
  const visibleTags = question.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = question.tags.length - visibleTags.length;

  return (
    <motion.div
      data-testid="question-card"
      whileHover={{ y: HOVER_LIFT_PX }}
      transition={spring.snappy}
      className="h-full min-w-0"
    >
      <Link
        href={`/q/${question.slug}`}
        className="block h-full min-w-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <SpotlightCard as="article" className="h-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="micro-label">{describeMeta(question)}</span>
          </div>
          <h3 className="mt-4 font-display text-lg leading-snug font-semibold [overflow-wrap:anywhere]">
            {question.title}
          </h3>
          {visibleTags.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
              {visibleTags.map((tag) => (
                <li key={tag}>
                  <TagChip tag={tag} />
                </li>
              ))}
              {hiddenTagCount > 0 ? (
                <li className="self-center font-mono text-xs text-muted-foreground">
                  +{hiddenTagCount}
                </li>
              ) : null}
            </ul>
          ) : null}
        </SpotlightCard>
      </Link>
    </motion.div>
  );
}
