"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <p className="micro-label">Unexpected error</p>
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
        Something broke
      </h1>
      <p className="max-w-md text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button onClick={() => retry()}>Retry</Button>
    </div>
  );
}
