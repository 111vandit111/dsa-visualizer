"use client";

import { useSyncExternalStore } from "react";

/** Client-only (server snapshot is false); render it only behind client-fetched data to avoid hydration mismatches. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
