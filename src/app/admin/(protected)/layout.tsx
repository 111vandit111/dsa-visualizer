import { Suspense } from "react";
import { AdminGate } from "@/components/admin/admin-gate";
import { AdminGateSkeleton } from "@/components/admin/admin-gate-skeleton";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { PageContainer } from "@/components/shared/page-container";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <PageContainer className="py-8 sm:py-10">
      <AdminToolbar />
      <Suspense fallback={<AdminGateSkeleton />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </PageContainer>
  );
}
