import { executeRun } from "@/lib/tracer/execute";
import type { QuestionInput } from "@/lib/types/question";
import { parseQuestionInput } from "@/lib/validation/question.server";

/** Validates a sample and runs every case through the tracer; throws with the slug and the failing case. */
export function checkSample(input: QuestionInput): QuestionInput {
  const parsed = parseQuestionInput(input);
  if (!parsed.ok) {
    const details = parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`${input.slug}: invalid sample: ${details}`);
  }
  const report = executeRun({ code: parsed.value.solutionCode, testCases: parsed.value.testCases, traceCaseIndex: null });
  if (report.compileError) throw new Error(`${input.slug}: compile error: ${report.compileError.message}`);
  report.cases.forEach((result) => {
    if (result.isPassed) return;
    const detail = result.error?.message ?? JSON.stringify(result.ops.map((op) => ({ expected: op.expected, actual: op.actual })));
    throw new Error(`${input.slug}: case ${result.index} failed: ${detail}`);
  });
  return parsed.value;
}
