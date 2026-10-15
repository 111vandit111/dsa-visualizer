import { z } from "zod";

const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017/dsa-visualizer";
const MIN_ADMIN_PASSWORD_LENGTH = 8;
const MIN_SESSION_SECRET_LENGTH = 32;

const mongoEnvSchema = z.object({
  MONGODB_URI: z.string().min(1).default(DEFAULT_MONGODB_URI),
});

const adminEnvSchema = z.object({
  ADMIN_PASSWORD: z.string().min(MIN_ADMIN_PASSWORD_LENGTH),
  ADMIN_SESSION_SECRET: z.string().min(MIN_SESSION_SECRET_LENGTH),
});

export type MongoEnv = z.infer<typeof mongoEnvSchema>;
export type AdminEnv = z.infer<typeof adminEnvSchema>;

function parseEnv<T extends z.ZodType>(schema: T, source: NodeJS.ProcessEnv): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
  throw new Error(`Invalid environment: check ${names.join(", ")} (see .env.example)`);
}

// Validation runs on call, never at import, so `next build` works without env vars.
export function getMongoEnv(): MongoEnv {
  return parseEnv(mongoEnvSchema, process.env);
}

export function getAdminEnv(): AdminEnv {
  return parseEnv(adminEnvSchema, process.env);
}

// Forwarded-for headers are client-controlled unless a trusted proxy overwrites them.
export function isProxyTrusted(): boolean {
  return process.env.TRUST_PROXY === "true";
}

export const DEFAULT_SITE_URL = "https://dsa-visualizer-gamma-six.vercel.app";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function toOrigin(candidate: string): string | undefined {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

// Public origin used in canonical URLs, sitemap and JSON-LD. Never throws: a bad value falls back to the default.
export function getSiteUrl(): string {
  const explicit = readEnv("NEXT_PUBLIC_SITE_URL");
  const vercelHost = readEnv("VERCEL_PROJECT_PRODUCTION_URL");
  const candidates = [explicit, vercelHost ? `https://${vercelHost}` : undefined];
  for (const candidate of candidates) {
    const origin = candidate ? toOrigin(candidate) : undefined;
    if (origin) return origin;
  }
  return DEFAULT_SITE_URL;
}

export function getVerification(): { google?: string; bing?: string } {
  return { google: readEnv("GOOGLE_SITE_VERIFICATION"), bing: readEnv("BING_SITE_VERIFICATION") };
}
