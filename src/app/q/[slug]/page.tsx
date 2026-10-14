import { Suspense } from "react";
import { QuestionVisualizer } from "@/components/visualizer/question-visualizer";
import { VisualizerSkeleton } from "@/components/visualizer/visualizer-skeleton";

export default function Page(props: PageProps<"/q/[slug]">) {
  return (
    <Suspense fallback={<VisualizerSkeleton />}>
      <QuestionVisualizer params={props.params} />
    </Suspense>
  );
}
