import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { STUDENT } from "@/lib/student";
import "./globals.css";

export const metadata: Metadata = {
  title: STUDENT.assessmentTitle,
  description:
    "Frontend for an RSS Server feeding into an LMS — Assessment 1 (design and usability).",
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
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
