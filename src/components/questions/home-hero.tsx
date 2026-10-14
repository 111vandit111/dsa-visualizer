import { HeroCellStrip } from "./hero-cell-strip";

export function HomeHero() {
  return (
    <section className="space-y-6 pb-10 sm:pb-14">
      <p className="micro-label">Step-through debugger for DSA</p>
      <h1 className="font-display text-5xl tracking-tight text-balance sm:text-7xl">
        Watch your algorithm <span className="text-primary text-glow">think</span>.
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Pick a problem, press play, and follow the solution line by line while heaps, maps and
        arrays change right in front of you. Your code runs only in your browser.
      </p>
      <HeroCellStrip />
    </section>
  );
}
