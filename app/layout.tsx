"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Главная" },
    { href: "/resumes", label: "Резюме" },
    { href: "/requirements", label: "Вакансии" },
    { href: "/match", label: "Подбор" },
    { href: "/search", label: "Поиск" },
    { href: "/hh", label: "HH.kz" },
  ];

  return (
    <html lang="ru">
      <head>
        <title>AI Подбор кандидатов</title>
      </head>
      <body>
        <nav className="nav">
          <span style={{ fontWeight: 700, marginRight: 12, color: "var(--accent)" }}>ResumeAI</span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "active" : ""}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {children}
      </body>
    </html>
  );
}
