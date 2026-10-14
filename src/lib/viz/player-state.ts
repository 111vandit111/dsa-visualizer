export interface PlayerState {
  /** Identity of the trace this position belongs to: a new trace starts again at step 0. */
  owner: unknown;
  index: number;
  isPlaying: boolean;
}

export type PlayerAction =
  | { type: "seek"; index: number }
  | { type: "step"; delta: number }
  | { type: "first" }
  | { type: "last" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "tick" };

export interface PlayerEvent {
  action: PlayerAction;
  owner: unknown;
  /** Index of the last step (stepCount - 1); -1 when there is no trace. */
  lastIndex: number;
}

export function initialPlayerState(owner: unknown): PlayerState {
  return { owner, index: 0, isPlaying: false };
}

function clampIndex(index: number, lastIndex: number): number {
  return Math.min(Math.max(index, 0), Math.max(lastIndex, 0));
}

function withIndex(state: PlayerState, index: number, lastIndex: number): PlayerState {
  const next = clampIndex(index, lastIndex);
  return { ...state, index: next, isPlaying: state.isPlaying && next < lastIndex };
}

function play(state: PlayerState, lastIndex: number): PlayerState {
  if (lastIndex <= 0) return { ...state, isPlaying: false };
  // Playing from the end replays the trace.
  return { ...state, index: state.index >= lastIndex ? 0 : state.index, isPlaying: true };
}

/** Pure transition function: all positions stay inside [0, lastIndex] and playback auto-pauses at the end. */
export function playerReducer(state: PlayerState, event: PlayerEvent): PlayerState {
  const current = state.owner === event.owner ? state : initialPlayerState(event.owner);
  const { action, lastIndex } = event;
  switch (action.type) {
    case "seek":
      return withIndex({ ...current, isPlaying: false }, action.index, lastIndex);
    case "step":
      return withIndex({ ...current, isPlaying: false }, current.index + action.delta, lastIndex);
    case "first":
      return withIndex({ ...current, isPlaying: false }, 0, lastIndex);
    case "last":
      return withIndex({ ...current, isPlaying: false }, lastIndex, lastIndex);
    case "play":
      return play(current, lastIndex);
    case "pause":
      return { ...current, isPlaying: false };
    case "toggle":
      return current.isPlaying ? { ...current, isPlaying: false } : play(current, lastIndex);
    case "tick":
      return current.isPlaying ? withIndex(current, current.index + 1, lastIndex) : current;
  }
}
