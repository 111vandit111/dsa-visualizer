import { cookies } from "next/headers";
import { handleError, ok } from "@/lib/api/response";
import { ADMIN_COOKIE_NAME } from "@/lib/auth/session";

// Idempotent and intentionally unauthenticated: clearing a cookie grants nothing.
export async function POST() {
  try {
    (await cookies()).set(ADMIN_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return ok({ isAuthenticated: false });
  } catch (error) {
    return handleError(error, "POST /api/admin/logout");
  }
}
