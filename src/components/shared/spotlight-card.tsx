"use client";

import type { PointerEvent, ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}

export function SpotlightCard({ children, className, as: Tag = "div" }: SpotlightCardProps) {
  const shouldReduceMotion = useReducedMotion();

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (shouldReduceMotion) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };

  return (
    <Tag
      onPointerMove={handlePointerMove}
      className={cn(
        "group/spotlight surface-hairline relative overflow-hidden rounded-xl border border-border bg-card p-5",
        className,
      )}
    >
      {shouldReduceMotion ? null : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
          style={{
            background:
              "radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklch, var(--primary) 14%, transparent), transparent 70%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </Tag>
  );
}
