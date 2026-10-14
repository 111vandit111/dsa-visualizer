import Link from "next/link";
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { TagChip } from "@/components/shared/tag-chip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QuestionSummary } from "@/lib/types/question";

interface RowsProps {
  items: QuestionSummary[];
  onDelete: (question: QuestionSummary) => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatUpdated(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag}>
          <TagChip tag={tag} />
        </li>
      ))}
    </ul>
  );
}

function RowActions({ question, onDelete }: { question: QuestionSummary; onDelete: RowsProps["onDelete"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/${question.slug}/edit`} aria-label={`Edit ${question.title}`}>
          <PencilIcon data-icon="inline-start" />
          Edit
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/q/${question.slug}`} aria-label={`View ${question.title}`}>
          <EyeIcon data-icon="inline-start" />
          View
        </Link>
      </Button>
      <Button
        variant="destructive"
        size="sm"
        data-testid={`admin-delete-${question.slug}`}
        aria-label={`Delete ${question.title}`}
        onClick={() => onDelete(question)}
      >
        <Trash2Icon data-icon="inline-start" />
        Delete
      </Button>
    </div>
  );
}

export function QuestionTable({ items, onDelete }: RowsProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((question) => (
            <TableRow key={question.slug} data-testid={`admin-row-${question.slug}`}>
              <TableCell className="max-w-64 font-medium whitespace-normal [overflow-wrap:anywhere]">{question.title}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{question.slug}</TableCell>
              <TableCell>
                <DifficultyBadge difficulty={question.difficulty} />
              </TableCell>
              <TableCell className="whitespace-normal">
                <TagList tags={question.tags} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatUpdated(question.updatedAt)}</TableCell>
              <TableCell>
                <RowActions question={question} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function QuestionCardList({ items, onDelete }: RowsProps) {
  return (
    <ul className="space-y-3">
      {items.map((question) => (
        <li
          key={question.slug}
          data-testid={`admin-row-${question.slug}`}
          className="space-y-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DifficultyBadge difficulty={question.difficulty} />
            <span className="micro-label">{formatUpdated(question.updatedAt)}</span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold [overflow-wrap:anywhere]">{question.title}</p>
            <p className="font-mono text-xs break-all text-muted-foreground">{question.slug}</p>
          </div>
          <TagList tags={question.tags} />
          <RowActions question={question} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
