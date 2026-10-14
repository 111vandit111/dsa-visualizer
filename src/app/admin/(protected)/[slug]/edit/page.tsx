import { Suspense } from "react";
import type { Metadata } from "next";
import { EditQuestionClient } from "@/components/admin/edit-question-client";
import { QuestionFormSkeleton } from "@/components/admin/question-form-skeleton";

export const metadata: Metadata = { title: "Edit question" };

export default function EditQuestionPage(props: PageProps<"/admin/[slug]/edit">) {
  return (
    <Suspense fallback={<QuestionFormSkeleton />}>
      <EditQuestionClient params={props.params} />
    </Suspense>
  );
}
