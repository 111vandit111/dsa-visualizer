import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <p className="micro-label">Error 404</p>
      <h1 className="font-display text-5xl tracking-tight sm:text-7xl">
        Off the <span className="text-primary text-glow">trace</span>
      </h1>
      <p className="max-w-md text-muted-foreground">
        That page does not exist. It may have moved or never been written.
      </p>
      <Button asChild>
        <Link href="/">Back to questions</Link>
      </Button>
    </div>
  );
}
