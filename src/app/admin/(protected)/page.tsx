import type { Metadata } from "next";
import { AdminQuestionList } from "@/components/admin/admin-question-list";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <>
      <AdminPageHeader title="Questions" description="Create, edit and delete the questions shown on the home page." />
      <AdminQuestionList />
    </>
  );
}
