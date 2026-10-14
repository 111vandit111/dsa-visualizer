import { instrument, TracerSyntaxError } from "@/lib/tracer/instrument";
import type { ApiFieldIssue, QuestionInput } from "@/lib/types/question";
import { formatZodIssues, questionInputSchema } from "./question";

export type ParseResult = { ok: true; value: QuestionInput } | { ok: false; issues: ApiFieldIssue[] };

// Runs the tracer's own compile step (strict parse + rejects import()), so anything accepted here can be traced.
function findSyntaxError(code: string): ApiFieldIssue | null {
  try {
    instrument(code);
    return null;
  } catch (error) {
    if (!(error instanceof TracerSyntaxError)) throw error;
    return { path: "solutionCode", message: `Syntax error: ${error.message}` };
  }
}

// Server/script side only (pulls in acorn). User code is parsed, never executed, here.
export function parseQuestionInput(body: unknown): ParseResult {
  const result = questionInputSchema.safeParse(body);
  if (!result.success) return { ok: false, issues: formatZodIssues(result.error) };
  const syntaxIssue = findSyntaxError(result.data.solutionCode);
  if (syntaxIssue) return { ok: false, issues: [syntaxIssue] };
  return { ok: true, value: result.data as QuestionInput };
}
