import { checkSample } from "./seed/check-sample";
import { SAMPLE_MODULES } from "./seed/samples";
import { executeRun } from "@/lib/tracer/execute";

const STEP_WARNING = 1500;

/** Usage: tsx scripts/check-samples.ts [module...]  — validates and runs samples without a database. */
function main(): void {
  const requested = process.argv.slice(2);
  const modules = requested.length > 0 ? requested : Object.keys(SAMPLE_MODULES);
  const slugs = new Set<string>();
  let failures = 0;
  for (const name of modules) {
    const builders = SAMPLE_MODULES[name];
    if (!builders) throw new Error(`Unknown module "${name}". Known: ${Object.keys(SAMPLE_MODULES).join(", ")}`);
    for (const build of builders) {
      try {
        const sample = checkSample(build());
        if (slugs.has(sample.slug)) throw new Error(`${sample.slug}: duplicate slug`);
        slugs.add(sample.slug);
        const traced = executeRun({ code: sample.solutionCode, testCases: sample.testCases, traceCaseIndex: 0 });
        const steps = traced.trace?.steps.length ?? 0;
        const warn = steps >= STEP_WARNING || traced.trace?.isTruncated ? "  WARNING: trace near/over step cap" : "";
        console.log(`ok   ${name}/${sample.slug} (case 0: ${steps} steps)${warn}`);
      } catch (error) {
        failures += 1;
        console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  console.log(`${slugs.size} passed, ${failures} failed`);
  if (failures > 0) process.exitCode = 1;
}

main();
