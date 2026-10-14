"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

/** Returns a handler that sends the user to the login page on an ApiError 401; true when it handled the error. */
export function useUnauthorizedRedirect(): (error: unknown) => boolean {
  const router = useRouter();
  return useCallback(
    (error: unknown) => {
      if (!(error instanceof ApiError) || error.status !== 401) return false;
      toast.error("Your admin session has expired. Please log in again.");
      router.replace("/admin/login");
      return true;
    },
    [router],
  );
}
