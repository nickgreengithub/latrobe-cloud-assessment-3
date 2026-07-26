"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { STUDENT } from "@/lib/student";
import { useTheme } from "@/components/ThemeProvider";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/feeds", label: "Feeds" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
] as const;

export function Header() {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isCurrent = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="site-header">
      <div className="brand-block">
        <p className="brand-eyebrow">La Trobe · Cloud Web Applications</p>
        <h1 className="brand-title">{STUDENT.assessmentTitle}</h1>
      </div>

      <div className="header-actions">
        <nav className="desktop-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={isCurrent(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "Light" : "Dark"}
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

      <button
        type="button"
        className={`nav-backdrop${open ? " open" : ""}`}
        aria-label="Close menu overlay"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />

      <nav
        id={menuId}
        className={`mobile-nav${open ? " open" : ""}`}
        aria-label="Compact"
        aria-hidden={!open}
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            aria-current={isCurrent(item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
