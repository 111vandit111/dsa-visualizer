"use client";

import { useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.7;

/** Scale factor (0.7 to 1) that makes content of `contentWidth` px fit its container; beyond that the container scrolls. */
export function useFitScale(contentWidth: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setAvailableWidth(entries[0]?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fit = availableWidth > 0 && contentWidth > 0 ? availableWidth / contentWidth : 1;
  return { containerRef, scale: Math.min(1, Math.max(MIN_SCALE, fit)) };
}
