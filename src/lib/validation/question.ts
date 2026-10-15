import { z } from "zod";
import { VISUAL_HINT_TYPES, type TestCase } from "@/lib/tracer/types";
import {
  DIFFICULTIES,
  QUESTION_KINDS,
  type ApiFieldIssue,
  type ListParams,
} from "@/lib/types/question";

export const QUESTION_LIMITS = {
  slugMax: 80,
  titleMax: 120,
  tagsMax: 10,
  tagMax: 30,
  descriptionMax: 20_000,
  solutionCodeMax: 50_000,
  testCasesMax: 50,
  nameMax: 100,
  hintsMax: 50,
  hintKeyMax: 100,
  searchMax: 100,
  pageMax: 10_000,
  pageSizeMax: 50,
  pageSizeDefault: 12,
} as const;

export const SLUG_PATTERN =/^[a-z0-9]+(-[a-z0-9]+)*$/;
const TAG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const HINT_KEY_PATTERN = /^(this\.)?[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;

const jsonValueSchema = z.json();
const nameSchema = z.string().min(1).max(QUESTION_LIMITS.nameMax);

const designCaseSchema = z
  .object({
    ops: z.array(nameSchema).min(1),
    args: z.array(z.array(jsonValueSchema)),
    expected: z.array(jsonValueSchema),
  })
  .refine((value) => value.ops.length === value.args.length && value.ops.length === value.expected.length, {
    message: "ops, args and expected must have the same length",
  });

const methodCaseSchema = z.object({
  method: nameSchema,
  args: z.array(jsonValueSchema),
  expected: jsonValueSchema,
});

function isDesignShape(value: unknown): boolean {
  return typeof value === "object" && value !== null && "ops" in value;
}

// Picks the schema by shape so errors point at the real field instead of a generic "invalid union".
const testCaseSchema = z.unknown().transform((value, ctx): TestCase => {
  const result = (isDesignShape(value) ? designCaseSchema : methodCaseSchema).safeParse(value);
  if (result.success) return result.data as TestCase;
  for (const issue of result.error.issues) {
    ctx.issues.push({ code: "custom", message: issue.message, input: value, path: issue.path });
  }
  return z.NEVER;
});

export const testCasesSchema = z.array(testCaseSchema).min(1).max(QUESTION_LIMITS.testCasesMax);

export const visualHintsSchema = z
  .record(z.string().max(QUESTION_LIMITS.hintKeyMax).regex(HINT_KEY_PATTERN), z.enum(VISUAL_HINT_TYPES))
  .refine((hints) => Object.keys(hints).length <= QUESTION_LIMITS.hintsMax, {
    message: `At most ${QUESTION_LIMITS.hintsMax} hints are allowed`,
  });

export const questionInputSchema = z.object({
  slug: z.string().max(QUESTION_LIMITS.slugMax).regex(SLUG_PATTERN, "Use lowercase letters, digits and single dashes"),
  title: z.string().trim().min(1).max(QUESTION_LIMITS.titleMax),
  difficulty: z.enum(DIFFICULTIES),
  kind: z.enum(QUESTION_KINDS).optional(),
  tags: z
    .array(z.string().max(QUESTION_LIMITS.tagMax).regex(TAG_PATTERN, "Use lowercase letters, digits and dashes"))
    .max(QUESTION_LIMITS.tagsMax)
    .default([]),
  description: z.string().max(QUESTION_LIMITS.descriptionMax).default(""),
  solutionCode: z.string().min(1).max(QUESTION_LIMITS.solutionCodeMax),
  testCases: testCasesSchema,
  visualHints: visualHintsSchema.default({}),
});

export function formatZodIssues(error: z.ZodError): ApiFieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

export interface ResolvedListParams extends ListParams {
  page: number;
  pageSize: number;
}

// NUL and other control characters make Mongo reject the regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function stripControlChars(text: string): string {
  return text.replace(CONTROL_CHARS, "");
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function parseTags(raw: string | null): string[] {
  const tags = (raw ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length <= QUESTION_LIMITS.tagMax && TAG_PATTERN.test(tag));
  return [...new Set(tags)].slice(0, QUESTION_LIMITS.tagsMax);
}

export function parseListParams(searchParams: URLSearchParams): ResolvedListParams {
  const q = stripControlChars(searchParams.get("q") ?? "").trim().slice(0, QUESTION_LIMITS.searchMax);
  const difficultyRaw = searchParams.get("difficulty");
  const difficulty = DIFFICULTIES.find((value) => value === difficultyRaw);
  const kindRaw = searchParams.get("kind");
  const kind = QUESTION_KINDS.find((value) => value === kindRaw);
  const tags = parseTags(searchParams.get("tags"));
  return {
    ...(q ? { q } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(kind ? { kind } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    page: clampInt(searchParams.get("page"), 1, 1, QUESTION_LIMITS.pageMax),
    pageSize: clampInt(
      searchParams.get("pageSize"),
      QUESTION_LIMITS.pageSizeDefault,
      1,
      QUESTION_LIMITS.pageSizeMax,
    ),
  };
}
