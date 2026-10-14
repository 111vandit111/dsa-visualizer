import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { PageContainer } from "@/components/shared/page-container";

export const metadata: Metadata = { title: "Admin login" };

export default function AdminLoginPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <LoginForm />
    </PageContainer>
  );
}
