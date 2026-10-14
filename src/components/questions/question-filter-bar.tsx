import { SearchIcon } from "lucide-react";
import { TagChip } from "@/components/shared/tag-chip";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DIFFICULTIES, type Difficulty, type TagFacet } from "@/lib/types/question";

const ALL_VALUE = "all";
const DIFFICULTY_OPTIONS: readonly string[] = [ALL_VALUE, ...DIFFICULTIES];

interface QuestionFilterBarProps {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  difficulty: Difficulty | undefined;
  onDifficultyChange: (difficulty: Difficulty | undefined) => void;
  tagOptions: TagFacet[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
}

function toDifficulty(value: string): Difficulty | undefined {
  return DIFFICULTIES.find((option) => option === value);
}

export function QuestionFilterBar({
  searchText,
  onSearchTextChange,
  difficulty,
  onDifficultyChange,
  tagOptions,
  activeTags,
  onToggleTag,
}: QuestionFilterBarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            data-testid="search-input"
            aria-label="Search questions"
            placeholder="Search questions..."
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={1}
          aria-label="Filter by difficulty"
          value={difficulty ?? ALL_VALUE}
          onValueChange={(value) => {
            if (DIFFICULTY_OPTIONS.includes(value)) onDifficultyChange(toDifficulty(value));
          }}
        >
          {DIFFICULTY_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              data-testid={`difficulty-filter-${option}`}
              className="font-mono text-xs data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              {option === ALL_VALUE ? "All" : option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {tagOptions.length > 0 ? (
        <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
          {tagOptions.map(({ tag }) => (
            <span key={tag} data-testid={`tag-filter-${tag}`} className="inline-flex">
              <TagChip
                tag={tag}
                isActive={activeTags.includes(tag)}
                onClick={() => onToggleTag(tag)}
              />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
