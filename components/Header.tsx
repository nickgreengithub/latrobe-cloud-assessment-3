"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  HomeIcon,
  InfoIcon,
  MoonIcon,
  PlayIcon,
  RssIcon,
  SettingsIcon,
  SunIcon,
} from "@/components/icons";
import { STUDENT } from "@/lib/student";

const NAV = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/feeds", label: "Feeds", Icon: RssIcon },
  { href: "/client", label: "Client", Icon: PlayIcon },
  { href: "/about", label: "About", Icon: InfoIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function Header() {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Close the mobile menu on navigation. Adjusted during render rather than in
  // an effect — React re-runs this component before painting, so the menu never
  // flashes open on the new route.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="site-header">
      <div className="app-frame site-header-main">
        <Link href="/" className="brand-block" aria-label="Home">
          <span className="brand-mark" aria-hidden="true">
            <RssIcon />
          </span>
          <span className="brand-text">
            <span className="brand-eyebrow">La Trobe · Cloud Web Applications</span>
            <span className="brand-title">{STUDENT.assessmentTitle}</span>
          </span>
        </Link>

        <div className="header-actions">
          <nav className="desktop-nav" aria-label="Primary">
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="nav-link"
                aria-current={isCurrent(href) ? "page" : undefined}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          <button
            type="button"
            className="hamburger-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`nav-backdrop${open ? " open" : ""}`}
        aria-label="Close menu"
        tabIndex={-1}
        onClick={() => setOpen(false)}
      />

      <nav
        id={menuId}
        className={`mobile-nav app-frame${open ? " open" : ""}`}
        aria-label="Compact"
        aria-hidden={!open}
      >
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="nav-link"
            tabIndex={open ? undefined : -1}
            aria-current={isCurrent(href) ? "page" : undefined}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
