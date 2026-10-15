import {
  formatZodIssues,
  questionInputSchema,
  testCasesSchema,
} from "@/lib/validation/question";
import type { TestCase } from "@/lib/tracer/types";
import type { ApiFieldIssue, Difficulty, Question, QuestionInput, QuestionKind } from "@/lib/types/question";

export const FORM_FIELDS = [
  "title",
  "slug",
  "difficulty",
  "kind",
  "tags",
  "description",
  "solutionCode",
  "testCases",
  "visualHints",
] as const;
export type FormField = (typeof FORM_FIELDS)[number];
export type FormErrors = Partial<Record<FormField | "form", string>>;

export interface QuestionFormValues {
  title: string;
  slug: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  tags: string[];
  description: string;
  solutionCode: string;
  testCases: string;
  visualHints: string;
}

const SLUG_MAX_LENGTH = 80;
const JSON_INDENT = 2;
const JSON_FIELDS = ["testCases", "visualHints"] as const;
const PLACEHOLDER_TEST_CASES: TestCase[] = [{ method: "placeholder", args: [], expected: null }];

export const EMPTY_VALUES: QuestionFormValues = {
  title: "",
  slug: "",
  difficulty: "Easy",
  kind: "question",
  tags: [],
  description: "",
  solutionCode: "",
  testCases: "[]",
  visualHints: "{}",
};

export const DESIGN_EXAMPLE = JSON.stringify(
  [
    {
      ops: ["Counter", "increment", "increment", "get"],
      args: [[], [], [], []],
      expected: [null, null, null, 2],
    },
  ],
  null,
  JSON_INDENT,
);

export const METHOD_EXAMPLE = JSON.stringify(
  [{ method: "twoSum", args: [[2, 7, 11, 15], 9], expected: [0, 1] }],
  null,
  JSON_INDENT,
);

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, "");
}

export function valuesFromQuestion(question: Question): QuestionFormValues {
  return {
    title: question.title,
    slug: question.slug,
    difficulty: question.difficulty,
    kind: question.kind,
    tags: question.tags,
    description: question.description,
    solutionCode: question.solutionCode,
    testCases: JSON.stringify(question.testCases, null, JSON_INDENT),
    visualHints: JSON.stringify(question.visualHints, null, JSON_INDENT),
  };
}

type JsonParseResult = { ok: true; value: unknown } | { ok: false; message: string };

function parseJsonText(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, message: `Invalid JSON: ${error instanceof Error ? error.message : "could not parse"}` };
  }
}

function isFormField(value: string): value is FormField {
  return (FORM_FIELDS as readonly string[]).includes(value);
}

function describeIssue(field: FormField, rest: string[], message: string): string {
  if (field === "testCases" && rest.length > 0 && /^\d+$/.test(rest[0])) {
    const detail = rest.slice(1).join(".");
    return `Case ${Number(rest[0]) + 1}${detail ? ` (${detail})` : ""}: ${message}`;
  }
  return rest.length > 0 ? `${rest.join(".")}: ${message}` : message;
}

/** Maps issue paths (server `details[].path` or local zod paths) onto form fields; unknown paths become form-level. */
export function mapIssuesToErrors(issues: ApiFieldIssue[]): FormErrors {
  const grouped = new Map<FormField | "form", string[]>();
  for (const issue of issues) {
    const [head = "", ...rest] = issue.path.split(".").filter((part) => part.length > 0);
    const key = isFormField(head) ? head : "form";
    const message = key === "form" ? issue.message : describeIssue(key, rest, issue.message);
    grouped.set(key, [...(grouped.get(key) ?? []), message]);
  }
  const errors: FormErrors = {};
  for (const [key, messages] of grouped) {
    const extra = messages.length - 1;
    errors[key] = extra > 0 ? `${messages[0]} (+${extra} more)` : messages[0];
  }
  return errors;
}

export type ParsedTestCases = { ok: true; value: TestCase[] } | { ok: false; message: string };

export function parseTestCasesText(text: string): ParsedTestCases {
  const json = parseJsonText(text);
  if (!json.ok) return json;
  const result = testCasesSchema.safeParse(json.value);
  if (result.success) return { ok: true, value: result.data };
  const issues = formatZodIssues(result.error).map((issue) => ({
    ...issue,
    path: issue.path ? `testCases.${issue.path}` : "testCases",
  }));
  return { ok: false, message: mapIssuesToErrors(issues).testCases ?? "Invalid test cases" };
}

export type ParsedForm = { ok: true; input: QuestionInput } | { ok: false; errors: FormErrors };

export function parseFormValues(values: QuestionFormValues): ParsedForm {
  const errors: FormErrors = {};
  const testCases = parseJsonText(values.testCases);
  const hints = parseJsonText(values.visualHints);
  if (!testCases.ok) errors.testCases = testCases.message;
  if (!hints.ok) errors.visualHints = hints.message;

  const candidate = {
    slug: values.slug,
    title: values.title,
    difficulty: values.difficulty,
    kind: values.kind,
    tags: values.tags,
    description: values.description,
    solutionCode: values.solutionCode,
    testCases: testCases.ok ? testCases.value : PLACEHOLDER_TEST_CASES,
    visualHints: hints.ok ? hints.value : {},
  };
  const result = questionInputSchema.safeParse(candidate);
  const schemaErrors: FormErrors = result.success ? {} : mapIssuesToErrors(formatZodIssues(result.error));
  for (const field of JSON_FIELDS) if (errors[field]) delete schemaErrors[field];
  const allErrors: FormErrors = { ...schemaErrors, ...errors };
  if (result.success && Object.keys(allErrors).length === 0) {
    return { ok: true, input: result.data as QuestionInput };
  }
  return { ok: false, errors: allErrors };
}
