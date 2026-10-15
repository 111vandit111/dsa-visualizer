import { connection } from "next/server";
import { getSiteUrl } from "@/lib/env";
import { listSeoEntries } from "@/lib/seo/data";
import { TEXT_CACHE_CONTROL, renderLlmsFullTxt } from "@/lib/seo/llms";

export async function GET() {
  await connection();
  const entries = await listSeoEntries();
  return new Response(renderLlmsFullTxt(entries, getSiteUrl()), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": TEXT_CACHE_CONTROL },
  });
}
