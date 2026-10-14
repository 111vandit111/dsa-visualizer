"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </MotionConfig>
  );
}
