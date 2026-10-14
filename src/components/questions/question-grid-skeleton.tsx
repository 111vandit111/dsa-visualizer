import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_CARD_COUNT = 6;

export function QuestionGridSkeleton({ count = SKELETON_CARD_COUNT }: { count?: number }) {
  return (
    <ul
      aria-busy="true"
      aria-label="Loading questions"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-16" />
          </div>
        </li>
      ))}
    </ul>
  );
}
