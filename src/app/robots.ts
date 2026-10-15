import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { CRAWLER_USER_AGENTS, DISALLOWED_PATHS, absoluteUrl } from "@/lib/seo/site";

// A named-bot group replaces the "*" group, so every group repeats the disallow list.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...CRAWLER_USER_AGENTS], allow: "/", disallow: [...DISALLOWED_PATHS] },
      { userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
