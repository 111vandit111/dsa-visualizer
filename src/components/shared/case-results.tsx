import { CheckCircle2Icon, CircleDashedIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { CaseResult, JsonValue, OpResult, RunError, RunReport, TestCase } from "@/lib/tracer/types";
import { cn } from "@/lib/utils";

interface CaseResultsProps {
  testCases: TestCase[];
  report: RunReport | null;
  isRunning?: boolean;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

const MAX_VALUE_CHARS = 120;

function formatValue(value: JsonValue): string {
  const text = JSON.stringify(value) ?? "undefined";
  return text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS)}…` : text;
}

function describeError(error: RunError): string {
  return error.line === null ? error.message : `${error.message} (line ${error.line})`;
}

function StatusIcon({ result, isRunning }: { result: CaseResult | undefined; isRunning: boolean }) {
  if (isRunning) return <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Running" />;
  if (!result) return <CircleDashedIcon className="size-4 text-muted-foreground" aria-label="Not run" />;
  return result.isPassed ? (
    <CheckCircle2Icon className="size-4 text-success" aria-label="Passed" />
  ) : (
    <XCircleIcon className="size-4 text-destructive" aria-label="Failed" />
  );
}

function OpList({ ops }: { ops: OpResult[] }) {
  return (
    <ul className="mt-2 space-y-1 border-l border-border pl-3 font-mono text-xs">
      {ops.map((op) => (
        <li key={op.index} className="break-words">
          <span className={op.isPassed ? "text-success" : "text-destructive"}>
            {op.isPassed ? "pass" : "fail"}
          </span>{" "}
          <span>{op.name}({op.args.map(formatValue).join(", ")})</span>
          {op.isPassed ? null : (
            <span className="block text-muted-foreground">
              expected {formatValue(op.expected)}, got {formatValue(op.actual)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

interface CaseRowProps {
  index: number;
  result: CaseResult | undefined;
  isRunning: boolean;
  isSelected: boolean;
  onSelect?: (index: number) => void;
}

function CaseRow({ index, result, isRunning, isSelected, onSelect }: CaseRowProps) {
  const shouldShowDetails = result !== undefined && (!result.isPassed || isSelected);
  const rowClass = cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm max-sm:min-h-11",
    isSelected && "bg-accent",
  );
  const content = (
    <>
      <StatusIcon result={result} isRunning={isRunning} />
      <span className="font-medium">Case {index + 1}</span>
      {result ? (
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {result.stepCount} steps · {Math.round(result.durationMs)} ms
        </span>
      ) : null}
    </>
  );

  return (
    <li data-testid={`case-row-${index}`} className="rounded-lg border border-border bg-card/60">
      {onSelect ? (
        <button
          type="button"
          data-testid={`case-select-${index}`}
          aria-pressed={isSelected}
          onClick={() => onSelect(index)}
          className={cn(rowClass, "cursor-pointer outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50")}
        >
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
      {shouldShowDetails && result ? (
        <div className="px-3 pb-3">
          {result.error ? (
            <p className="font-mono text-xs break-words text-destructive">{describeError(result.error)}</p>
          ) : null}
          <OpList ops={result.ops} />
        </div>
      ) : null}
    </li>
  );
}

function CompileError({ error }: { error: RunError }) {
  return (
    <Alert variant="destructive" data-testid="compile-error">
      <XCircleIcon />
      <AlertTitle>{error.kind === "syntax" ? "Syntax error" : "Could not run"}</AlertTitle>
      <AlertDescription className="font-mono break-words">{describeError(error)}</AlertDescription>
    </Alert>
  );
}

export function CaseResults({ testCases, report, isRunning = false, selectedIndex, onSelect }: CaseResultsProps) {
  if (report?.compileError) return <CompileError error={report.compileError} />;
  if (isRunning && !report) return <Skeleton className="h-24 w-full rounded-lg" />;

  const passedCount = report ? report.cases.filter((result) => result.isPassed).length : 0;
  const hasEmptyCases = testCases.length === 0;

  return (
    <div className="space-y-3" aria-busy={isRunning}>
      <p data-testid="results-summary" className="micro-label" aria-live="polite">
        {report ? `${passedCount}/${testCases.length} passed` : `${testCases.length} cases · not run yet`}
      </p>
      {hasEmptyCases ? (
        <p className="text-sm text-muted-foreground">No test cases.</p>
      ) : (
        <ul className="space-y-2">
          {testCases.map((_, index) => (
            <CaseRow
              key={index}
              index={index}
              result={report?.cases[index]}
              isRunning={isRunning}
              isSelected={selectedIndex === index}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
