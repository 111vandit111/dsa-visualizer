import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { QuestionForm } from "@/components/admin/question-form";

export const metadata: Metadata = { title: "New question" };

export default function NewQuestionPage() {
  return (
    <>
      <AdminPageHeader title="New question" description="Add a problem, its solution and its test cases." />
      <QuestionForm />
    </>
  );
}
