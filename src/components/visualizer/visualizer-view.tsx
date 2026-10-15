"use client";

import { useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { isDesignCase } from "@/lib/tracer/types";
import type { Question } from "@/lib/types/question";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/lib/viz/use-player";
import { PLAYER_ZONE_PROPS, usePlayerShortcuts } from "@/lib/viz/use-player-shortcuts";
import { CaseTabs } from "./case-tabs";
import { CodePanel } from "./code-panel";
import { OpsTimeline } from "./ops-timeline";
import { PlayerControls } from "./player-controls";
import { RunNotices } from "./run-notices";
import { StepPanels } from "./step-panels";
import { useQuestionRun } from "./use-question-run";
import { VisualizerHeader } from "./visualizer-header";

const COLUMN_GRID =
  "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.3fr)]";
const SIDE_COLUMN_SCROLL = "lg:max-h-[calc(100dvh-15rem)] lg:overflow-y-auto lg:pr-1";

/** The visualizer for one loaded question: runs it in a worker and lays out the player zones. */
export function VisualizerView({ question }: { question: Question }) {
  const [selectedCase, setSelectedCase] = useState(0);
  const caseIndex = Math.min(selectedCase, question.testCases.length - 1);
  const run = useQuestionRun(question, caseIndex);
  const player = usePlayer(run.trace?.steps.length ?? 0, run.trace);
  usePlayerShortcuts(player.controls, run.trace !== null);

  const step = run.trace?.steps[player.stepIndex];
  const frames = step?.frames ?? [];
  const activeFrame = frames[frames.length - 1];
  const caseResult = run.report?.cases[caseIndex];
  const hasOps = isDesignCase(question.testCases[caseIndex]) && caseResult !== undefined && caseResult.ops.length > 0;

  return (
    <div {...PLAYER_ZONE_PROPS}>
      <PageContainer isWide className="pt-6">
        <div className="mb-4">
          <VisualizerHeader question={question} />
        </div>
        <RunNotices report={run.report} caseIndex={caseIndex} trace={run.trace} runFailure={run.failure} onRetry={run.rerun} />
        <div className={cn(COLUMN_GRID, "mb-4")}>
          <div className={cn("order-last min-w-0 lg:order-none", SIDE_COLUMN_SCROLL)}>
            <CaseTabs
              description={question.description}
              testCases={question.testCases}
              report={run.report}
              isRunning={run.isRunning && run.report === null}
              selectedIndex={caseIndex}
              onSelect={setSelectedCase}
            />
          </div>
          <div className="min-w-0 space-y-4">
            <CodePanel
              code={question.solutionCode}
              line={step?.line ?? null}
              callerLines={frames.slice(0, -1).map((frame) => frame.line)}
              stepKind={step?.kind ?? null}
              frameName={activeFrame?.name ?? null}
            />
            {hasOps && caseResult ? (
              <OpsTimeline ops={caseResult.ops} activeOpIndex={step?.opIndex ?? null} stepIndex={player.stepIndex} onSeek={player.controls.seek} />
            ) : null}
          </div>
          <div className={cn("min-w-0", SIDE_COLUMN_SCROLL)}>
            <StepPanels
              trace={run.trace}
              stepIndex={player.stepIndex}
              hints={question.visualHints}
              code={question.solutionCode}
              isRunning={run.isRunning}
            />
          </div>
        </div>
        <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-background/85 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <PlayerControls player={player} isDisabled={run.trace === null} />
        </div>
      </PageContainer>
    </div>
  );
}
