import { cacheLife, cacheTag } from "next/cache";
import { logger } from "@/lib/logger";
import { getBySlug, listForSeo } from "@/lib/questions/repository";
import type { Difficulty, Question, QuestionKind } from "@/lib/types/question";
import { QUESTION_LIMITS, SLUG_PATTERN } from "@/lib/validation/question";

export const QUESTIONS_CACHE_TAG = "questions";

const REVALIDATE_SECONDS = 300;
const EXPIRE_SECONDS = 60 * 60 * 24 * 30;

export interface SeoEntry {
  slug: string;
  title: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  tags: string[];
  description: string;
  solutionCode: string;
  updatedAt: string;
}

export type QuestionLookup =
  | { status: "found"; question: Question }
  | { status: "missing" }
  | { status: "unavailable" };

// The cached functions below THROW on database errors on purpose: a thrown error is never cached,
// so an outage cannot pin an empty page for the whole cache lifetime. The exported wrappers catch.
async function loadQuestion(slug: string): Promise<Question | null> {
  "use cache";
  cacheLife({ stale: REVALIDATE_SECONDS, revalidate: REVALIDATE_SECONDS, expire: EXPIRE_SECONDS });
  cacheTag(QUESTIONS_CACHE_TAG);
  return getBySlug(slug);
}

async function loadSeoEntries(): Promise<SeoEntry[]> {
  "use cache";
  cacheLife({ stale: REVALIDATE_SECONDS, revalidate: REVALIDATE_SECONDS, expire: EXPIRE_SECONDS });
  cacheTag(QUESTIONS_CACHE_TAG);
  return listForSeo();
}

function isValidSlug(slug: string): boolean {
  return typeof slug === "string" && slug.length <= QUESTION_LIMITS.slugMax && SLUG_PATTERN.test(slug);
}

function compareEntries(a: SeoEntry, b: SeoEntry): number {
  if (a.kind !== b.kind) return a.kind === "algorithm" ? -1 : 1;
  return a.title.localeCompare(b.title, "en", { sensitivity: "base" }) || a.slug.localeCompare(b.slug);
}

export async function lookupQuestion(slug: string): Promise<QuestionLookup> {
  if (!isValidSlug(slug)) return { status: "missing" };
  try {
    const question = await loadQuestion(slug);
    return question ? { status: "found", question } : { status: "missing" };
  } catch (error) {
    logger.error("SEO question lookup failed", { slug, error });
    return { status: "unavailable" };
  }
}

export async function listSeoEntries(): Promise<SeoEntry[]> {
  try {
    return [...(await loadSeoEntries())].sort(compareEntries);
  } catch (error) {
    logger.error("SEO question list failed", { error });
    return [];
  }
}
