import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DabaShare – Learn Together, Grow Together",
    template: "%s · DabaShare",
  },
  description:
    "Connect with students across Davao City universities. Exchange skills, find tutors, and build a collaborative learning community.",
};

// "resizes-content" makes 100dvh shrink when the on-screen keyboard opens
// (Chrome Android), so the chat composer stays visible while typing.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script may add the "dark" class
    // before React hydrates, which is intended.
    <html lang="en" className={`${sora.variable} ${dmSans.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Static, trusted script (no user input): applies the saved theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
