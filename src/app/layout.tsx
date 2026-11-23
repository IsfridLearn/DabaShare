import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";
import "./globals.css";

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
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
