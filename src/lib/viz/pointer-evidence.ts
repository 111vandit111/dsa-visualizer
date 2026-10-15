import type { IndexEvidence, IndexUse } from "./overlay-types";

/**
 * Names that hold an array position by convention even when the code never indexes with them (a name-only guess).
 * Count-like or accumulator-like names (k, r, p, q, top, start, end, ...) are left out: they only become index
 * pointers when the source indexes with them (see extractIndexEvidence).
 */
export const FALLBACK_INDEX_NAMES: ReadonlySet<string> = new Set([
  "i", "j", "lo", "hi", "low", "high", "left", "right", "mid", "idx", "index", "ptr", "pos",
]);
/** Methods whose FIRST argument is a position/key into the receiver. */
const KEY_METHODS: ReadonlySet<string> = new Set(["charAt", "charCodeAt", "at", "get", "has", "set"]);
/** Methods whose first TWO arguments are positions into the receiver. */
const RANGE_METHODS: ReadonlySet<string> = new Set(["slice", "substring", "substr"]);
const RANGE_ARG_COUNT = 2;

const KEYWORDS: ReadonlySet<string> = new Set([
  "async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do",
  "else", "enum", "export", "extends", "false", "finally", "for", "function", "if", "import", "in", "instanceof",
  "let", "new", "null", "of", "return", "static", "super", "switch", "this", "throw", "true", "try", "typeof",
  "undefined", "NaN", "Infinity", "var", "void", "while", "with", "yield",
]);
/** After one of these keywords a `/` starts a regular expression instead of dividing. */
const REGEX_PRECEDING_KEYWORDS: ReadonlySet<string> = new Set([
  "return", "typeof", "case", "do", "else", "in", "of", "instanceof", "new", "delete", "void", "throw", "yield", "await",
]);
const THIS_KEYWORD = "this";

type TokenKind = "id" | "num" | "str" | "punct";
/** `str` tokens (strings, template text, regexes) carry no text: their content must never be read as code. */
interface Token { kind: TokenKind; text: string }

const IDENT_START = /[A-Za-z_$#\u0080-￿]/;
const IDENT_PART = /[A-Za-z0-9_$\u0080-￿]/;
const DIGIT = /[0-9]/;
const NUMBER_PART = /[0-9A-Za-z_.]/;
const WHITESPACE = /\s/;

const OPENERS: ReadonlySet<string> = new Set(["(", "[", "{"]);
const CLOSER_TO_OPENER: Readonly<Record<string, string>> = { ")": "(", "]": "[", "}": "{" };

// ---------------------------------------------------------------- tokenizer

interface LexState {
  tokens: Token[];
  /** Brace depth at which each open `${` template expression started. */
  templateStack: number[];
  braceDepth: number;
}

function scanQuoted(code: string, start: number): number {
  const quote = code[start];
  let i = start + 1;
  while (i < code.length && code[i] !== quote && code[i] !== "\n") i += code[i] === "\\" ? 2 : 1;
  return Math.min(i + 1, code.length);
}

/** Scans template text from `start` up to the closing backtick or the next `${`. */
function lexTemplate(code: string, start: number, state: LexState): number {
  let i = start;
  let isOpenExpression = false;
  let end = code.length;
  while (i < code.length) {
    if (code[i] === "\\") i += 2;
    else if (code[i] === "`") { end = i + 1; break; }
    else if (code[i] === "$" && code[i + 1] === "{") { end = i + 2; isOpenExpression = true; break; }
    else i += 1;
  }
  state.tokens.push({ kind: "str", text: "" });
  if (isOpenExpression) {
    state.tokens.push({ kind: "punct", text: "{" });
    state.templateStack.push(state.braceDepth);
    state.braceDepth += 1;
  }
  return end;
}

function scanRegex(code: string, start: number): number {
  let i = start + 1;
  let isInClass = false;
  while (i < code.length && code[i] !== "\n") {
    const ch = code[i];
    i += ch === "\\" ? 2 : 1;
    if (ch === "[") isInClass = true;
    else if (ch === "]") isInClass = false;
    else if (ch === "/" && !isInClass) break;
  }
  while (i < code.length && IDENT_PART.test(code[i])) i += 1;
  return i;
}

function isRegexAllowed(previous: Token | undefined): boolean {
  if (!previous) return true;
  if (previous.kind === "punct") return ![")", "]", "}"].includes(previous.text);
  return previous.kind === "id" && REGEX_PRECEDING_KEYWORDS.has(previous.text);
}

function lexSlash(code: string, start: number, state: LexState): number {
  const next = code[start + 1];
  if (next === "/") {
    const newline = code.indexOf("\n", start);
    return newline === -1 ? code.length : newline;
  }
  if (next === "*") {
    const close = code.indexOf("*/", start + 2);
    return close === -1 ? code.length : close + 2;
  }
  if (isRegexAllowed(state.tokens[state.tokens.length - 1])) {
    state.tokens.push({ kind: "str", text: "" });
    return scanRegex(code, start);
  }
  state.tokens.push({ kind: "punct", text: "/" });
  return start + 1;
}

function lexPunct(code: string, start: number, state: LexState): number {
  const ch = code[start];
  if (ch === "{") state.braceDepth += 1;
  if (ch === "}") {
    state.braceDepth -= 1;
    state.tokens.push({ kind: "punct", text: "}" });
    const isTemplateEnd = state.templateStack.length > 0 && state.templateStack[state.templateStack.length - 1] === state.braceDepth;
    if (!isTemplateEnd) return start + 1;
    state.templateStack.pop();
    return lexTemplate(code, start + 1, state);
  }
  if (code.startsWith("...", start)) {
    state.tokens.push({ kind: "punct", text: "..." });
    return start + 3;
  }
  if (code.startsWith("?.", start) && !DIGIT.test(code[start + 2] ?? "")) {
    state.tokens.push({ kind: "punct", text: "?." });
    return start + 2;
  }
  state.tokens.push({ kind: "punct", text: ch });
  return start + 1;
}

function readWhile(code: string, start: number, pattern: RegExp): number {
  let i = start;
  while (i < code.length && pattern.test(code[i])) i += 1;
  return i;
}

function lexToken(code: string, start: number, state: LexState): number {
  const ch = code[start];
  if (WHITESPACE.test(ch)) return start + 1;
  if (ch === "/") return lexSlash(code, start, state);
  if (ch === '"' || ch === "'") {
    state.tokens.push({ kind: "str", text: "" });
    return scanQuoted(code, start);
  }
  if (ch === "`") return lexTemplate(code, start + 1, state);
  if (DIGIT.test(ch) || (ch === "." && DIGIT.test(code[start + 1] ?? ""))) {
    const end = readWhile(code, start + 1, NUMBER_PART);
    state.tokens.push({ kind: "num", text: code.slice(start, end) });
    return end;
  }
  if (IDENT_START.test(ch)) {
    const end = readWhile(code, start + 1, IDENT_PART);
    state.tokens.push({ kind: "id", text: code.slice(start, end) });
    return end;
  }
  return lexPunct(code, start, state);
}

/** Splits code into identifiers, numbers and punctuation; strings, template text, comments and regexes vanish. */
function tokenize(code: string): Token[] {
  const state: LexState = { tokens: [], templateStack: [], braceDepth: 0 };
  let i = 0;
  while (i < code.length) i = lexToken(code, i, state);
  return state.tokens;
}

// ----------------------------------------------------------------- analysis

interface ScanContext {
  tokens: readonly Token[];
  /** match[i] = index of the bracket paired with token i, -1 when none. */
  match: readonly number[];
}

function matchBrackets(tokens: readonly Token[]): number[] {
  const match: number[] = tokens.map(() => -1);
  const open: number[] = [];
  tokens.forEach((token, index) => {
    if (token.kind !== "punct") return;
    if (OPENERS.has(token.text)) {
      open.push(index);
      return;
    }
    const expected = CLOSER_TO_OPENER[token.text];
    const last = open[open.length - 1];
    if (expected === undefined || last === undefined || tokens[last].text !== expected) return;
    open.pop();
    match[last] = index;
    match[index] = last;
  });
  return match;
}

function isPunct(token: Token | undefined, text: string): boolean {
  return token !== undefined && token.kind === "punct" && token.text === text;
}

function isMemberDot(token: Token | undefined): boolean {
  return isPunct(token, ".") || isPunct(token, "?.");
}

/** A name that may head or continue an identifier chain (`this` counts). */
function isChainName(token: Token | undefined): boolean {
  return token !== undefined && token.kind === "id" && (!KEYWORDS.has(token.text) || token.text === THIS_KEYWORD);
}

/** A variable name read as a value inside an index expression (not a property, a call, or a further base). */
function isIndexName(ctx: ScanContext, at: number): boolean {
  const token = ctx.tokens[at];
  if (token.kind !== "id" || KEYWORDS.has(token.text) || isMemberDot(ctx.tokens[at - 1])) return false;
  const next = ctx.tokens[at + 1];
  return !(isPunct(next, "(") || isPunct(next, "[") || isMemberDot(next));
}

/** Variable names in tokens[from..to]; nested `[...]` groups are skipped (they record their own base). */
function collectNames(ctx: ScanContext, from: number, to: number): string[] {
  const names: string[] = [];
  for (let i = from; i <= to; i++) {
    if (isPunct(ctx.tokens[i], "[") && ctx.match[i] > i) i = ctx.match[i];
    else if (isIndexName(ctx, i)) names.push(ctx.tokens[i].text);
  }
  return names;
}

/** Describes a bracket expression for `via`: a lone number literal, else its first variable, else "" (unknown). */
function viaName(ctx: ScanContext, from: number, to: number): string {
  if (from === to && ctx.tokens[from]?.kind === "num") return ctx.tokens[from].text;
  return collectNames(ctx, from, to)[0] ?? "";
}

/** `this.a.b` / `nums` ending exactly at tokens[end], or null when the chain starts from a call, literal, etc. */
function chainEndingAt(ctx: ScanContext, end: number): string | null {
  const parts: string[] = [];
  let i = end;
  for (;;) {
    const token = ctx.tokens[i];
    if (!isChainName(token)) return null;
    parts.unshift(token.text);
    if (!isMemberDot(ctx.tokens[i - 1])) return parts.join(".");
    i -= 2;
  }
}

/** Index of the last token of whatever a `[` at tokens[open] applies to (skips an optional-chaining `?.`). */
function beforeBracket(ctx: ScanContext, open: number): number {
  return open - (isPunct(ctx.tokens[open - 1], "?.") ? 2 : 1);
}

/** The indexed object ending at tokens[end]: identifier chain plus the brackets that were already applied to it. */
function baseEndingAt(ctx: ScanContext, end: number): IndexUse | null {
  const via: string[] = [];
  let last = end;
  while (isPunct(ctx.tokens[last], "]") && ctx.match[last] >= 0) {
    const open = ctx.match[last];
    via.unshift(viaName(ctx, open + 1, last - 1));
    last = beforeBracket(ctx, open);
  }
  const base = chainEndingAt(ctx, last);
  return base === null ? null : { base, via };
}

function addUse(evidence: Map<string, IndexUse[]>, name: string, use: IndexUse): void {
  const uses = evidence.get(name) ?? [];
  const signature = `${use.base}|${use.via.join(",")}`;
  if (!uses.some((existing) => `${existing.base}|${existing.via.join(",")}` === signature)) uses.push(use);
  evidence.set(name, uses);
}

function recordBracket(ctx: ScanContext, open: number, evidence: Map<string, IndexUse[]>): void {
  const close = ctx.match[open];
  if (close <= open) return;
  const base = baseEndingAt(ctx, beforeBracket(ctx, open));
  if (!base) return;
  for (const name of collectNames(ctx, open + 1, close - 1)) addUse(evidence, name, base);
}

/** Argument token ranges [from, to] of the call whose `(` is tokens[open]. */
function splitArguments(ctx: ScanContext, open: number): [number, number][] {
  const close = ctx.match[open];
  const ranges: [number, number][] = [];
  let from = open + 1;
  for (let i = open + 1; i < close; i++) {
    const token = ctx.tokens[i];
    if (token.kind === "punct" && OPENERS.has(token.text) && ctx.match[i] > i) i = ctx.match[i];
    else if (isPunct(token, ",")) {
      ranges.push([from, i - 1]);
      from = i + 1;
    }
  }
  if (from <= close - 1) ranges.push([from, close - 1]);
  return ranges;
}

function recordMethodCall(ctx: ScanContext, at: number, evidence: Map<string, IndexUse[]>): void {
  const method = ctx.tokens[at].text;
  const isKeyMethod = KEY_METHODS.has(method);
  if (!(isKeyMethod || RANGE_METHODS.has(method))) return;
  if (!isMemberDot(ctx.tokens[at - 1]) || !isPunct(ctx.tokens[at + 1], "(") || ctx.match[at + 1] < 0) return;
  const base = baseEndingAt(ctx, at - 2);
  if (!base) return;
  for (const [from, to] of splitArguments(ctx, at + 1).slice(0, isKeyMethod ? 1 : RANGE_ARG_COUNT)) {
    for (const name of collectNames(ctx, from, to)) addUse(evidence, name, base);
  }
}

/**
 * Which variables are used as array/string/map positions in `code`, and on what: `nums[i]`, `s.charAt(i)`, `dp[i - 1][j]`
 * (j: base "dp", via ["i"]), `this.cache.get(key)`. A scanner, not a parser: it only has to survive any JS source.
 */
export function extractIndexEvidence(code: string): IndexEvidence {
  const tokens = tokenize(code);
  const ctx: ScanContext = { tokens, match: matchBrackets(tokens) };
  const evidence = new Map<string, IndexUse[]>();
  tokens.forEach((token, index) => {
    if (isPunct(token, "[")) recordBracket(ctx, index, evidence);
    else if (token.kind === "id") recordMethodCall(ctx, index, evidence);
  });
  return evidence;
}
