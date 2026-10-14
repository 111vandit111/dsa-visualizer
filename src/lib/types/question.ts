import type { TestCase, VisualHints } from "@/lib/tracer/types";
export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export interface QuestionInput { slug: string; title: string; difficulty: Difficulty; tags: string[]; description: string; solutionCode: string; testCases: TestCase[]; visualHints: VisualHints }
export interface Question extends QuestionInput { id: string; createdAt: string; updatedAt: string }   // ISO-8601 UTC strings
export interface QuestionSummary { slug: string; title: string; difficulty: Difficulty; tags: string[]; caseCount: number; isDesign: boolean; updatedAt: string }
export interface TagFacet { tag: string; count: number }
export interface QuestionListResult { items: QuestionSummary[]; page: number; pageSize: number; total: number; totalPages: number; facets: { tags: TagFacet[] } }
export interface ListParams { q?: string; difficulty?: Difficulty; tags?: string[]; page?: number; pageSize?: number }
export type ApiErrorCode = "validation_error" | "bad_request" | "unauthorized" | "not_found" | "conflict" | "rate_limited" | "internal_error";
export interface ApiFieldIssue { path: string; message: string }     // path e.g. "title", "testCases.0.args", "solutionCode"
export interface ApiErrorBody { code: ApiErrorCode; message: string; details?: ApiFieldIssue[] }
