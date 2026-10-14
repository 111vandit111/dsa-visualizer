import { isProxyTrusted } from "@/lib/env";
import { ApiHttpError } from "./response";

export const MAX_BODY_BYTES = 1024 * 1024;
const JSON_CONTENT_TYPE = "application/json";
export const MAX_JSON_DEPTH = 64;

export function exceedsJsonDepth(value: unknown, maxDepth: number): boolean {
  const stack: [unknown, number][] = [[value, 1]];
  while (stack.length > 0) {
    const [node, depth] = stack.pop() as [unknown, number];
    if (typeof node !== "object" || node === null) continue;
    if (depth > maxDepth) return true;
    for (const child of Object.values(node)) stack.push([child, depth + 1]);
  }
  return false;
}

async function readLimitedText(request: Request): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BODY_BYTES) throw new ApiHttpError(413, "bad_request", "Request body is too large");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new ApiHttpError(413, "bad_request", "Request body is too large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function readJsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes(JSON_CONTENT_TYPE)) {
    throw new ApiHttpError(400, "bad_request", "Content-Type must be application/json");
  }
  const text = await readLimitedText(request);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiHttpError(400, "bad_request", "Request body is not valid JSON");
  }
  if (exceedsJsonDepth(parsed, MAX_JSON_DEPTH)) {
    throw new ApiHttpError(400, "bad_request", `Request body is nested deeper than ${MAX_JSON_DEPTH} levels`);
  }
  return parsed;
}

const DIRECT_CLIENT_KEY = "direct";

// Without TRUST_PROXY every request shares one key (headers are spoofable); the global cap still applies.
// With it, use x-real-ip, else the rightmost X-Forwarded-For hop (appended by the nearest proxy).
export function getClientKey(request: Request): string {
  if (!isProxyTrusted()) return DIRECT_CLIENT_KEY;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const hops = request.headers.get("x-forwarded-for")?.split(",") ?? [];
  return hops[hops.length - 1]?.trim() || DIRECT_CLIENT_KEY;
}
