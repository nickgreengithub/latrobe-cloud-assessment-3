"use client";

import { useId, useState, type ReactNode } from "react";

export function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="collapsible" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="collapsible-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span>
        <span aria-hidden="true">{open ? "Hide" : "Show"}</span>
      </button>
      <div id={panelId} className="collapsible-panel" role="region">
        {children}
      </div>
    </div>
  );
}
