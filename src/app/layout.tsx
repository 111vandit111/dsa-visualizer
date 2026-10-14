import type { Metadata } from "next";
import { Geist, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AmbientBackground } from "@/components/ambient-background";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

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

export const metadata: Metadata = {
  title: {
    default: "DSA Visualizer",
    template: "%s · DSA Visualizer",
  },
  description:
    "Step through data structure and algorithm solutions line by line and watch every variable change.",
};

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
            <p className="micro-label mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              DSA Visualizer · your code runs only in your browser
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
