import { cookies } from "next/headers";
import { fail } from "@/lib/api/response";
import { getAdminEnv } from "@/lib/env";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "./session";

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  const dateNow = Date.now();
  if (!token) return false;
  return verifySessionToken(token, getAdminEnv().ADMIN_SESSION_SECRET, dateNow);
}

export async function requireAdmin(): Promise<Response | null> {
  if (await isAdminAuthenticated()) return null;
  return fail("unauthorized", "Admin login required", 401);
}
