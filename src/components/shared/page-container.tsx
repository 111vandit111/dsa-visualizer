import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  isWide?: boolean;
}

export function PageContainer({ children, className, isWide = false }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        isWide ? "max-w-[1800px]" : "max-w-7xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
