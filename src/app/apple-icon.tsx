import { ImageResponse } from "next/og";
import { IconGlyph } from "@/lib/seo/og-card";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconGlyph size={size.width} />, { ...size });
}
