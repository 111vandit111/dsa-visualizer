import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { fail, handleError, ok } from "@/lib/api/response";
import { getClientKey, readJsonBody } from "@/lib/api/request";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { ADMIN_COOKIE_NAME, SESSION_TTL_MS, createSessionToken } from "@/lib/auth/session";
import { getAdminEnv } from "@/lib/env";
import { formatZodIssues } from "@/lib/validation/question";

const MAX_PASSWORD_LENGTH = 200;
const loginSchema = z.object({ password: z.string().min(1).max(MAX_PASSWORD_LENGTH) });

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function isPasswordCorrect(given: string, expected: string): boolean {
  return timingSafeEqual(sha256(given), sha256(expected));
}

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(getClientKey(request));
    if (!limit.isAllowed) {
      const response = fail("rate_limited", "Too many login attempts. Try again soon.", 429);
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }
    const body = loginSchema.safeParse(await readJsonBody(request));
    if (!body.success) return fail("validation_error", "Password is required", 400, formatZodIssues(body.error));
    const env = getAdminEnv();
    if (!isPasswordCorrect(body.data.password, env.ADMIN_PASSWORD)) {
      return fail("unauthorized", "Incorrect password", 401);
    }
    (await cookies()).set(ADMIN_COOKIE_NAME, createSessionToken(env.ADMIN_SESSION_SECRET), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });
    return ok({ isAuthenticated: true });
  } catch (error) {
    return handleError(error, "POST /api/admin/login");
  }
}
