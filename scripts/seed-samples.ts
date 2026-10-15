import { closeDb } from "@/lib/db";
import { upsertBySlug } from "@/lib/questions/repository";
import { checkSample } from "./seed/check-sample";
import { ALL_SAMPLES } from "./seed/samples";

async function seedSamples(): Promise<void> {
  for (const build of ALL_SAMPLES) {
    const sample = checkSample(build());
    const { isCreated } = await upsertBySlug(sample);
    console.log(`${isCreated ? "created" : "updated"} ${sample.slug}`);
  }
}

async function main(): Promise<void> {
  try {
    await seedSamples();
  } catch (error) {
    console.error("Seed samples failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
