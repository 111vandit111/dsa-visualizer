import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { listSeoEntries } from "@/lib/seo/data";
import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return buildSitemapEntries(await listSeoEntries(), getSiteUrl());
}
