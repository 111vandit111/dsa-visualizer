/** Base delay between steps at 1x speed. */
export const BASE_STEP_MS = 700;
export const PLAYER_SPEEDS = [0.5, 1, 2, 4] as const;
export type PlayerSpeed = (typeof PLAYER_SPEEDS)[number];
export const DEFAULT_SPEED: PlayerSpeed = 1;

export const VIZ_LIMITS = {
  /** Deepest nesting of containers inside containers before a value is shown as a summary only. */
  maxNestDepth: 6,
  /** Containers nested less deeply than this start expanded. */
  autoExpandDepth: 3,
  maxTreeNodes: 63,
  maxHeapTreeNodes: 31,
  maxListNodes: 50,
  /** Hard cap inside the tree layout (callers cap lower). */
  maxLayoutNodes: 512,
  /** Items listed in a one-line summary. */
  maxSummaryItems: 4,
  maxLabelChars: 10,
  maxStringChars: 24,
  /** Maximum nodes drawn in a graph view. */
  maxGraphNodes: 40,
  /** Maximum edges drawn in a graph view. */
  maxGraphEdges: 120,
  /** Pointer chips shown per cell before collapsing to "+n". */
  maxPointerTags: 3,
  /** Maximum path sequences listed per step. */
  maxPathSequences: 6,
  /** Maximum stops kept per path sequence. */
  maxPathPoints: 64,
  /** Maximum points kept per reached/visited set. */
  maxReachPoints: 200,
  /** Maximum bars drawn in a bar view. */
  maxBars: 60,
} as const;
