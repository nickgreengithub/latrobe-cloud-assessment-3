import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="site-layout">
        <Header />
        <main id="main" className="site-main">
          <div className="app-frame site-main-inner">{children}</div>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
