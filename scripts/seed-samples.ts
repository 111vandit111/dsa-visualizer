import { closeDb } from "@/lib/db";
import { upsertBySlug } from "@/lib/questions/repository";
import { checkSample } from "./seed/check-sample";
import { ALGORITHM_SAMPLES, ALL_SAMPLES } from "./seed/samples";

const ONLY_ALGORITHMS_FLAG = "--only=algorithms";

async function seedSamples(): Promise<void> {
  const samples = process.argv.includes(ONLY_ALGORITHMS_FLAG) ? ALGORITHM_SAMPLES : ALL_SAMPLES;
  for (const build of samples) {
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
