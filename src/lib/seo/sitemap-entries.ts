import type { MetadataRoute } from "next";
import type { SeoEntry } from "./data";
import { questionPath } from "./site";

const QUESTION_PRIORITY = 0.7;
const ALGORITHM_PRIORITY = 0.8;

function newestUpdate(entries: SeoEntry[]): Date | undefined {
  const times = entries.map((entry) => new Date(entry.updatedAt).getTime()).filter((time) => !Number.isNaN(time));
  return times.length > 0 ? new Date(times.reduce((max, time) => Math.max(max, time))) : undefined;
}

export function buildSitemapEntries(entries: SeoEntry[], siteUrl: string): MetadataRoute.Sitemap {
  const lastModified = newestUpdate(entries);
  const home: MetadataRoute.Sitemap[number] = {
    url: siteUrl,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: "weekly",
    priority: 1,
  };
  const pages = entries.map((entry): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${questionPath(entry.slug)}`,
    lastModified: new Date(entry.updatedAt),
    changeFrequency: "monthly",
    priority: entry.kind === "algorithm" ? ALGORITHM_PRIORITY : QUESTION_PRIORITY,
  }));
  return [home, ...pages];
}
