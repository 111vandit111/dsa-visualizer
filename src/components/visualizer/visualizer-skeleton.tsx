import { PageContainer } from "@/components/shared/page-container";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading shape of the visualizer page: title row, three panels, transport bar. */
export function VisualizerSkeleton() {
  return (
    <PageContainer isWide className="space-y-4 py-6" >
      <div data-testid="visualizer-skeleton" className="space-y-4" aria-busy="true" aria-label="Loading question">
        <div className="space-y-2">
          <Skeleton className="h-9 w-2/3 max-w-md" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </PageContainer>
  );
}
