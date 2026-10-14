"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const CodeEditor = dynamic(() => import("./code-editor-impl"), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-lg" />,
});
