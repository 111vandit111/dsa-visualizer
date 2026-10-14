import { Skeleton } from "@/components/ui/skeleton";

export function QuestionFormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading question" className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-56 w-full rounded-lg" />
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}
