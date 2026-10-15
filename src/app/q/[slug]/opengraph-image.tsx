import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/seo/og-card";
import { SITE_NAME } from "@/lib/seo/site";
import { lookupQuestion } from "@/lib/seo/data";

export const alt = `${SITE_NAME} step-by-step visualization`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lookup = await lookupQuestion(slug);
  const card =
    lookup.status === "found" ? (
      <OgCard
        title={lookup.question.title}
        difficulty={lookup.question.difficulty}
        tags={lookup.question.tags}
        tagline="Step-by-step visualization"
      />
    ) : (
      <OgCard title="Watch algorithms run, step by step" />
    );
  return new ImageResponse(card, { ...size });
}
