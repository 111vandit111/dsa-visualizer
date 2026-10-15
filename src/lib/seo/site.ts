import { getSiteUrl } from "@/lib/env";

export const SITE_NAME = "DSA Visualizer";
export const SITE_TAGLINE = "Step through data structure and algorithm solutions line by line";
export const SITE_TITLE = `${SITE_NAME} — step-by-step algorithm visualizer`;
export const SITE_DESCRIPTION =
  "Watch JavaScript solutions to data structure and algorithm problems run step by step, with every variable, array, tree, graph and pointer animated.";
export const SITE_KEYWORDS: readonly string[] = [
  "DSA visualizer",
  "algorithm visualization",
  "data structure visualization",
  "step by step debugger",
  "LeetCode solutions",
  "coding interview prep",
  "JavaScript algorithms",
];

export const BRAND_COLORS = {
  background: "#07080b",
  foreground: "#e8eaf2",
  primary: "#b8f34a",
  muted: "#8a90a6",
} as const;

export const CRAWLER_USER_AGENTS: readonly string[] = [
  "Googlebot",
  "Bingbot",
  "Applebot",
  "Applebot-Extended",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
];

export const DISALLOWED_PATHS: readonly string[] = ["/admin", "/api/"];
export const SEARCH_QUERY_PARAM = "q";

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path}`;
}

export function questionPath(slug: string): string {
  return `/q/${slug}`;
}
