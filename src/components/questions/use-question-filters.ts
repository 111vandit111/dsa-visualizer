"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DIFFICULTIES, type Difficulty } from "@/lib/types/question";

export const SEARCH_DEBOUNCE_MS = 250;

export interface QuestionFilters {
  q: string;
  difficulty: Difficulty | undefined;
  tags: string[];
  page: number;
}

function parseFilters(params: URLSearchParams): QuestionFilters {
  const difficultyRaw = params.get("difficulty");
  const page = Number.parseInt(params.get("page") ?? "", 10);
  return {
    q: params.get("q")?.trim() ?? "",
    difficulty: DIFFICULTIES.find((value) => value === difficultyRaw),
    tags: (params.get("tags") ?? "").split(",").filter((tag) => tag.length > 0),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

function buildUrl(pathname: string, filters: QuestionFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function hasActiveFilters(filters: QuestionFilters): boolean {
  return filters.q !== "" || filters.difficulty !== undefined || filters.tags.length > 0;
}

/** Filters live in the URL so a filtered list is shareable; the search box is debounced before it reaches the URL. */
export function useQuestionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const [searchText, setSearchText] = useState(filters.q);

  const update = useCallback(
    (patch: Partial<QuestionFilters>) => {
      router.replace(buildUrl(pathname, { ...filters, page: 1, ...patch }), { scroll: false });
    },
    [router, pathname, filters],
  );

  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed === filters.q) return;
    const timer = setTimeout(() => update({ q: trimmed }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText, filters.q, update]);

  const clear = useCallback(() => {
    setSearchText("");
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const toggleTag = useCallback(
    (tag: string) => {
      const tags = filters.tags.includes(tag)
        ? filters.tags.filter((active) => active !== tag)
        : [...filters.tags, tag];
      update({ tags });
    },
    [filters.tags, update],
  );

  return { filters, searchText, setSearchText, update, toggleTag, clear };
}
