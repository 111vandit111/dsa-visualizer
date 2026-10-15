import Link from "next/link";
import { connection } from "next/server";
import { listSeoEntries, type SeoEntry } from "@/lib/seo/data";
import { questionPath } from "@/lib/seo/site";
import { KIND_LABELS, QUESTION_KINDS } from "@/lib/types/question";

const LINK_CLASS =
  "inline-flex max-w-full items-center gap-2 py-1 text-muted-foreground transition-colors hover:text-foreground max-sm:min-h-11";

function EntryList({ entries }: { entries: SeoEntry[] }) {
  return (
    <ul className="columns-1 gap-x-8 text-sm sm:columns-2 lg:columns-3">
      {entries.map((entry) => (
        <li key={entry.slug} className="break-inside-avoid">
          <Link href={questionPath(entry.slug)} prefetch={false} className={LINK_CLASS}>
            <span className="min-w-0 [overflow-wrap:anywhere]">{entry.title}</span>
            <span className="shrink-0 font-mono text-xs">· {entry.difficulty}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Plain links to every question page, so crawlers can reach them without running the client-side browser. */
export async function QuestionIndexLinks() {
  await connection();
  const entries = await listSeoEntries();
  if (entries.length === 0) return null;

  const groups = QUESTION_KINDS.map((kind) => ({ kind, items: entries.filter((entry) => entry.kind === kind) })).filter(
    (group) => group.items.length > 0,
  );

  return (
    <nav
      aria-label="All algorithms and problems"
      data-testid="question-index-links"
      className="mt-10 space-y-6 border-t border-border py-10"
    >
      <h2 className="font-display text-2xl tracking-tight sm:text-3xl">All algorithms and problems</h2>
      {groups.map((group) => (
        <div key={group.kind} className="space-y-3">
          <h3 className="micro-label">{KIND_LABELS[group.kind].plural}</h3>
          <EntryList entries={group.items} />
        </div>
      ))}
    </nav>
  );
}
