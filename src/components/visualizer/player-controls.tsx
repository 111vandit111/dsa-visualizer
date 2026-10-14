"use client";

import { ChevronFirstIcon, ChevronLastIcon, KeyboardIcon, PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAYER_SPEEDS, type PlayerSpeed } from "@/lib/viz/constants";
import type { Player } from "@/lib/viz/use-player";

const SHORTCUTS = [
  ["Space", "play / pause"],
  ["← →", "step back / forward"],
  ["Home End", "first / last step"],
  ["↑ ↓", "faster / slower"],
] as const;

const COMPACT_QUERY = "(max-width: 639px)";

function parseSpeed(value: string): PlayerSpeed | null {
  return PLAYER_SPEEDS.find((speed) => String(speed) === value) ?? null;
}

function nextSpeed(speed: PlayerSpeed): PlayerSpeed {
  return PLAYER_SPEEDS[(PLAYER_SPEEDS.indexOf(speed) + 1) % PLAYER_SPEEDS.length];
}

function ShortcutHint({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" className={className}>
          <KeyboardIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex-col items-start">
        {SHORTCUTS.map(([keys, action]) => (
          <span key={keys} className="font-mono">
            <kbd className="font-semibold">{keys}</kbd> {action}
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

interface SpeedControlProps {
  speed: PlayerSpeed;
  onChange: (speed: PlayerSpeed) => void;
  className?: string;
}

/**
 * Speed segments. Below `sm` only the selected segment is shown, as one compact button that cycles through
 * the speeds when pressed (pressing the selected segment deselects it, which is the cycle signal there).
 */
function SpeedControl({ speed, onChange, className }: SpeedControlProps) {
  return (
    <ToggleGroup
      data-testid="player-speed"
      type="single"
      variant="outline"
      aria-label="Playback speed"
      value={String(speed)}
      onValueChange={(value) => {
        const next = parseSpeed(value);
        if (next) onChange(next);
        else if (window.matchMedia(COMPACT_QUERY).matches) onChange(nextSpeed(speed));
      }}
      className={className}
    >
      {PLAYER_SPEEDS.map((option) => (
        <ToggleGroupItem
          key={option}
          value={String(option)}
          aria-label={`${option}x speed`}
          className="font-mono text-xs max-sm:data-[state=off]:hidden"
        >
          {option}x
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

interface PlayerControlsProps {
  player: Player;
  isDisabled: boolean;
}

/**
 * Transport bar meant to stick to the viewport bottom. Two rows on every width: below `sm` the buttons and speed
 * are on top and the scrubber, "12 / 140" label and shortcut hint below; from `sm` the scrubber has its own row.
 */
export function PlayerControls({ player, isDisabled }: PlayerControlsProps) {
  const { stepIndex, stepCount, isPlaying, speed, controls } = player;
  const isEmpty = isDisabled || stepCount === 0;
  const lastIndex = Math.max(stepCount - 1, 0);
  return (
    <div
      className="flex flex-col gap-1 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1"
      role="group"
      aria-label="Playback controls"
    >
      <div className="flex items-center justify-between sm:contents">
        <div className="flex items-center gap-0.5 sm:order-2 sm:gap-1">
          <Button data-testid="player-first" variant="ghost" size="icon" aria-label="First step" disabled={isEmpty} onClick={controls.first}>
            <ChevronFirstIcon />
          </Button>
          <Button data-testid="player-prev" variant="ghost" size="icon" aria-label="Previous step" disabled={isEmpty} onClick={controls.prev}>
            <SkipBackIcon />
          </Button>
          <Button
            data-testid="player-play"
            size="icon"
            aria-label={isPlaying ? "Pause" : "Play"}
            aria-pressed={isPlaying}
            disabled={isEmpty || stepCount < 2}
            onClick={controls.toggle}
            className="glow-primary"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </Button>
          <Button data-testid="player-next" variant="ghost" size="icon" aria-label="Next step" disabled={isEmpty} onClick={controls.next}>
            <SkipForwardIcon />
          </Button>
          <Button data-testid="player-last" variant="ghost" size="icon" aria-label="Last step" disabled={isEmpty} onClick={controls.last}>
            <ChevronLastIcon />
          </Button>
        </div>
        <SpeedControl speed={speed} onChange={controls.setSpeed} className="sm:order-4 sm:ml-auto" />
      </div>
      <div className="flex items-center gap-2 sm:contents">
        <Slider
          data-testid="player-scrubber"
          aria-label="Step scrubber"
          className="h-11 min-w-0 flex-1 sm:order-1 sm:h-6 sm:w-full sm:flex-none sm:basis-full"
          min={0}
          max={lastIndex}
          step={1}
          value={[stepIndex]}
          disabled={isEmpty || stepCount < 2}
          onValueChange={([value]) => controls.seek(value)}
        />
        <p
          data-testid="player-step-label"
          aria-live="off"
          className="min-w-[8ch] shrink-0 text-right font-mono text-sm tabular-nums text-primary text-glow sm:order-3 sm:text-left"
        >
          {isEmpty ? "0 / 0" : `${stepIndex + 1} / ${stepCount}`}
        </p>
        <ShortcutHint className="shrink-0 sm:order-5" />
      </div>
    </div>
  );
}
