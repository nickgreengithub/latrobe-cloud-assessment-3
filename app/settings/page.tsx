import { SettingsPanel } from "@/components/SettingsPanel";
import { SettingsIcon } from "@/components/icons";

export default function SettingsPage() {
  return (
    <div className="view">
      <header className="view-head">
        <p className="view-kicker">
          <SettingsIcon />
          Settings
        </p>
        <h1 className="sr-only">Settings</h1>
        <p className="view-lead">
          Theme and layout choices, saved across sessions.
        </p>
      </header>

      <div className="view-body">
        <SettingsPanel />
      </div>
    </div>
  );
}
