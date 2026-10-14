"use client";

import { useEffect } from "react";
import type { PlayerControls } from "./use-player";
import { actionForKey, classifyTarget, type ShortcutAction } from "./shortcuts";

const RUN_ACTION: Record<ShortcutAction, (controls: PlayerControls) => void> = {
  toggle: (controls) => controls.toggle(),
  prev: (controls) => controls.prev(),
  next: (controls) => controls.next(),
  first: (controls) => controls.first(),
  last: (controls) => controls.last(),
  faster: (controls) => controls.faster(),
  slower: (controls) => controls.slower(),
};

/** Marks the part of the page whose buttons give focus back after a mouse click (see usePlayerShortcuts). */
export const PLAYER_ZONE_PROPS = { "data-player-zone": "" } as const;
const PLAYER_ZONE_SELECTOR = "[data-player-zone]";

/**
 * Space play/pause, arrows step, Home/End jump, Up/Down change speed. Ignored while typing in an input or editor.
 * A button inside the player zone is blurred after a mouse click so that Space then plays instead of re-pressing
 * that button; keyboard users who Tab to a button keep its native Space/Enter behaviour.
 */
export function usePlayerShortcuts(controls: PlayerControls, isEnabled: boolean): void {
  useEffect(() => {
    if (!isEnabled) return;
    const onClick = (event: MouseEvent) => {
      const isPointerClick = event.detail > 0;
      const button = event.target instanceof Element ? event.target.closest("button") : null;
      if (isPointerClick && button?.closest(PLAYER_ZONE_SELECTOR)) button.blur();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      const action = actionForKey(event.key, classifyTarget(event.target), hasModifier);
      if (!action) return;
      event.preventDefault();
      RUN_ACTION[action](controls);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [controls, isEnabled]);
}
