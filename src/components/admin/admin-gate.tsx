import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin";

/** UX guard only: while streaming, redirect() is a meta refresh. The API's 401 is the real protection. */
export async function AdminGate({ children }: { children: ReactNode }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return children;
}
