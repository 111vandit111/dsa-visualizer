import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/seo/og-card";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export const alt = `${SITE_NAME} — ${SITE_DESCRIPTION}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgCard title="Watch algorithms run, step by step" />, { ...size });
}
