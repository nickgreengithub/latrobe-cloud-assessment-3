import { STUDENT } from "@/lib/student";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="app-frame site-footer-inner">
        <span>
          {STUDENT.name} · {STUDENT.studentNumber}
        </span>
        <span className="footer-note">RSS server · API · SQLite · Docker</span>
      </div>
    </footer>
  );
}
