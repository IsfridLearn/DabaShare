import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

// One family, two widths: Instrument Sans at normal width for reading, and
// its condensed width (the wdth axis) for titles and labels.
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  axes: ["wdth"],
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
    { media: "(prefers-color-scheme: light)", color: "#f5f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#121311" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script may add the "dark" class
    // before React hydrates, which is intended.
    <html lang="en" className={`${instrument.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Static, trusted script (no user input): applies the saved theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
