export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="bg-dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="absolute -top-40 left-1/2 h-80 w-[min(60rem,120vw)] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
    </div>
  );
}
