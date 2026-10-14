"use client";

import { useState, type KeyboardEvent } from "react";
import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TagsInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  ariaDescribedBy?: string;
  isInvalid?: boolean;
}

const COMMIT_KEYS = new Set(["Enter", ","]);
const INVALID_TAG_CHARS = /[^a-z0-9-]+/g;

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").replace(INVALID_TAG_CHARS, "").replace(/^-+/, "");
}

export function TagsInput({ id, value, onChange, ariaDescribedBy, isInvalid = false }: TagsInputProps) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const additions = raw.split(",").map(normalizeTag).filter((tag) => tag.length > 0);
    setDraft("");
    if (additions.length === 0) return;
    onChange([...new Set([...value, ...additions])]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (COMMIT_KEYS.has(event.key)) {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Current tags">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 py-0.5 pr-1 pl-2 font-mono text-xs text-primary"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(value.filter((existing) => existing !== tag))}
                className="inline-flex size-5 cursor-pointer items-center justify-center rounded outline-none hover:bg-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:-my-3 max-sm:size-11"
              >
                <XIcon className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        data-testid="form-tags"
        value={draft}
        placeholder="Type a tag, press Enter or comma"
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        aria-invalid={isInvalid}
        aria-describedby={ariaDescribedBy}
      />
    </div>
  );
}
