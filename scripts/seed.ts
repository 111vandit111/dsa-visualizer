import { closeDb } from "@/lib/db";
import { countQuestions, upsertBySlug } from "@/lib/questions/repository";
import { parseQuestionInput } from "@/lib/validation/question.server";
import { buildDesignTwitter } from "./seed/design-twitter";

async function seed(): Promise<void> {
  const parsed = parseQuestionInput(buildDesignTwitter());
  if (!parsed.ok) {
    const details = parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Seed data is invalid: ${details}`);
  }
  const { isCreated } = await upsertBySlug(parsed.value);
  const total = await countQuestions();
  console.log(`Seeded ${parsed.value.slug} (${isCreated ? "created" : "updated"}); ${total} question(s) in collection`);
}

async function main(): Promise<void> {
  try {
    await seed();
  } catch (error) {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
