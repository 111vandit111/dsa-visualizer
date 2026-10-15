import { KIND_LABELS } from "@/lib/types/question";
import type { SeoEntry } from "./data";
import { questionPath, SITE_DESCRIPTION, SITE_NAME } from "./site";
import { plainTextSummary } from "./text";

export const TEXT_CACHE_CONTROL = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

const LINK_DESCRIPTION_LENGTH = 140;
const MIN_FENCE_LENGTH = 3;

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Titles sit inside markdown link text: keep them on one line and stop brackets from closing the link early.
function linkText(title: string): string {
  return oneLine(title).replace(/([\\[\]])/g, "\\$1");
}

function entryLine(entry: SeoEntry, siteUrl: string): string {
  const summary = plainTextSummary(entry.description, LINK_DESCRIPTION_LENGTH);
  const link = `[${linkText(entry.title)}](${siteUrl}${questionPath(entry.slug)})`;
  return summary ? `- ${link}: ${summary}` : `- ${link}`;
}

function section(heading: string, lines: string[]): string[] {
  return lines.length > 0 ? [`## ${heading}`, "", ...lines, ""] : [];
}

export function renderLlmsTxt(entries: SeoEntry[], siteUrl: string): string {
  const algorithms = entries.filter((entry) => entry.kind === "algorithm");
  const problems = entries.filter((entry) => entry.kind !== "algorithm");
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Each page has the problem statement, a JavaScript solution and an interactive step-by-step visualization of it running.",
    "",
    ...section(KIND_LABELS.algorithm.plural, algorithms.map((entry) => entryLine(entry, siteUrl))),
    ...section("Practice problems", problems.map((entry) => entryLine(entry, siteUrl))),
    ...section("Optional", [
      `- [Full content](${siteUrl}/llms-full.txt): every problem statement and solution in one file`,
      `- [Sitemap](${siteUrl}/sitemap.xml): all pages`,
    ]),
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

// A fence longer than any backtick run in the code, so solutions containing ``` cannot close it early.
function fenceFor(code: string): string {
  const longest = (code.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0);
  return "`".repeat(Math.max(MIN_FENCE_LENGTH, longest + 1));
}

function renderFullEntry(entry: SeoEntry, siteUrl: string): string {
  const fence = fenceFor(entry.solutionCode);
  return [
    `## ${oneLine(entry.title)}`,
    "",
    `URL: ${siteUrl}${questionPath(entry.slug)}`,
    `Type: ${KIND_LABELS[entry.kind].singular}`,
    `Difficulty: ${entry.difficulty}`,
    `Tags: ${entry.tags.map(oneLine).join(", ") || "none"}`,
    "",
    entry.description.trim(),
    "",
    "### Solution (JavaScript)",
    "",
    `${fence}js`,
    entry.solutionCode.trimEnd(),
    fence,
  ].join("\n");
}

export function renderLlmsFullTxt(entries: SeoEntry[], siteUrl: string): string {
  const header = [`# ${SITE_NAME}`, "", `> ${SITE_DESCRIPTION}`].join("\n");
  const body = entries.map((entry) => renderFullEntry(entry, siteUrl));
  return `${[header, ...body].join("\n\n")}\n`;
}
