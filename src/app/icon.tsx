import { ImageResponse } from "next/og";
import { IconGlyph } from "@/lib/seo/og-card";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<IconGlyph size={size.width} />, { ...size });
}
