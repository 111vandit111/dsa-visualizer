import type { Collection, Filter, ObjectId } from "mongodb";
import { getDb, QUESTIONS_COLLECTION } from "@/lib/db";
import type { TestCase, VisualHints, VisualHintType } from "@/lib/tracer/types";
import type {
  Difficulty,
  Question,
  QuestionInput,
  QuestionKind,
  QuestionListResult,
  QuestionSummary,
  TagFacet,
} from "@/lib/types/question";
import { stripControlChars, type ResolvedListParams } from "@/lib/validation/question";

const MONGO_DUPLICATE_KEY_CODE = 11000;
const MAX_TAG_FACETS = 50;
const DEFAULT_KIND: QuestionKind = "question";

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// Hints are stored as a list because their keys contain dots ("this.tweetMap"), which Mongo field names should avoid.
interface HintEntry {
  path: string;
  type: VisualHintType;
}

// `kind` is optional on writes: an update that omits it must keep the stored kind.
interface QuestionFields {
  slug: string;
  title: string;
  difficulty: Difficulty;
  kind?: QuestionKind;
  tags: string[];
  description: string;
  solutionCode: string;
  testCases: TestCase[];
  visualHints: HintEntry[];
}

// Documents written before `kind` existed have no field and count as questions.
interface QuestionDocument extends QuestionFields {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

type SummaryRow = Omit<QuestionSummary, "updatedAt"> & { updatedAt: Date };

async function questionsCollection(): Promise<Collection<QuestionDocument>> {
  const db = await getDb();
  return db.collection<QuestionDocument>(QUESTIONS_COLLECTION);
}

function toHintEntries(hints: VisualHints): HintEntry[] {
  return Object.entries(hints).map(([path, type]) => ({ path, type }));
}

function toFields(input: QuestionInput): QuestionFields {
  return {
    slug: input.slug,
    title: input.title,
    difficulty: input.difficulty,
    ...(input.kind ? { kind: input.kind } : {}),
    tags: input.tags,
    description: input.description,
    solutionCode: input.solutionCode,
    testCases: input.testCases,
    visualHints: toHintEntries(input.visualHints),
  };
}

export function toQuestion(doc: QuestionDocument): Question {
  return {
    id: doc._id.toHexString(),
    slug: doc.slug,
    title: doc.title,
    difficulty: doc.difficulty,
    kind: doc.kind ?? DEFAULT_KIND,
    tags: doc.tags ?? [],
    description: doc.description ?? "",
    solutionCode: doc.solutionCode,
    testCases: doc.testCases ?? [],
    visualHints: Object.fromEntries((doc.visualHints ?? []).map((hint) => [hint.path, hint.type])),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toSummary(row: SummaryRow): QuestionSummary {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildKindFilter(kind: QuestionKind | undefined): Filter<QuestionDocument> {
  if (kind === "algorithm") return { kind: "algorithm" };
  if (kind === "question") return { kind: { $ne: "algorithm" } };
  return {};
}

function buildFilter(params: ResolvedListParams): Filter<QuestionDocument> {
  const filter: Filter<QuestionDocument> = {};
  const q = params.q ? stripControlChars(params.q) : "";
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ title: pattern }, { tags: pattern }];
  }
  if (params.difficulty) filter.difficulty = params.difficulty;
  Object.assign(filter, buildKindFilter(params.kind));
  if (params.tags && params.tags.length > 0) filter.tags = { $all: params.tags };
  return filter;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === MONGO_DUPLICATE_KEY_CODE;
}

function rethrowConflict(error: unknown, slug: string): never {
  if (isDuplicateKeyError(error)) throw new ConflictError(`A question with slug "${slug}" already exists`);
  throw error;
}

export async function listQuestions(params: ResolvedListParams): Promise<QuestionListResult> {
  const collection = await questionsCollection();
  const filter = buildFilter(params);
  const [rows, total, tagRows] = await Promise.all([
    collection
      .aggregate<SummaryRow>([
        { $match: filter },
        { $sort: { updatedAt: -1, _id: -1 } },
        { $skip: (params.page - 1) * params.pageSize },
        { $limit: params.pageSize },
        {
          $project: {
            _id: 0,
            slug: 1,
            title: 1,
            difficulty: 1,
            kind: { $ifNull: ["$kind", DEFAULT_KIND] },
            tags: 1,
            updatedAt: 1,
            caseCount: { $size: { $ifNull: ["$testCases", []] } },
            isDesign: {
              $let: {
                vars: { first: { $arrayElemAt: [{ $ifNull: ["$testCases", []] }, 0] } },
                in: { $ne: [{ $type: "$$first.ops" }, "missing"] },
              },
            },
          },
        },
      ])
      .toArray(),
    collection.countDocuments(filter),
    collection
      .aggregate<{ _id: string; count: number }>([
        { $match: buildKindFilter(params.kind) },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: MAX_TAG_FACETS },
      ])
      .toArray(),
  ]);
  const tags: TagFacet[] = tagRows.map((row) => ({ tag: row._id, count: row.count }));
  return {
    items: rows.map(toSummary),
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
    facets: { tags },
  };
}

export type SeoRow = Pick<
  Question,
  "slug" | "title" | "difficulty" | "kind" | "tags" | "description" | "solutionCode" | "updatedAt"
>;

type SeoDocument = Omit<SeoRow, "updatedAt" | "kind"> & { kind?: QuestionKind; updatedAt: Date };

// Read model for sitemap, llms.txt and metadata: only the fields those surfaces need, never test cases.
export async function listForSeo(): Promise<SeoRow[]> {
  const collection = await questionsCollection();
  const docs = await collection
    .find<SeoDocument>(
      {},
      { projection: { _id: 0, slug: 1, title: 1, difficulty: 1, kind: 1, tags: 1, description: 1, solutionCode: 1, updatedAt: 1 } },
    )
    .toArray();
  return docs.map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    difficulty: doc.difficulty,
    kind: doc.kind ?? DEFAULT_KIND,
    tags: doc.tags ?? [],
    description: doc.description ?? "",
    solutionCode: doc.solutionCode,
    updatedAt: doc.updatedAt.toISOString(),
  }));
}

export async function getBySlug(slug: string): Promise<Question | null> {
  const collection = await questionsCollection();
  const doc = await collection.findOne({ slug });
  return doc ? toQuestion(doc) : null;
}

export async function create(input: QuestionInput): Promise<Question> {
  const collection = await questionsCollection();
  const now = new Date();
  const fields = { ...toFields(input), kind: input.kind ?? DEFAULT_KIND };
  try {
    const { insertedId } = await collection.insertOne({ ...fields, createdAt: now, updatedAt: now } as QuestionDocument);
    return toQuestion({ ...fields, _id: insertedId, createdAt: now, updatedAt: now });
  } catch (error) {
    return rethrowConflict(error, input.slug);
  }
}

export async function update(slug: string, input: QuestionInput): Promise<Question | null> {
  const collection = await questionsCollection();
  try {
    const doc = await collection.findOneAndUpdate(
      { slug },
      { $set: { ...toFields(input), updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return doc ? toQuestion(doc) : null;
  } catch (error) {
    return rethrowConflict(error, input.slug);
  }
}

export async function remove(slug: string): Promise<boolean> {
  const collection = await questionsCollection();
  const { deletedCount } = await collection.deleteOne({ slug });
  return deletedCount > 0;
}

export async function upsertBySlug(input: QuestionInput): Promise<{ isCreated: boolean }> {
  const collection = await questionsCollection();
  const now = new Date();
  const result = await collection.updateOne(
    { slug: input.slug },
    {
      $set: { ...toFields(input), updatedAt: now },
      $setOnInsert: { createdAt: now, ...(input.kind ? {} : { kind: DEFAULT_KIND }) },
    },
    { upsert: true },
  );
  return { isCreated: result.upsertedCount > 0 };
}

export async function countQuestions(): Promise<number> {
  return (await questionsCollection()).estimatedDocumentCount();
}
