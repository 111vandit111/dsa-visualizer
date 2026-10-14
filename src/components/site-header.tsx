"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Questions" },
  { href: "/admin", label: "Admin" },
] as const;

function isActivePath(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center font-display text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-md"
    >
      <span className="text-primary text-glow">&gt;_</span> DSA Visualizer
    </Link>
  );
}

// usePathname() is dynamic data under cacheComponents, so it lives inside Suspense;
// the fallback renders the same nav without an active state.
function HeaderNavContent({ pathname }: { pathname: string | null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
        {NAV_LINKS.map((link) => (
          <Button
            key={link.href}
            asChild
            variant="ghost"
            className={cn(
              isActivePath(pathname, link.href) && "text-primary",
            )}
          >
            <Link
              href={link.href}
              aria-current={
                isActivePath(pathname, link.href) ? "page" : undefined
              }
            >
              {link.label}
            </Link>
          </Button>
        ))}
      </nav>
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label="Open menu"
          >
            <MenuIcon />
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetTitle className="px-4 pt-4 font-display">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation
          </SheetDescription>
          <nav aria-label="Mobile" className="flex flex-col gap-1 p-4">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={cn(
                  "justify-start",
                  isActivePath(pathname, link.href) && "text-primary",
                )}
              >
                <Link href={link.href} onClick={() => setIsMenuOpen(false)}>
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

function HeaderNav() {
  return <HeaderNavContent pathname={usePathname()} />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Wordmark />
        <Suspense fallback={<HeaderNavContent pathname={null} />}>
          <HeaderNav />
        </Suspense>
      </div>
    </header>
  );
}
