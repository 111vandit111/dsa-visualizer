import { SITE_NAME, SITE_TAGLINE, BRAND_COLORS } from "./site";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const MAX_TITLE_LENGTH = 70;
const MAX_TAGS = 4;

function clampTitle(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_TITLE_LENGTH) return clean;
  const cut = clean.slice(0, MAX_TITLE_LENGTH - 1);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > MAX_TITLE_LENGTH / 2 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

interface OgCardProps {
  title: string;
  difficulty?: string;
  tags?: readonly string[];
  tagline?: string;
}

// Satori (next/og) needs display:flex on any element with several children; default font only.
export function OgCard({ title, difficulty, tags = [], tagline = SITE_TAGLINE }: OgCardProps) {
  const text = clampTitle(title);
  const chips = [...(difficulty ? [difficulty] : []), ...tags.slice(0, MAX_TAGS)];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: BRAND_COLORS.background,
        color: BRAND_COLORS.foreground,
        borderTop: `8px solid ${BRAND_COLORS.primary}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 700 }}>
        <span style={{ color: BRAND_COLORS.primary, marginRight: 16 }}>&gt;_</span>
        <span>{SITE_NAME}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: text.length > 40 ? 64 : 80, fontWeight: 700, lineHeight: 1.1 }}>
          {text}
        </div>
        {chips.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 36 }}>
            {chips.map((chip, index) => (
              <div
                key={`${chip}-${index}`}
                style={{
                  display: "flex",
                  fontSize: 28,
                  padding: "8px 22px",
                  marginRight: 16,
                  marginBottom: 12,
                  borderRadius: 999,
                  border: `2px solid ${index === 0 && difficulty ? BRAND_COLORS.primary : BRAND_COLORS.muted}`,
                  color: index === 0 && difficulty ? BRAND_COLORS.primary : BRAND_COLORS.muted,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", fontSize: 30, color: BRAND_COLORS.muted }}>{tagline}</div>
    </div>
  );
}

export function IconGlyph({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_COLORS.background,
        color: BRAND_COLORS.primary,
        fontSize: Math.round(size * 0.5),
        fontWeight: 700,
        letterSpacing: "-0.05em",
      }}
    >
      &gt;_
    </div>
  );
}
