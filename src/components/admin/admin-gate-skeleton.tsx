import { Skeleton } from "@/components/ui/skeleton";

export function AdminGateSkeleton() {
  return (
    <div aria-busy="true" aria-label="Checking admin session" className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}
