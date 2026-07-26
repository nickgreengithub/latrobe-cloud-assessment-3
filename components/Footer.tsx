import { STUDENT } from "@/lib/student";

export function Footer() {
  return (
    <footer className="site-footer">
      <span>
        {STUDENT.name} · {STUDENT.studentNumber}
      </span>
      <span>Frontend only · RSS server in Assessment 2</span>
    </footer>
  );
}
