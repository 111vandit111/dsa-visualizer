import type { Transition, Variants } from "framer-motion";

export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34 },
  soft: { type: "spring", stiffness: 260, damping: 30 },
} as const satisfies Record<string, Transition>;

const FADE_DURATION_S = 0.2;
const STAGGER_DELAY_S = 0.05;
const FADE_OFFSET_PX = 8;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: FADE_OFFSET_PX },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: FADE_DURATION_S, ease: "easeOut" },
  },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_DELAY_S } },
};
