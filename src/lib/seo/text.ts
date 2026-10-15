const DEFAULT_MAX_LENGTH = 160;
const ELLIPSIS = "…";
const MAX_INPUT_LENGTH = 100_000;

// Order matters: fences first, then links/images, then inline markup.
const STRIP_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/```[\s\S]*?(?:```|$)/g, " "],
  [/~~~[\s\S]*?(?:~~~|$)/g, " "],
  [/!\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/\[([^\]]*)\]\([^)]*\)/g, "$1"],
  [/<\/?[a-zA-Z][^>]*>/g, " "],
  [/^\s{0,3}#{1,6}\s+/gm, ""],
  [/^\s{0,3}>\s?/gm, ""],
  [/^\s*(?:[-*_]\s*){3,}$/gm, " "],
  [/^\s*(?:[-*+]|\d+[.)])\s+/gm, ""],
  [/`([^`]*)`/g, "$1"],
  [/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, "$1"],
  [/(?<!\w)__(?=\S)(.+?)(?<=\S)__(?!\w)/g, "$1"],
  [/\*(?=\S)(.+?)(?<=\S)\*/g, "$1"],
  [/(?<!\w)_(?=\S)(.+?)(?<=\S)_(?!\w)/g, "$1"],
  [/~~(.*?)~~/g, "$1"],
];

function cutAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const room = Math.max(maxLength - ELLIPSIS.length, 0);
  const slice = text.slice(0, room);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > room / 2 ? slice.slice(0, lastSpace) : slice;
  return `${base.replace(/[\s,;:.\-–—]+$/, "")}${ELLIPSIS}`;
}

// Plain text for meta descriptions and JSON-LD: no markdown, one line, cut at a word boundary.
export function plainTextSummary(markdown: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  if (!markdown) return "";
  let text = markdown.slice(0, MAX_INPUT_LENGTH);
  for (const [pattern, replacement] of STRIP_RULES) text = text.replace(pattern, replacement);
  return cutAtWord(text.replace(/\s+/g, " ").trim(), maxLength);
}
