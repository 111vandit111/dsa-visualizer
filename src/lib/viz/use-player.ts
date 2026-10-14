"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { BASE_STEP_MS, DEFAULT_SPEED, PLAYER_SPEEDS, type PlayerSpeed } from "./constants";
import { initialPlayerState, playerReducer, type PlayerAction, type PlayerEvent } from "./player-state";

export interface PlayerControls {
  seek: (index: number) => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: PlayerSpeed) => void;
  faster: () => void;
  slower: () => void;
}

export interface Player {
  stepIndex: number;
  stepCount: number;
  isPlaying: boolean;
  speed: PlayerSpeed;
  controls: PlayerControls;
}

function neighbourSpeed(speed: PlayerSpeed, delta: number): PlayerSpeed {
  const position = PLAYER_SPEEDS.indexOf(speed) + delta;
  return PLAYER_SPEEDS[Math.min(Math.max(position, 0), PLAYER_SPEEDS.length - 1)];
}

/**
 * Playback position over a trace of `stepCount` steps. `owner` identifies the trace: when it changes the
 * position resets to step 0 and playback stops. Timers are cleared on pause, change and unmount.
 */
export function usePlayer(stepCount: number, owner: unknown): Player {
  const lastIndex = stepCount - 1;
  const [state, dispatchEvent] = useReducer(playerReducer, owner, initialPlayerState);
  const [speed, setSpeed] = useState<PlayerSpeed>(DEFAULT_SPEED);

  const isCurrent = state.owner === owner;
  const stepIndex = isCurrent ? Math.min(state.index, Math.max(lastIndex, 0)) : 0;
  const isPlaying = isCurrent && state.isPlaying && lastIndex > 0;

  const dispatch = useCallback(
    (action: PlayerAction) => dispatchEvent({ action, owner, lastIndex } satisfies PlayerEvent),
    [owner, lastIndex],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => dispatch({ type: "tick" }), BASE_STEP_MS / speed);
    return () => window.clearTimeout(timer);
  }, [isPlaying, speed, stepIndex, dispatch]);

  const controls = useMemo<PlayerControls>(
    () => ({
      seek: (index) => dispatch({ type: "seek", index }),
      next: () => dispatch({ type: "step", delta: 1 }),
      prev: () => dispatch({ type: "step", delta: -1 }),
      first: () => dispatch({ type: "first" }),
      last: () => dispatch({ type: "last" }),
      play: () => dispatch({ type: "play" }),
      pause: () => dispatch({ type: "pause" }),
      toggle: () => dispatch({ type: "toggle" }),
      setSpeed,
      faster: () => setSpeed((current) => neighbourSpeed(current, 1)),
      slower: () => setSpeed((current) => neighbourSpeed(current, -1)),
    }),
    [dispatch],
  );

  return { stepIndex, stepCount: Math.max(stepCount, 0), isPlaying, speed, controls };
}
