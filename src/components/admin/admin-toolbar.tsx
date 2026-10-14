"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, LogOutIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminLogout } from "@/lib/api/client";

export function AdminToolbar() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminLogout();
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div>
        <p className="micro-label">Admin</p>
        <p className="font-display text-xl">Question manager</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild data-testid="admin-new-question">
          <Link href="/admin/new">
            <PlusIcon data-icon="inline-start" />
            New question
          </Link>
        </Button>
        <Button
          variant="outline"
          data-testid="admin-logout"
          disabled={isLoggingOut}
          onClick={handleLogout}
        >
          {isLoggingOut ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <LogOutIcon data-icon="inline-start" />}
          Logout
        </Button>
      </div>
    </div>
  );
}
