import { describe, expect, it } from "vitest";
import { initialPlayerState, playerReducer, type PlayerAction, type PlayerState } from "./player-state";

const OWNER = {};
const LAST = 4;

function run(state: PlayerState, ...actions: PlayerAction[]): PlayerState {
  return actions.reduce((current, action) => playerReducer(current, { action, owner: OWNER, lastIndex: LAST }), state);
}

describe("playerReducer", () => {
  const start = initialPlayerState(OWNER);

  it("clamps seeks and steps to the trace", () => {
    expect(run(start, { type: "seek", index: 99 }).index).toBe(LAST);
    expect(run(start, { type: "step", delta: -1 }).index).toBe(0);
    expect(run(start, { type: "step", delta: 1 }, { type: "step", delta: 1 }).index).toBe(2);
    expect(run(start, { type: "last" }, { type: "first" }).index).toBe(0);
  });

  it("auto-pauses on the last step", () => {
    const playing = run(start, { type: "play" });
    expect(playing.isPlaying).toBe(true);
    const ended = run(playing, { type: "seek", index: 3 }, { type: "play" }, { type: "tick" });
    expect(ended.index).toBe(LAST);
    expect(ended.isPlaying).toBe(false);
  });

  it("replays from the start when played at the end", () => {
    const replay = run(start, { type: "last" }, { type: "play" });
    expect(replay).toMatchObject({ index: 0, isPlaying: true });
  });

  it("pauses when the user steps or seeks", () => {
    expect(run(start, { type: "play" }, { type: "step", delta: 1 }).isPlaying).toBe(false);
    expect(run(start, { type: "play" }, { type: "seek", index: 2 }).isPlaying).toBe(false);
  });

  it("toggles and ignores ticks while paused", () => {
    expect(run(start, { type: "toggle" }).isPlaying).toBe(true);
    expect(run(start, { type: "toggle" }, { type: "toggle" }).isPlaying).toBe(false);
    expect(run(start, { type: "tick" }).index).toBe(0);
  });

  it("does not play an empty or single-step trace", () => {
    const single = playerReducer(start, { action: { type: "play" }, owner: OWNER, lastIndex: 0 });
    expect(single.isPlaying).toBe(false);
    const empty = playerReducer(start, { action: { type: "seek", index: 3 }, owner: OWNER, lastIndex: -1 });
    expect(empty.index).toBe(0);
  });

  it("starts over when the trace changes", () => {
    const moved = run(start, { type: "seek", index: 3 });
    const fresh = playerReducer(moved, { action: { type: "step", delta: 1 }, owner: {}, lastIndex: LAST });
    expect(fresh.index).toBe(1);
  });
});
