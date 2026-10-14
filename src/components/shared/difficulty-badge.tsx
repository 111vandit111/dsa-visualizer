import { Badge } from "@/components/ui/badge";
import type { Difficulty } from "@/lib/types/question";
import { cn } from "@/lib/utils";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Easy: "bg-easy/10 text-easy",
  Medium: "bg-medium/10 text-medium",
  Hard: "bg-hard/10 text-hard",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge
      variant="ghost"
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.14em]",
        DIFFICULTY_STYLES[difficulty],
      )}
    >
      {difficulty}
    </Badge>
  );
}
