import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Settings" },
        ]}
      />

      <section className="page-hero">
        <p className="page-kicker">Settings</p>
        <h2 className="page-title">Theme and layout preferences</h2>
        <p className="page-lead">
          Light and dark themes share the Alliance typography and cyan line language.
          Theme choice is stored in a cookie; compact list state uses local storage.
        </p>
      </section>

      <SettingsPanel />
    </div>
  );
}
