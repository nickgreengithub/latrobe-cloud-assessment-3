import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteShell } from "@/components/SiteShell";
import { STUDENT } from "@/lib/student";
import "./globals.css";

// Self-hosted Alliance fonts. next/font emits them as hashed assets and exposes
// CSS variables, so they resolve correctly under the GitHub Pages base path.
const allianceNo1 = localFont({
  src: [
    { path: "./fonts/alliance-no1-light.woff2", weight: "300", style: "normal" },
    {
      path: "./fonts/alliance-no1-regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-1",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const allianceNo2 = localFont({
  src: [
    { path: "./fonts/alliance-no2-light.woff2", weight: "300", style: "normal" },
  ],
  variable: "--font-2",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: STUDENT.assessmentTitle,
  description:
    "An RSS Server feeding into an LMS: Next.js frontend, REST API, Prisma/SQLite database and RSS 2.0 output, running in Docker.",
};

const themeBootScript = `
(function () {
  try {
    var match = document.cookie.match(/(?:^|; )rss_lms_theme=([^;]+)/);
    var theme = match && (match[1] === "light" || match[1] === "dark") ? match[1] : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-AU"
      className={`${allianceNo1.variable} ${allianceNo2.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
