import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { AmbientBackground } from "@/components/ambient-background";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { getSiteUrl, getVerification } from "@/lib/env";
import { BRAND_COLORS, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE } from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const DEFAULT_TITLE = SITE_TITLE;
const verification = getVerification();

// No canonical or openGraph.url here: every page sets its own, and a page-level openGraph replaces this one.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    ...(verification.google ? { google: verification.google } : {}),
    ...(verification.bing ? { other: { "msvalidate.01": verification.bing } } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLORS.background,
  colorScheme: "dark",
};

const FOOTER_LINK =
  "micro-label inline-flex items-center transition-colors hover:text-foreground max-sm:min-h-11";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AmbientBackground />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-x-6 gap-y-2 px-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p className="micro-label">DSA Visualizer · your code runs only in your browser</p>
              <nav aria-label="Footer">
                <ul className="flex flex-wrap items-center gap-x-5">
                  <li>
                    <Link href="/" className={FOOTER_LINK}>
                      Algorithms
                    </Link>
                  </li>
                  <li>
                    <a href="/sitemap.xml" className={FOOTER_LINK}>
                      Sitemap
                    </a>
                  </li>
                  <li>
                    <a href="/llms.txt" className={FOOTER_LINK}>
                      llms.txt
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
