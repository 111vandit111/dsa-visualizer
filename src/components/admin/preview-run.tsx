"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { CaseResults } from "@/components/shared/case-results";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RunTimeoutError, runInWorker } from "@/lib/tracer/client";
import type { RunReport, TestCase } from "@/lib/tracer/types";
import { parseTestCasesText, type FormErrors } from "./question-form-model";

interface PreviewRunProps {
  solutionCode: string;
  testCasesText: string;
  onInvalid: (errors: FormErrors) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function describeRunFailure(error: unknown): string {
  if (error instanceof RunTimeoutError) return error.message;
  return error instanceof Error ? error.message : "The run failed unexpectedly.";
}

/** Runs the draft solution against the draft test cases in a Web Worker. Nothing is saved. */
export function PreviewRun({ solutionCode, testCasesText, onInvalid }: PreviewRunProps) {
  const [report, setReport] = useState<RunReport | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const handleRun = async () => {
    const parsed = parseTestCasesText(testCasesText);
    if (!parsed.ok || solutionCode.trim() === "") {
      onInvalid({
        ...(parsed.ok ? {} : { testCases: parsed.message }),
        ...(solutionCode.trim() === "" ? { solutionCode: "Write the solution code before running." } : {}),
      });
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsRunning(true);
    setFailure(null);
    setTestCases(parsed.value);
    try {
      const result = await runInWorker(
        { code: solutionCode, testCases: parsed.value, traceCaseIndex: null },
        { signal: controller.signal },
      );
      setReport(result);
    } catch (error) {
      if (isAbortError(error)) return;
      setReport(null);
      setFailure(describeRunFailure(error));
    } finally {
      if (controllerRef.current === controller) setIsRunning(false);
    }
  };

  const hasOutput = isRunning || report !== null || failure !== null;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/60 p-4 sm:p-5" aria-labelledby="preview-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="preview-heading" className="font-display text-lg font-semibold">
            Preview run
          </h2>
          <p className="text-sm text-muted-foreground">
            Runs the code above against the test cases in your browser. Nothing is saved.
          </p>
        </div>
        <Button type="button" variant="outline" data-testid="preview-run" onClick={handleRun}>
          {isRunning ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <PlayIcon data-icon="inline-start" />
          )}
          {isRunning ? "Running..." : "Preview run"}
        </Button>
      </div>
      {hasOutput ? (
        <div data-testid="preview-results" aria-live="polite">
          {failure ? (
            <Alert variant="destructive">
              <AlertTitle>Run failed</AlertTitle>
              <AlertDescription className="break-words">{failure}</AlertDescription>
            </Alert>
          ) : (
            <CaseResults testCases={testCases} report={report} isRunning={isRunning} />
          )}
        </div>
      ) : null}
    </section>
  );
}
