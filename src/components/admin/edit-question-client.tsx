"use client";

import { use } from "react";
import Link from "next/link";
import { FileQuestionIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { ApiError, getQuestion } from "@/lib/api/client";
import { AdminPageHeader } from "./admin-page-header";
import { QuestionForm } from "./question-form";
import { valuesFromQuestion } from "./question-form-model";
import { QuestionFormSkeleton } from "./question-form-skeleton";

const HTTP_NOT_FOUND = 404;

export function EditQuestionClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, error, reload } = useAsync((signal) => getQuestion(slug, { signal }), [slug]);

  if (error instanceof ApiError && error.status === HTTP_NOT_FOUND) {
    return (
      <EmptyState
        icon={<FileQuestionIcon />}
        title="Question not found"
        description={`There is no question with the slug "${slug}". It may have been deleted.`}
        action={
          <Button asChild variant="outline">
            <Link href="/admin">Back to questions</Link>
          </Button>
        }
      />
    );
  }
  if (error) return <ErrorState title="Could not load the question" message={error.message} onRetry={reload} />;
  if (!data) return <QuestionFormSkeleton />;

  return (
    <>
      <AdminPageHeader title="Edit question" description={data.title} />
      <QuestionForm key={`${data.id}-${data.updatedAt}`} originalSlug={data.slug} initialValues={valuesFromQuestion(data)} />
    </>
  );
}
